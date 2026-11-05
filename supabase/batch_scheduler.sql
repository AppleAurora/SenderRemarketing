-- SenderRemarketing: batch scheduling foundation (run once in Supabase SQL Editor)
-- Planning only: this migration does not send WhatsApp messages.
create table if not exists public.scheduled_messages (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 campaign_id uuid not null references public.campaigns(id) on delete cascade,
 contact_id uuid not null references public.contacts(id) on delete cascade,
 whatsapp_line_id uuid not null references public.whatsapp_lines(id) on delete cascade,
 message_body text not null check (char_length(message_body) between 1 and 4096),
 scheduled_at timestamptz not null,
 local_day date not null,
 status text not null default 'pending' check (status in ('pending','cancelled','sent','failed')),
 created_at timestamptz not null default now(),
 unique (campaign_id, contact_id)
);
create index if not exists scheduled_messages_line_day_idx on public.scheduled_messages(whatsapp_line_id,local_day,status);
create index if not exists scheduled_messages_org_time_idx on public.scheduled_messages(organization_id,scheduled_at);
alter table public.scheduled_messages enable row level security;
drop policy if exists scheduled_messages_select on public.scheduled_messages;
create policy scheduled_messages_select on public.scheduled_messages for select using (public.is_org_member(organization_id));
-- All writes use the transactional RPC, never direct table writes from the browser.
create or replace function public.create_batch_schedule(
 p_name text, p_line uuid, p_list uuid, p_message text, p_start timestamptz, p_interval_minutes integer default 30
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_org uuid; v_campaign uuid; v_count integer := 0; v_reserved integer; v_cursor timestamptz := p_start;
 v_day date; v_contact record; v_body text;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if length(trim(p_name)) < 1 or length(trim(p_name)) > 120 then raise exception 'Invalid campaign name'; end if;
 if length(trim(p_message)) < 1 or length(p_message) > 4096 then raise exception 'Invalid message'; end if;
 if p_interval_minutes < 5 or p_interval_minutes > 1440 then raise exception 'Interval must be 5-1440 minutes'; end if;
 if p_start < now() then raise exception 'Start time must be in the future'; end if;
 select organization_id into v_org from public.whatsapp_lines where id=p_line and public.is_org_member(organization_id);
 if v_org is null then raise exception 'Line not found'; end if;
 if not exists(select 1 from public.contact_lists where id=p_list and organization_id=v_org) then raise exception 'List not found'; end if;
 -- Serialize scheduling for each line, preventing simultaneous batches from overbooking.
 perform pg_advisory_xact_lock(hashtextextended(p_line::text,0));
 insert into public.campaigns(organization_id,name,status,message_body,scheduled_at,created_by)
 values(v_org,trim(p_name),'draft',p_message,p_start,auth.uid()) returning id into v_campaign;
 for v_contact in
   select id,name from public.contacts
   where organization_id=v_org and contact_list_id=p_list and consent_status='opted_in'
   order by created_at,id
 loop
   v_day := (v_cursor at time zone 'America/Argentina/Buenos_Aires')::date;
   select count(*) into v_reserved from public.scheduled_messages
   where whatsapp_line_id=p_line and local_day=v_day and status in ('pending','sent');
   while v_reserved >= 20 loop
     v_cursor := ((v_day + 1)::timestamp + time '09:00') at time zone 'America/Argentina/Buenos_Aires';
     v_day := (v_cursor at time zone 'America/Argentina/Buenos_Aires')::date;
     select count(*) into v_reserved from public.scheduled_messages
     where whatsapp_line_id=p_line and local_day=v_day and status in ('pending','sent');
   end loop;
   v_body := replace(p_message,'{{nombre}}',coalesce(nullif(trim(v_contact.name),''),'cliente'));
   insert into public.scheduled_messages(organization_id,campaign_id,contact_id,whatsapp_line_id,message_body,scheduled_at,local_day)
   values(v_org,v_campaign,v_contact.id,p_line,v_body,v_cursor,v_day);
   v_count := v_count+1;
   v_cursor := v_cursor + make_interval(mins => p_interval_minutes);
 end loop;
 if v_count=0 then raise exception 'No authorized contacts in this list'; end if;
 return jsonb_build_object('campaign_id',v_campaign,'scheduled_count',v_count);
end; $$;
grant execute on function public.create_batch_schedule(text,uuid,uuid,text,timestamptz,integer) to authenticated;

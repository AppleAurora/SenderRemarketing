-- Run AFTER supabase/batch_scheduler.sql in Supabase SQL Editor.
-- Deterministic round-robin across 1..10 approved templates; planning only.
create or replace function public.create_rotating_batch_schedule(
 p_name text, p_line uuid, p_list uuid, p_messages text[], p_start timestamptz, p_interval_minutes integer default 30
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_org uuid; v_campaign uuid; v_count integer := 0; v_reserved integer; v_cursor timestamptz := p_start;
 v_day date; v_contact record; v_body text; v_variant text; v_templates integer;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if length(trim(p_name)) < 1 or length(trim(p_name)) > 120 then raise exception 'Invalid campaign name'; end if;
 v_templates := coalesce(array_length(p_messages,1),0);
 if v_templates < 1 or v_templates > 10 then raise exception 'Provide 1 to 10 approved messages'; end if;
 if exists(select 1 from unnest(p_messages) m where m is null or length(trim(m)) < 1 or length(m) > 4096) then raise exception 'Invalid message'; end if;
 if p_interval_minutes < 5 or p_interval_minutes > 1440 then raise exception 'Interval must be 5-1440 minutes'; end if;
 if p_start < now() then raise exception 'Start time must be in the future'; end if;
 select organization_id into v_org from public.whatsapp_lines where id=p_line and public.is_org_member(organization_id);
 if v_org is null then raise exception 'Line not found'; end if;
 if not exists(select 1 from public.contact_lists where id=p_list and organization_id=v_org) then raise exception 'List not found'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_line::text,0));
 insert into public.campaigns(organization_id,name,status,message_body,scheduled_at,created_by)
 values(v_org,trim(p_name),'draft',p_messages[1],p_start,auth.uid()) returning id into v_campaign;
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
   v_variant := p_messages[(v_count % v_templates) + 1];
   v_body := replace(v_variant,'{{nombre}}',coalesce(nullif(trim(v_contact.name),''),'cliente'));
   insert into public.scheduled_messages(organization_id,campaign_id,contact_id,whatsapp_line_id,message_body,scheduled_at,local_day)
   values(v_org,v_campaign,v_contact.id,p_line,v_body,v_cursor,v_day);
   v_count := v_count+1;
   v_cursor := v_cursor + make_interval(mins => p_interval_minutes);
 end loop;
 if v_count=0 then raise exception 'No authorized contacts in this list'; end if;
 return jsonb_build_object('campaign_id',v_campaign,'scheduled_count',v_count,'variants_count',v_templates);
end; $$;
revoke all on function public.create_rotating_batch_schedule(text,uuid,uuid,text[],timestamptz,integer) from public;
grant execute on function public.create_rotating_batch_schedule(text,uuid,uuid,text[],timestamptz,integer) to authenticated;

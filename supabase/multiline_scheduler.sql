-- Run after schema.sql and batch_scheduler.sql.
-- Planning only; no message dispatch. Multi-line allocation for consented contacts.
create or replace function public.create_multiline_rotating_schedule(
 p_name text, p_lines uuid[], p_list uuid, p_messages text[],
 p_start timestamptz, p_per_line_per_day integer default 5, p_interval_minutes integer default 30
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
 v_org uuid; v_campaign uuid; v_count integer := 0; v_day date;
 v_line uuid; v_contact record; v_body text; v_used integer; v_line_index integer;
 v_slots integer; v_start_local timestamp; v_time timestamptz;
 v_count_lines integer; v_count_templates integer; v_day_offset integer := 0;
 v_candidate_day date; v_scheduled boolean; v_i integer;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if length(trim(p_name)) not between 1 and 120 then raise exception 'Invalid campaign name'; end if;
 v_count_lines:=coalesce(array_length(p_lines,1),0);
 v_count_templates:=coalesce(array_length(p_messages,1),0);
 if v_count_lines < 1 or v_count_lines > 10 then raise exception 'Select 1 to 10 lines'; end if;
 if (select count(distinct x) from unnest(p_lines) x) <> v_count_lines then raise exception 'Duplicate lines'; end if;
 if v_count_templates <> 10 then raise exception 'Provide exactly 10 messages'; end if;
 if exists(select 1 from unnest(p_messages) m where m is null or length(trim(m)) not between 1 and 4096) then raise exception 'Invalid message'; end if;
 if p_per_line_per_day not in (5,10) then raise exception 'Daily quota must be 5 or 10'; end if;
 if p_interval_minutes < 5 or p_interval_minutes > 1440 then raise exception 'Invalid interval'; end if;
 if p_start < now() then raise exception 'Start time must be in the future'; end if;
 select organization_id into v_org from public.whatsapp_lines where id=p_lines[1] and public.is_org_member(organization_id);
 if v_org is null then raise exception 'Line not found'; end if;
 if (select count(*) from public.whatsapp_lines where id=any(p_lines) and organization_id=v_org) <> v_count_lines then raise exception 'Lines must belong to your organization'; end if;
 if not exists(select 1 from public.contact_lists where id=p_list and organization_id=v_org) then raise exception 'List not found'; end if;
 perform pg_advisory_xact_lock(hashtextextended(v_org::text, 17));
 insert into public.campaigns(organization_id,name,status,message_body,scheduled_at,created_by)
 values(v_org,trim(p_name),'draft',p_messages[1],p_start,auth.uid()) returning id into v_campaign;
 v_start_local:=p_start at time zone 'America/Argentina/Buenos_Aires';
 for v_contact in
  select id,name from public.contacts
  where organization_id=v_org and contact_list_id=p_list and consent_status='opted_in'
   and not exists (
    select 1 from public.scheduled_messages prev
    where prev.organization_id=v_org and prev.contact_id=public.contacts.id
      and (prev.status in ('pending','processing','sent') or prev.delivery_status in ('sent','delivered','unknown'))
   )
  order by created_at,id
 loop
  v_scheduled:=false;
  while not v_scheduled loop
   if v_day_offset > 3650 then raise exception 'Scheduling horizon exceeded'; end if;
   v_candidate_day:=v_start_local::date + v_day_offset;
   for v_i in 1..v_count_lines loop
    v_line_index:=((v_count + v_i - 1) % v_count_lines) + 1;
    v_line:=p_lines[v_line_index];
    select count(*) into v_used from public.scheduled_messages
     where whatsapp_line_id=v_line and local_day=v_candidate_day and status in ('pending','sent');
    if v_used < p_per_line_per_day and v_used < 20 then
     -- Spread a line's daily slots from the requested start time (first day), otherwise 09:00.
     v_time:=((v_candidate_day::timestamp + case when v_day_offset=0 then v_start_local::time else time '09:00' end)
       + make_interval(mins => v_used*p_interval_minutes)) at time zone 'America/Argentina/Buenos_Aires';
     if (v_time at time zone 'America/Argentina/Buenos_Aires')::date=v_candidate_day then
      v_body:=replace(p_messages[(v_count % v_count_templates)+1],'{{nombre}}',coalesce(nullif(trim(v_contact.name),''),'cliente'));
      insert into public.scheduled_messages(organization_id,campaign_id,contact_id,whatsapp_line_id,message_body,scheduled_at,local_day)
      values(v_org,v_campaign,v_contact.id,v_line,v_body,v_time,v_candidate_day);
      v_count:=v_count+1;
      v_scheduled:=true;
      exit;
     end if;
    end if;
   end loop;
   if not v_scheduled then v_day_offset:=v_day_offset+1; end if;
  end loop;
 end loop;
 if v_count=0 then raise exception 'No opted-in contacts in this list'; end if;
 return jsonb_build_object('campaign_id',v_campaign,'scheduled_count',v_count,'lines_count',v_count_lines,'per_line_per_day',p_per_line_per_day);
end; $$;
revoke all on function public.create_multiline_rotating_schedule(text,uuid[],uuid,text[],timestamptz,integer,integer) from public;
grant execute on function public.create_multiline_rotating_schedule(text,uuid[],uuid,text[],timestamptz,integer,integer) to authenticated;

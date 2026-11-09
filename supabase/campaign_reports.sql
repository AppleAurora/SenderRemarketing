-- Aggregated reports without client-side row limits.
-- Apply after schema.sql, batch_scheduler.sql, delivery_tracking.sql and inbox_replies.sql.
create or replace function public.campaign_report(p_campaign uuid default null)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare v_org uuid; v_result jsonb;
begin
 select organization_id into v_org from public.organization_members
 where user_id=auth.uid() order by created_at limit 1;
 if v_org is null or not public.is_org_member(v_org) then raise exception 'Not authorized'; end if;
 if p_campaign is not null and not exists (
   select 1 from public.campaigns where id=p_campaign and organization_id=v_org
 ) then raise exception 'Campaign not found'; end if;
 with messages as (
   select s.id,s.contact_id,s.whatsapp_line_id,s.campaign_id,s.status,s.delivery_status,
     coalesce(s.sent_at,s.scheduled_at) as reference_at,
     (s.status='sent' or s.delivery_status in ('sent','delivered')) as was_sent
   from public.scheduled_messages s
   where s.organization_id=v_org and (p_campaign is null or s.campaign_id=p_campaign)
 ), counted as (
   select count(*) filter(where was_sent) as sent,
     count(*) filter(where not was_sent) as not_sent,
     count(*) filter(where was_sent and exists(
       select 1 from public.inbox_replies r
       where r.organization_id=v_org and r.contact_id=messages.contact_id
         and r.received_at >= messages.reference_at
         and (r.campaign_id=messages.campaign_id or r.campaign_id is null)
     )) as replied
   from messages
 ), per_line as (
   select wl.id,wl.display_name,wl.phone_e164,
     count(m.id) filter(where m.was_sent) as sent
   from public.whatsapp_lines wl left join messages m on m.whatsapp_line_id=wl.id
   where wl.organization_id=v_org
   group by wl.id,wl.display_name,wl.phone_e164
 )
 select jsonb_build_object(
  'sent',coalesce(c.sent,0),'not_sent',coalesce(c.not_sent,0),
  'replied',coalesce(c.replied,0),'unanswered',coalesce(c.sent-c.replied,0),
  'lines',coalesce((select jsonb_agg(jsonb_build_object(
    'id',id,'name',display_name,'phone',phone_e164,'sent',sent
  ) order by display_name) from per_line),'[]'::jsonb)
 ) into v_result from counted c;
 return v_result;
end; $$;
revoke all on function public.campaign_report(uuid) from public,anon;
grant execute on function public.campaign_report(uuid) to authenticated;

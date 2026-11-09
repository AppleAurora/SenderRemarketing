-- Run after schema.sql, batch_scheduler.sql and dispatch_queue.sql.
-- Delivery tracking and durable suppression. No real sending is performed here.
alter table public.scheduled_messages add column if not exists delivered_at timestamptz;
alter table public.scheduled_messages add column if not exists delivery_status text not null default 'not_confirmed'
 check(delivery_status in ('not_confirmed','sent','delivered','failed','unknown'));
create index if not exists scheduled_messages_contact_history_idx
 on public.scheduled_messages(organization_id,contact_id,status);

-- One successful or uncertain delivery suppresses new scheduling for that contact.
-- Do not delete contacts: preserve consent and audit history.
create or replace function public.prevent_duplicate_scheduling()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 if exists(
  select 1 from public.scheduled_messages s
  where s.organization_id=new.organization_id and s.contact_id=new.contact_id
    and s.id is distinct from new.id
    and (s.status in ('pending','processing','sent')
      or s.delivery_status in ('sent','delivered','unknown'))
 ) then raise exception 'Contact already scheduled or previously sent; duplicate prevented';
 end if;
 if not exists(select 1 from public.contacts c where c.id=new.contact_id and c.organization_id=new.organization_id and c.consent_status='opted_in') then
  raise exception 'Contact has no active consent';
 end if;
 return new;
end; $$;
drop trigger if exists scheduled_messages_prevent_duplicates on public.scheduled_messages;
create trigger scheduled_messages_prevent_duplicates before insert on public.scheduled_messages
 for each row execute function public.prevent_duplicate_scheduling();

-- Worker-only acknowledgement; service_role credentials must stay server-side.
create or replace function public.record_delivery_result(
 p_message uuid,p_result text,p_provider_id text default null,p_error text default null
) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_row public.scheduled_messages%rowtype;
begin
 if p_result not in ('sent','delivered','failed','unknown') then raise exception 'Invalid delivery result'; end if;
 select * into v_row from public.scheduled_messages where id=p_message for update;
 if not found then raise exception 'Message not found'; end if;
 if v_row.delivery_status='delivered' then
  if p_result='delivered' then return jsonb_build_object('status','delivered','unchanged',true); end if;
  raise exception 'Delivery already confirmed';
 end if;
 if v_row.status not in ('processing','sent','failed') then raise exception 'Message not in dispatch state'; end if;
 if v_row.delivery_status in ('sent','unknown') and p_result='failed' then
  raise exception 'Cannot overwrite possible delivery with failure';
 end if;
 update public.scheduled_messages set
  status=case when p_result in ('sent','delivered') then 'sent' else 'failed' end,
  delivery_status=p_result,
  provider_message_id=coalesce(nullif(p_provider_id,''),provider_message_id),
  last_error=case when p_result in ('failed','unknown') then left(coalesce(p_error,'No delivery confirmation'),1000) else null end,
  sent_at=case when p_result in ('sent','delivered') then coalesce(sent_at,now()) else sent_at end,
  delivered_at=case when p_result='delivered' then coalesce(delivered_at,now()) else delivered_at end
 where id=p_message;
 insert into public.message_logs(organization_id,campaign_id,contact_id,whatsapp_line_id,provider_message_id,status,error_code)
 values(v_row.organization_id,v_row.campaign_id,v_row.contact_id,v_row.whatsapp_line_id,p_provider_id,p_result,left(p_error,200));
 return jsonb_build_object('status',p_result);
end; $$;
revoke all on function public.record_delivery_result(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.record_delivery_result(uuid,text,text,text) to service_role;

-- Tenant-safe read-only history: scheduled_messages RLS is already enabled.
-- Reporting uses this table; delivery confirmations must come from the provider.

-- Run after batch_scheduler.sql. Foundation for a reliable dispatcher.
-- No delivery is performed by this migration.
alter table public.scheduled_messages add column if not exists attempt_count integer not null default 0;
alter table public.scheduled_messages add column if not exists claimed_at timestamptz;
alter table public.scheduled_messages add column if not exists last_error text;
alter table public.scheduled_messages add column if not exists sent_at timestamptz;
alter table public.scheduled_messages add column if not exists provider_message_id text;
create index if not exists scheduled_messages_due_idx on public.scheduled_messages(scheduled_at,id) where status='pending';

-- Atomic claim. Only service-role calls can execute; never expose the key to clients.
create or replace function public.claim_due_messages(p_limit integer default 10)
returns table(id uuid,organization_id uuid,campaign_id uuid,contact_id uuid,whatsapp_line_id uuid,message_body text,phone_e164 text)
language plpgsql security definer set search_path=public as $$
begin
 if p_limit < 1 or p_limit > 100 then raise exception 'Invalid batch size'; end if;
 return query
 with eligible as (
  select s.id from public.scheduled_messages s
  join public.campaigns ca on ca.id=s.campaign_id and ca.organization_id=s.organization_id
  join public.contacts co on co.id=s.contact_id and co.organization_id=s.organization_id
  join public.whatsapp_lines wl on wl.id=s.whatsapp_line_id and wl.organization_id=s.organization_id
  where s.status='pending' and s.scheduled_at<=now()
   and ca.status='running' and co.consent_status='opted_in'
   and wl.connection_status='connected'
  order by s.scheduled_at,s.id
  for update of s skip locked limit p_limit
 ), claimed as (
  update public.scheduled_messages s set status='processing',claimed_at=now(),attempt_count=s.attempt_count+1
  from eligible e where s.id=e.id
  returning s.*
 )
 select c.id,c.organization_id,c.campaign_id,c.contact_id,c.whatsapp_line_id,c.message_body,co.phone_e164
 from claimed c join public.contacts co on co.id=c.contact_id;
end; $$;
-- Extend status constraint safely for processing state.
do $$ declare v_name text; begin
 for v_name in select conname from pg_constraint where conrelid='public.scheduled_messages'::regclass and contype='c' and pg_get_constraintdef(oid) like '%status%' loop
  execute format('alter table public.scheduled_messages drop constraint %I',v_name);
 end loop;
end $$;
alter table public.scheduled_messages add constraint scheduled_messages_status_check
 check(status in ('pending','processing','cancelled','sent','failed'));
revoke all on function public.claim_due_messages(integer) from public,anon,authenticated;
grant execute on function public.claim_due_messages(integer) to service_role;
-- Recover work after a crash. Requires operator review before replay to avoid duplicates.
create or replace function public.flag_stale_dispatches(p_minutes integer default 30)
returns integer language plpgsql security definer set search_path=public as $$
declare n integer;
begin
 if p_minutes < 5 then raise exception 'Invalid timeout'; end if;
 update public.scheduled_messages set status='failed',last_error='Delivery outcome unknown after worker timeout; manual review required'
 where status='processing' and claimed_at < now()-make_interval(mins=>p_minutes);
 get diagnostics n=row_count; return n;
end; $$;
revoke all on function public.flag_stale_dispatches(integer) from public,anon,authenticated;
grant execute on function public.flag_stale_dispatches(integer) to service_role;

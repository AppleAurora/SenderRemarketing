-- Inbox foundation. Apply after schema.sql and batch_scheduler.sql.
create table if not exists public.inbox_replies (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 contact_id uuid not null references public.contacts(id) on delete cascade,
 whatsapp_line_id uuid references public.whatsapp_lines(id) on delete set null,
 campaign_id uuid references public.campaigns(id) on delete set null,
 provider_message_id text,
 body text not null,
 received_at timestamptz not null default now(),
 unique(organization_id,whatsapp_line_id,provider_message_id)
);
create index if not exists inbox_replies_contact_idx on public.inbox_replies(organization_id,contact_id,received_at desc);
alter table public.inbox_replies enable row level security;
drop policy if exists inbox_replies_select on public.inbox_replies;
create policy inbox_replies_select on public.inbox_replies for select to authenticated using(public.is_org_member(organization_id));
-- Only server-side provider callbacks may insert; browser users cannot forge replies.
revoke insert,update,delete on public.inbox_replies from anon,authenticated;
grant all on public.inbox_replies to service_role;

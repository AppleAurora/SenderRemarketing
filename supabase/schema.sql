-- SenderRemarketing: initial multi-tenant schema
-- Run in Supabase SQL Editor. Creates the database foundation and row-level security.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table if not exists public.contact_lists (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  contact_list_id uuid references public.contact_lists(id) on delete set null,
  name text,
  phone_e164 text not null,
  email text,
  attributes jsonb not null default '{}'::jsonb,
  consent_status text not null default 'unknown' check (consent_status in ('unknown', 'opted_in', 'opted_out')),
  consent_source text,
  consented_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, phone_e164)
);

create table if not exists public.whatsapp_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  display_name text not null,
  phone_e164 text,
  account_type text not null default 'business' check (account_type in ('personal', 'business')),
  provider text not null default 'unconfigured',
  connection_status text not null default 'disconnected' check (connection_status in ('disconnected', 'pending', 'connected', 'attention')),
  last_health_check timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled')),
  message_body text,
  scheduled_at timestamptz,
  timezone text not null default 'America/Argentina/Buenos_Aires',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.message_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  contact_id uuid references public.contacts(id) on delete set null,
  whatsapp_line_id uuid references public.whatsapp_lines(id) on delete set null,
  provider_message_id text,
  status text not null default 'queued',
  error_code text,
  created_at timestamptz not null default now()
);

create index if not exists contacts_org_idx on public.contacts(organization_id);
create index if not exists contacts_org_phone_idx on public.contacts(organization_id, phone_e164);
create index if not exists campaigns_org_idx on public.campaigns(organization_id);
create index if not exists message_logs_org_created_idx on public.message_logs(organization_id, created_at desc);

create or replace function public.is_org_member(target_org uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.organization_members m where m.organization_id = target_org and m.user_id = auth.uid()); $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
declare new_org_id uuid; org_name text;
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do update set email = excluded.email;

  org_name := coalesce(nullif(trim(new.raw_user_meta_data ->> 'organization_name'), ''), 'Mi espacio de trabajo');
  insert into public.organizations (name, created_by) values (org_name, new.id) returning id into new_org_id;
  insert into public.organization_members (organization_id, user_id, role) values (new_org_id, new.id, 'owner');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.contact_lists enable row level security;
alter table public.contacts enable row level security;
alter table public.whatsapp_lines enable row level security;
alter table public.campaigns enable row level security;
alter table public.message_logs enable row level security;

drop policy if exists "profile_select_own" on public.profiles;
create policy "profile_select_own" on public.profiles for select using (id = auth.uid());
drop policy if exists "profile_update_own" on public.profiles;
create policy "profile_update_own" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "org_select_member" on public.organizations;
create policy "org_select_member" on public.organizations for select using (public.is_org_member(id));
drop policy if exists "members_select_same_org" on public.organization_members;
create policy "members_select_same_org" on public.organization_members for select using (public.is_org_member(organization_id));

DO $$ declare t text; begin
  foreach t in array array['contact_lists','contacts','whatsapp_lines','campaigns','message_logs'] loop
    execute format('drop policy if exists %I on public.%I', t || '_tenant_all', t);
    execute format('create policy %I on public.%I for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id))', t || '_tenant_all', t);
  end loop;
end $$;

-- Keep service-role keys and device session secrets server-side only.

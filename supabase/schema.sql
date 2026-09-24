-- Fresh Supabase schema for DND Map v0.2.x.
-- Run this once in Supabase SQL Editor for a new project.
-- The Next.js server verifies each Supabase Auth session, then uses its
-- server-only secret/service-role key to apply campaign authorization. Direct
-- Data API access to these tables is intentionally denied for anon/authenticated.

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users(id) on delete cascade,
  invite uuid not null unique default gen_random_uuid(),
  data jsonb not null,
  revision integer not null default 0 check (revision >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.memberships (
  campaign uuid not null references public.campaigns(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (campaign, user_id)
);

create table if not exists public.notes (
  campaign uuid not null references public.campaigns(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  location text not null,
  body text not null check (length(body) <= 20000),
  updated_at timestamptz not null default now(),
  primary key (campaign, user_id, location)
);

create index if not exists campaigns_owner_idx on public.campaigns(owner);
create index if not exists memberships_user_idx on public.memberships(user_id);
create index if not exists notes_user_idx on public.notes(user_id);

alter table public.campaigns enable row level security;
alter table public.memberships enable row level security;
alter table public.notes enable row level security;

-- Remove any old policies on these app tables before installing the explicit
-- deny policy. Server requests use a separate privileged client with no user
-- JWT; that client is kept in lib/supabase/server.ts only.
do $$
declare
  policy_row record;
begin
  for policy_row in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('campaigns', 'memberships', 'notes')
  loop
    execute format('drop policy if exists %I on %I.%I', policy_row.policyname, policy_row.schemaname, policy_row.tablename);
  end loop;
end
$$;

create policy campaigns_deny_direct_access
  on public.campaigns for all to anon, authenticated
  using (false) with check (false);
create policy memberships_deny_direct_access
  on public.memberships for all to anon, authenticated
  using (false) with check (false);
create policy notes_deny_direct_access
  on public.notes for all to anon, authenticated
  using (false) with check (false);

revoke all privileges on public.campaigns, public.memberships, public.notes from public, anon, authenticated;
grant usage on schema public to service_role;
grant select, insert, update, delete on public.campaigns, public.memberships, public.notes to service_role;

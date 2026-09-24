-- Run once in your Supabase project's SQL editor.
create table if not exists public.campaigns (
 id uuid primary key default gen_random_uuid(),
 owner uuid not null references auth.users(id) on delete cascade,
 invite uuid not null unique default gen_random_uuid(),
 data jsonb not null,
 revision integer not null default 0
);
create table if not exists public.memberships (
 campaign uuid references public.campaigns(id) on delete cascade,
 user_id uuid references auth.users(id) on delete cascade,
 primary key(campaign,user_id)
);
create table if not exists public.notes (
 campaign uuid references public.campaigns(id) on delete cascade,
 user_id uuid references auth.users(id) on delete cascade,
 location text not null,
 body text not null check(length(body)<=20000),
 primary key(campaign,user_id,location)
);
-- The browser never queries these tables. The authenticated Next.js API
-- enforces campaign ownership/membership and removes GM-only fields.
alter table public.campaigns enable row level security;
alter table public.memberships enable row level security;
alter table public.notes enable row level security;
revoke all on public.campaigns,public.memberships,public.notes from anon,authenticated;
grant all on public.campaigns,public.memberships,public.notes to service_role;

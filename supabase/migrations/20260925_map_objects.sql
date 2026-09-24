-- Add map notes and POI storage to an existing campaign database.
-- Fresh projects should use ../schema.sql instead. Safe to rerun.
create table if not exists public.map_objects (
  id uuid primary key default gen_random_uuid(),
  campaign uuid not null references public.campaigns(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('note', 'poi')),
  x double precision not null check (x >= 0 and x <= 1000),
  y double precision not null check (y >= 0 and y <= 1000),
  radius double precision check (radius is null or (radius >= 18 and radius <= 180)),
  label text not null default '' check (length(label) <= 160),
  content text not null default '' check (length(content) <= 20000),
  visibility text not null check (visibility in ('gm_private', 'player_private', 'shared')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (kind = 'poi' or radius is null),
  check (kind <> 'note' or length(trim(content)) > 0)
);

create index if not exists map_objects_campaign_idx on public.map_objects(campaign);
create index if not exists map_objects_owner_idx on public.map_objects(campaign, owner_id);
alter table public.map_objects enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'map_objects'
      and policyname = 'map_objects_deny_direct_access'
  ) then
    create policy map_objects_deny_direct_access
      on public.map_objects for all to anon, authenticated
      using (false) with check (false);
  end if;
end
$$;

revoke all privileges on public.map_objects from public, anon, authenticated;
grant usage on schema public to service_role;
grant select, insert, update, delete on public.map_objects to service_role;
notify pgrst, 'reload schema';

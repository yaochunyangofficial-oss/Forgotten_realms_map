-- Campaign-level Fog of War state. Safe to rerun; existing campaigns default OFF.
alter table public.campaigns
  add column if not exists fog jsonb not null default '{"enabled":false,"baseFogged":false,"exceptions":[]}'::jsonb;

-- Read-only release gate. Run in the target Supabase SQL Editor before promoting code.
-- Zero rows means all application-required tables, columns, RLS flags and
-- direct-access-deny policies are present. Also smoke-test the app itself.
with required_columns(table_name, column_name, data_type) as (
  values
    ('campaigns','id','uuid'), ('campaigns','owner','uuid'),
    ('campaigns','invite','uuid'), ('campaigns','data','jsonb'),
    ('campaigns','fog','jsonb'), ('campaigns','revision','integer'),
    ('memberships','campaign','uuid'), ('memberships','user_id','uuid'),
    ('notes','campaign','uuid'), ('notes','user_id','uuid'),
    ('notes','location','text'), ('notes','body','text'),
    ('map_objects','id','uuid'), ('map_objects','campaign','uuid'),
    ('map_objects','owner_id','uuid'), ('map_objects','kind','text'),
    ('map_objects','x','double precision'), ('map_objects','y','double precision'),
    ('map_objects','radius','double precision'), ('map_objects','label','text'),
    ('map_objects','content','text'), ('map_objects','visibility','text'),
    ('map_objects','updated_at','timestamp with time zone')
), required_tables(table_name) as (
  values ('campaigns'), ('memberships'), ('notes'), ('map_objects')
), issues as (
  select 'missing_or_wrong_column' as issue, r.table_name, r.column_name as detail
  from required_columns r
  left join information_schema.columns c
    on c.table_schema = 'public' and c.table_name = r.table_name
    and c.column_name = r.column_name and c.data_type = r.data_type
  where c.column_name is null
  union all
  select 'rls_disabled', r.table_name, 'row level security'
  from required_tables r
  left join pg_class t on t.oid = to_regclass('public.' || r.table_name)
  where coalesce(t.relrowsecurity, false) = false
  union all
  select 'missing_deny_policy', r.table_name, r.table_name || '_deny_direct_access'
  from required_tables r
  where not exists (
    select 1 from pg_policies p
    where p.schemaname = 'public' and p.tablename = r.table_name
      and p.policyname = r.table_name || '_deny_direct_access'
      and p.qual = 'false' and p.with_check = 'false'
  )
  union all
  select 'unexpected_policy', p.tablename, p.policyname
  from pg_policies p
  join required_tables r on r.table_name = p.tablename
  where p.schemaname = 'public'
    and p.policyname <> p.tablename || '_deny_direct_access'
  union all
  select 'service_role_grant_missing', r.table_name, 'SELECT/INSERT/UPDATE/DELETE'
  from required_tables r
  where not coalesce(has_table_privilege('service_role', to_regclass('public.' || r.table_name), 'SELECT, INSERT, UPDATE, DELETE'), false)
)
select * from issues order by table_name, issue, detail;

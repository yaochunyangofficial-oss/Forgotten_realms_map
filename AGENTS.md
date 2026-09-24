# Database release gate

Any feature that changes persistent Supabase data must include an additive migration in `supabase/migrations/` in the same branch and commit as the code change. Update `supabase/schema.sql` for fresh installs and `supabase/check-schema.sql` for the application's required schema. A JSON key stored in an existing JSONB column needs no SQL migration; document that choice.

Tests, typecheck, and build are necessary but do not prove that the target database was migrated. Before reporting a database-changing feature complete:

1. Compare every table, column, and policy the API reads or writes with the fresh schema and migrations.
2. Apply pending migrations to the target Supabase project before promoting or merging application code that depends on them. Use additive SQL; do not replace the database to fix a missing column.
3. Run `supabase/check-schema.sql` in that target project. Investigate every returned issue. Refresh PostgREST with `notify pgrst, 'reload schema';` after schema changes if needed.
4. Smoke-test authenticated create, load, edit, save, and reload against that real project. Exercise the changed feature and its player permissions when relevant. Record any access-limited steps explicitly.
5. Confirm the Vercel Production and Preview environments have the required variables and redeploy after changing them.

Do not merge a branch into `main` while its code expects unapplied production schema. Do not put Supabase secrets, service-role keys, passwords, or real credentials in Git, client code, or logs. If target Supabase access is unavailable, stop before promotion and give the exact manual migration and verification steps.

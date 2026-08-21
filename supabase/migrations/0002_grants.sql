-- Tables created via a direct psql connection don't automatically pick up
-- Supabase's usual auto-grants to anon/authenticated the way tables created
-- through Supabase's own tooling do — RLS policies only take effect once the
-- role already has the baseline table privilege, so without this, every
-- query fails with "permission denied for table X" regardless of policy.

grant usage on schema public to authenticated;

grant select, insert, update, delete on public.games to authenticated;
grant select, insert, update on public.igdb_cache to authenticated;

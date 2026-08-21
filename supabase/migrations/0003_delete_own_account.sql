-- Lets a logged-in user delete their own account from the client, without
-- ever exposing the service_role key to the app. security definer runs this
-- with the privileges needed to delete from auth.users (which the
-- authenticated role can't do directly), but it's hardcoded to auth.uid()
-- so it can only ever delete the caller's own account.
--
-- Deleting the auth.users row cascades through Supabase's own auth schema
-- (sessions, identities, refresh tokens) automatically, and through our
-- games.user_id foreign key (see 0001_init.sql), so a user's library is
-- cleaned up too.
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;

grant execute on function public.delete_own_account() to authenticated;

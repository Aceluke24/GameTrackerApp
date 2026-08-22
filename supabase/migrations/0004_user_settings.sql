-- Per-user settings that aren't game data — currently just each user's own
-- Steam Web API key + Steam ID, so Steam import works for every account
-- instead of one key hardcoded in the app for a single personal account.
create table if not exists public.user_settings (
  user_id       uuid primary key references auth.users (id) on delete cascade default auth.uid(),
  steam_api_key text,
  steam_id      text,
  updated_at    timestamptz not null default now()
);

alter table public.user_settings enable row level security;
alter table public.user_settings force row level security;

create policy user_settings_select_own on public.user_settings
  for select to authenticated
  using (user_id = auth.uid());

create policy user_settings_insert_own on public.user_settings
  for insert to authenticated
  with check (user_id = auth.uid());

create policy user_settings_update_own on public.user_settings
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy user_settings_delete_own on public.user_settings
  for delete to authenticated
  using (user_id = auth.uid());

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.user_settings to authenticated;

-- Custom statuses: 12 editable (label + emoji) slots per user, replacing the
-- fixed STATUSES set in App.jsx. Stored as a single JSON array rather than
-- one row per slot — there's no reordering, just edit-in-place, so a table
-- per slot would only add RLS/upsert overhead for no benefit. Each slot's
-- `key` (what actually gets written to games.status) stays stable across
-- edits so renaming a status never requires touching existing games rows.
create table if not exists public.user_statuses (
  user_id    uuid primary key references auth.users (id) on delete cascade default auth.uid(),
  statuses   jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_statuses enable row level security;
alter table public.user_statuses force row level security;

create policy user_statuses_select_own on public.user_statuses
  for select to authenticated
  using (user_id = auth.uid());

create policy user_statuses_insert_own on public.user_statuses
  for insert to authenticated
  with check (user_id = auth.uid());

create policy user_statuses_update_own on public.user_statuses
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy user_statuses_delete_own on public.user_statuses
  for delete to authenticated
  using (user_id = auth.uid());

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.user_statuses to authenticated;

-- Game Vault: per-user game library + shared IGDB metadata cache.

create table if not exists public.games (
  id                bigint generated always as identity primary key,
  user_id           uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title             text not null,
  platform          text,
  cover_url         text,
  igdb_id           integer,
  genres            text,
  igdb_rating       integer,
  hltb_main         integer,
  hltb_extra        integer,
  hltb_complete     integer,
  hltb_confidence   integer,
  status            text default 'backlog',
  personal_rating   integer,
  notes             text,
  date_added        date default current_date,
  date_finished     date,
  source            text default 'manual'
);

create index if not exists games_user_id_idx on public.games (user_id);

alter table public.games enable row level security;
alter table public.games force row level security;

create policy games_select_own on public.games
  for select to authenticated
  using (user_id = auth.uid());

create policy games_insert_own on public.games
  for insert to authenticated
  with check (user_id = auth.uid());

create policy games_update_own on public.games
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy games_delete_own on public.games
  for delete to authenticated
  using (user_id = auth.uid());

-- Shared, lazily-populated IGDB metadata cache. Not user-scoped: any
-- authenticated user can read or contribute an entry, since it's just a
-- cache of public game data, not private per-user information.
create table if not exists public.igdb_cache (
  igdb_id           integer primary key,
  title             text,
  cover_url         text,
  platform          text,
  genres            text,
  igdb_rating       integer,
  hltb_main         integer,
  hltb_extra        integer,
  hltb_complete     integer,
  hltb_confidence   integer,
  cached_at         timestamptz not null default now()
);

alter table public.igdb_cache enable row level security;
alter table public.igdb_cache force row level security;

create policy igdb_cache_select_all on public.igdb_cache
  for select to authenticated
  using (true);

create policy igdb_cache_insert_all on public.igdb_cache
  for insert to authenticated
  with check (true);

create policy igdb_cache_update_all on public.igdb_cache
  for update to authenticated
  using (true)
  with check (true);

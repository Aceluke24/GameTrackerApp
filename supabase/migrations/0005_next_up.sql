-- "Next Up" queue: a per-game pin that floats a game to the top of the
-- default (unsorted/unsearched) list view. See README roadmap.

alter table public.games add column if not exists next_up boolean not null default false;

import { describe, it, expect } from 'vitest';
import { filterAndSortGames, matchesGame, SORT_COMPARATORS } from './filterGames';

// A tiny helper so each test only spells out the fields it cares about.
const game = (over = {}) => ({
  title: 'Untitled', status: 'backlog', platform: null, genres: null,
  hltb_main: null, date_added: null, next_up: false, ...over,
});

const titles = (list) => list.map(g => g.title);

describe('matchesGame', () => {
  it('matches everything when filter is "all" and there is no query', () => {
    expect(matchesGame(game(), {})).toBe(true);
  });

  it('filters by status', () => {
    expect(matchesGame(game({ status: 'finished' }), { filter: 'finished' })).toBe(true);
    expect(matchesGame(game({ status: 'backlog' }), { filter: 'finished' })).toBe(false);
  });

  it('searches title, platform, and genres (case-insensitive)', () => {
    const g = game({ title: 'Hades', platform: 'Switch', genres: 'Indie, Action' });
    expect(matchesGame(g, { query: 'hades' })).toBe(true);
    expect(matchesGame(g, { query: 'switch' })).toBe(true);
    expect(matchesGame(g, { query: 'action' })).toBe(true);
    expect(matchesGame(g, { query: 'zelda' })).toBe(false);
  });

  it('does not crash when platform or genres are missing', () => {
    expect(matchesGame(game({ title: 'X' }), { query: 'nope' })).toBe(false);
  });

  it('applies the time filter in minutes (hours * 60), only to games that have a time', () => {
    expect(matchesGame(game({ hltb_main: 300 }), { timeFilter: { mode: 'under', hours: 6 } })).toBe(true);  // 300 < 360
    expect(matchesGame(game({ hltb_main: 400 }), { timeFilter: { mode: 'under', hours: 6 } })).toBe(false); // 400 !< 360
    expect(matchesGame(game({ hltb_main: 400 }), { timeFilter: { mode: 'over', hours: 6 } })).toBe(true);
    // no time data -> excluded whenever a time filter is active
    expect(matchesGame(game({ hltb_main: null }), { timeFilter: { mode: 'under', hours: 6 } })).toBe(false);
  });

  it('combines all three conditions with AND', () => {
    const g = game({ status: 'backlog', title: 'Celeste', hltb_main: 480 });
    expect(matchesGame(g, { filter: 'backlog', query: 'celeste', timeFilter: { mode: 'under', hours: 10 } })).toBe(true);
    expect(matchesGame(g, { filter: 'wishlist', query: 'celeste' })).toBe(false);
  });
});

describe('SORT_COMPARATORS', () => {
  it('title_asc / title_desc order alphabetically', () => {
    const list = [game({ title: 'Braid' }), game({ title: 'Antichamber' }), game({ title: 'Celeste' })];
    expect(titles([...list].sort(SORT_COMPARATORS.title_asc))).toEqual(['Antichamber', 'Braid', 'Celeste']);
    expect(titles([...list].sort(SORT_COMPARATORS.title_desc))).toEqual(['Celeste', 'Braid', 'Antichamber']);
  });

  it('time_asc puts games with no time first (treated as lowest), ties break on title', () => {
    const list = [
      game({ title: 'Long', hltb_main: 3000 }),
      game({ title: 'NoTimeB', hltb_main: null }),
      game({ title: 'NoTimeA', hltb_main: null }),
      game({ title: 'Short', hltb_main: 300 }),
    ];
    expect(titles([...list].sort(SORT_COMPARATORS.time_asc)))
      .toEqual(['NoTimeA', 'NoTimeB', 'Short', 'Long']);
  });

  it('date_added_desc puts the most recent first', () => {
    const list = [
      game({ title: 'Old', date_added: '2024-01-01' }),
      game({ title: 'New', date_added: '2026-06-01' }),
      game({ title: 'Mid', date_added: '2025-03-01' }),
    ];
    expect(titles([...list].sort(SORT_COMPARATORS.date_added_desc))).toEqual(['New', 'Mid', 'Old']);
  });
});

describe('filterAndSortGames', () => {
  it('floats next_up games to the top under the default sort with no search', () => {
    const list = [
      game({ title: 'Zelda', next_up: false }),
      game({ title: 'Alpha', next_up: false }),
      game({ title: 'Pinned', next_up: true }),
    ];
    expect(titles(filterAndSortGames(list, {}))).toEqual(['Pinned', 'Alpha', 'Zelda']);
  });

  it('stops floating next_up games once an explicit sort is chosen', () => {
    const list = [
      game({ title: 'Zelda', next_up: true }),
      game({ title: 'Alpha', next_up: false }),
    ];
    expect(titles(filterAndSortGames(list, { sort: 'title_desc' }))).toEqual(['Zelda', 'Alpha']);
    // (Zelda is first here because Z > A, not because it is pinned)
  });

  it('stops floating next_up games while a search is active', () => {
    const list = [
      game({ title: 'Hades', next_up: true }),
      game({ title: 'Hollow Knight', next_up: false }),
    ];
    expect(titles(filterAndSortGames(list, { search: 'h' }))).toEqual(['Hades', 'Hollow Knight']);
  });

  it('trims and lower-cases the search query', () => {
    const list = [game({ title: 'Outer Wilds' }), game({ title: 'Hades' })];
    expect(titles(filterAndSortGames(list, { search: '  OUTER  ' }))).toEqual(['Outer Wilds']);
  });

  it('does not mutate the input array', () => {
    const list = [game({ title: 'B' }), game({ title: 'A' })];
    filterAndSortGames(list, {});
    expect(titles(list)).toEqual(['B', 'A']);
  });

  it('falls back to title_asc for an unknown sort key', () => {
    const list = [game({ title: 'B' }), game({ title: 'A' })];
    expect(titles(filterAndSortGames(list, { sort: 'bogus' }))).toEqual(['A', 'B']);
  });
});

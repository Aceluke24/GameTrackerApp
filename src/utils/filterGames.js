// The game grid's sort comparators and its filter/search/time predicate.
// Extracted from App.jsx so they can be unit-tested in isolation — App
// just calls filterAndSortGames() with its current UI state.

// Sorts a field low-to-high (or high-to-low with reverse). Games with no
// value (null/undefined) are treated as the lowest possible value, so they
// land at whichever end actually represents "low" for the chosen direction
// instead of always sinking to the bottom. Ties break on title A–Z.
function byField(field, reverse) {
  return (a, b) => {
    const av = a[field] ?? -Infinity;
    const bv = b[field] ?? -Infinity;
    return (reverse ? bv - av : av - bv) || a.title.localeCompare(b.title);
  };
}

// The sort the "Next Up" pin applies under — an explicitly chosen sort or an
// active search means the user is looking for something specific, so the pin
// backs off rather than fighting that ordering.
export const DEFAULT_SORT = 'title_asc';

export const SORT_COMPARATORS = {
  title_asc: (a, b) => a.title.localeCompare(b.title),
  title_desc: (a, b) => b.title.localeCompare(a.title),
  time_asc: byField('hltb_main', false),
  time_desc: byField('hltb_main', true),
  date_added_desc: (a, b) => (b.date_added || '').localeCompare(a.date_added || '') || a.title.localeCompare(b.title),
};

// Whether one game passes the current sidebar filter + search box + time
// filter. `query` is expected already trimmed and lower-cased.
export function matchesGame(game, { filter = 'all', query = '', timeFilter = null } = {}) {
  const matchesFilter = filter === 'all' || game.status === filter;
  const matchesSearch = !query
    || game.title.toLowerCase().includes(query)
    || (game.platform || '').toLowerCase().includes(query)
    || (game.genres || '').toLowerCase().includes(query);
  const matchesTime = !timeFilter || (game.hltb_main != null && (
    timeFilter.mode === 'under'
      ? game.hltb_main < timeFilter.hours * 60
      : game.hltb_main > timeFilter.hours * 60
  ));
  return matchesFilter && matchesSearch && matchesTime;
}

// Filter + sort the library for display. `next_up`-pinned games float to the
// top, but only when the view isn't already ordered by an explicit sort or
// narrowed by a search (see DEFAULT_SORT comment above).
export function filterAndSortGames(games, { filter = 'all', search = '', sort = DEFAULT_SORT, timeFilter = null } = {}) {
  const query = search.trim().toLowerCase();
  const pinActive = sort === DEFAULT_SORT && !query;
  return games
    .filter(g => matchesGame(g, { filter, query, timeFilter }))
    .sort((a, b) => {
      if (pinActive) {
        const pinDiff = (b.next_up ? 1 : 0) - (a.next_up ? 1 : 0);
        if (pinDiff) return pinDiff;
      }
      return (SORT_COMPARATORS[sort] || SORT_COMPARATORS.title_asc)(a, b);
    });
}

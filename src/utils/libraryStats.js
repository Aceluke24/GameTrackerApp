// The numbers behind the Stats page — total backlog time, "backlog debt"
// (how long it'd take to clear at a steady pace), finish rate, and the
// platform / genre breakdowns. Extracted from StatsPage.jsx for testing.

// Assumed play pace for the "backlog debt" figure: 2 hours a day.
export const MINUTES_PER_DAY_PLAYED = 120;

export function computeLibraryStats(games) {
  const backlogGames = games.filter(g => g.status === 'backlog' || g.status === 'playing');
  const totalBacklogMinutes = backlogGames.reduce((sum, g) => sum + (g.hltb_main || 0), 0);

  const daysToComplete = totalBacklogMinutes / MINUTES_PER_DAY_PLAYED;
  const yearsToComplete = daysToComplete / 365;

  const platforms = {};
  games.forEach(g => {
    const platform = g.platform || 'Unknown';
    if (!platforms[platform]) platforms[platform] = { total: 0, finished: 0, backlogMinutes: 0 };
    platforms[platform].total++;
    if (g.status === 'finished') platforms[platform].finished++;
    if (g.status === 'backlog' || g.status === 'playing') {
      platforms[platform].backlogMinutes += g.hltb_main || 0;
    }
  });
  const sortedPlatforms = Object.entries(platforms).sort((a, b) => b[1].total - a[1].total);
  const maxPlatformGames = sortedPlatforms[0]?.[1].total || 1;

  const genres = {};
  games.forEach(g => {
    if (!g.genres) return;
    g.genres.split(', ').forEach(genre => {
      genres[genre] = (genres[genre] || 0) + 1;
    });
  });
  const sortedGenres = Object.entries(genres).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxGenreCount = sortedGenres[0]?.[1] || 1;

  const started = games.filter(g => ['finished', 'abandoned', 'want_again'].includes(g.status)).length;
  const finished = games.filter(g => g.status === 'finished' || g.status === 'want_again').length;
  const finishRate = started > 0 ? Math.round((finished / started) * 100) : 0;

  return {
    total: games.length,
    totalBacklogMinutes, daysToComplete, yearsToComplete,
    sortedPlatforms, maxPlatformGames,
    sortedGenres, maxGenreCount,
    started, finished, finishRate,
  };
}

// The "Play Next" recommendation engine, extracted from StatsPage.jsx.
// scoreBacklog ranks every Backlog game 0–100; pickWeighted draws a random
// game with probability proportional to its score (for the "reroll" button).

export function scoreBacklog(games) {
  const backlog = games.filter(g => g.status === 'backlog');
  if (backlog.length === 0) return [];

  const times = backlog.map(g => g.hltb_main).filter(Boolean);
  const ratings = backlog.map(g => g.igdb_rating).filter(Boolean);
  const dates = backlog.map(g => g.date_added ? new Date(g.date_added).getTime() : Date.now());

  const maxTime = times.length ? Math.max(...times) : 1;
  const maxRating = ratings.length ? Math.max(...ratings) : 1;
  const oldestTime = dates.length ? Math.min(...dates) : Date.now();
  const newestTime = dates.length ? Math.max(...dates) : Date.now();
  const dateRange = (newestTime - oldestTime) || 1;

  return backlog
    .map(g => {
      // Shorter games score higher — up to 40pts. No time data -> neutral 20.
      const timeScore = g.hltb_main
        ? (1 - Math.min(g.hltb_main, maxTime) / maxTime) * 40
        : 20;

      // Higher-rated games score higher — up to 40pts. No rating -> neutral 20.
      const ratingScore = g.igdb_rating
        ? (g.igdb_rating / maxRating) * 40
        : 20;

      // Games that have been sitting in the backlog longer score higher — up to 20pts.
      const addedTime = g.date_added ? new Date(g.date_added).getTime() : newestTime;
      const ageScore = ((newestTime - addedTime) / dateRange) * 20;

      return { ...g, score: timeScore + ratingScore + ageScore };
    })
    .sort((a, b) => b.score - a.score);
}

// Weighted random pick. `excludeId` avoids rerolling the same game twice in
// a row (unless it's the only one). Every game keeps a floor weight of 1 so
// even a zero-scored game can still come up.
export function pickWeighted(scored, excludeId) {
  const pool = scored.filter(g => g.id !== excludeId);
  const candidates = pool.length > 0 ? pool : scored;
  const totalWeight = candidates.reduce((sum, g) => sum + Math.max(g.score, 1), 0);
  let r = Math.random() * totalWeight;
  for (const g of candidates) {
    r -= Math.max(g.score, 1);
    if (r <= 0) return g;
  }
  return candidates[candidates.length - 1];
}

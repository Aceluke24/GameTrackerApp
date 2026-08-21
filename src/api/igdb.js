const IGDB_BASE = import.meta.env.DEV ? '/igdb' : 'https://api.igdb.com/v4';

const sleep = ms => new Promise(r => setTimeout(r, ms));

// The client secret needed to mint/refresh these tokens must never ship in
// the renderer bundle, so the main process owns it — it hands back a
// currently-valid token, refreshing it behind the scenes if needed. Cached
// in memory for the session so every search doesn't round-trip an IPC call.
let cachedCredentials = null;

async function getIgdbCredentials() {
  if (!window.electronAPI?.getIGDBToken) {
    throw new Error('IGDB requires the Electron app (run via `npm run dev`), not a plain browser preview.');
  }
  if (!cachedCredentials) {
    cachedCredentials = await window.electronAPI.getIGDBToken();
  }
  return cachedCredentials;
}

// IGDB caps requests to ~4/sec. A batch of lookups (e.g. Steam import) fires
// faster than that, so retry with backoff instead of silently losing data
// for whichever games land on the rejected requests.
async function igdbPost(endpoint, body, retries = 3) {
  const { accessToken, clientId } = await getIgdbCredentials();
  const response = await fetch(`${IGDB_BASE}/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain',
      'Client-ID': clientId,
      'Authorization': `Bearer ${accessToken}`,
    },
    body,
  });
  if (response.status === 429 && retries > 0) {
    await sleep(750 * (4 - retries));
    return igdbPost(endpoint, body, retries - 1);
  }
  if (response.status === 401) {
    // The cached token may have been revoked out-of-band — drop it so the
    // next call forces a fresh fetch through the main process.
    cachedCredentials = null;
  }
  if (!response.ok) {
    const err = await response.text();
    console.error(`IGDB ${endpoint} error:`, err);
    throw new Error(`IGDB error: ${response.statusText}`);
  }
  return response.json();
}

// IGDB's time-to-beat data is crowd-submitted and occasionally has wild
// outliers (e.g. a "normally" entry of 3+ years for a sandbox game) —
// treat anything over maxHours as bad data rather than trust it.
function plausibleMinutes(seconds, maxHours) {
  if (!seconds) return null;
  const minutes = Math.round(seconds / 60);
  return minutes <= maxHours * 60 ? minutes : null;
}

// A time-to-beat entry backed by more community submissions is more
// trustworthy — 5+ submissions is treated as full confidence.
function confidenceFromCount(count) {
  if (!count) return null;
  return Math.min(100, Math.round((count / 5) * 100));
}

// The name search itself always has to hit IGDB live (it's a live text
// search, not something to cache by id) — but the per-game enrichment
// (time-to-beat, rating, genres) is identical for every user looking up the
// same title, so it's cached in Supabase's igdb_cache table and shared
// across everyone using the app. Pass skipCache to force a live lookup (used
// by refreshFromIGDB, which exists specifically to discard stale data).
export async function searchIGDB(gameName, { skipCache = false } = {}) {
  // Step 1: search for games
  const games = await igdbPost('games',
  `fields name,cover.url,platforms.name,genres.name,rating; search "${gameName}"; limit 10;`
  );

  if (games.length === 0) return [];

  // Step 2: check the shared cache for each result before hitting IGDB again
  const canUseCache = !skipCache && window.electronAPI?.getCachedIgdbGame;
  const cacheHits = canUseCache
    ? await Promise.all(games.map(g => window.electronAPI.getCachedIgdbGame(g.id)))
    : games.map(() => null);
  const cacheByIgdbId = {};
  games.forEach((g, i) => { if (cacheHits[i]) cacheByIgdbId[g.id] = cacheHits[i]; });

  // Step 3: fetch time to beat only for games that weren't in the cache
  const missingIds = games.filter(g => !cacheByIgdbId[g.id]).map(g => g.id);
  let timingMap = {};
  if (missingIds.length > 0) {
    try {
      const timings = await igdbPost('game_time_to_beats',
        `fields game_id,hastily,normally,completely,count; where game_id = (${missingIds.join(',')});`
      );
      timings.forEach(t => { timingMap[t.game_id] = t; });
    } catch (e) {
      // time to beat is optional, don't fail the whole search
      console.warn('Could not fetch time to beat:', e);
    }
  }

  const results = games.map(g => {
    const cached = cacheByIgdbId[g.id];
    if (cached) {
      return {
        igdb_id: g.id,
        title: g.name, // always show the freshest title from the live search
        cover_url: cached.cover_url,
        platform: cached.platform,
        genres: cached.genres,
        igdb_rating: cached.igdb_rating,
        hltb_main: cached.hltb_main,
        hltb_extra: cached.hltb_extra,
        hltb_complete: cached.hltb_complete,
        hltb_confidence: cached.hltb_confidence,
      };
    }
    const t = timingMap[g.id];
    return {
      igdb_id: g.id,
      title: g.name,
      cover_url: g.cover?.url
        ? `https:${g.cover.url.replace('t_thumb', 't_cover_big')}`
        : null,
      platform: g.platforms?.map(p => p.name).join(', ') ?? 'Unknown',
      genres: g.genres?.map(gen => gen.name).join(', ') ?? null,
      igdb_rating: g.rating ? Math.round(g.rating) : null,
      hltb_main:     t ? plausibleMinutes(t.normally,   200) : null,
      hltb_extra:    t ? plausibleMinutes(t.hastily,    300) : null,
      hltb_complete: t ? plausibleMinutes(t.completely, 400) : null,
      hltb_confidence: t ? confidenceFromCount(t.count) : null,
    };
  });

  // Populate the cache for anything that wasn't already in it (fire-and-forget).
  if (window.electronAPI?.setCachedIgdbGame) {
    results.forEach((r, i) => {
      if (!cacheByIgdbId[games[i].id]) {
        window.electronAPI.setCachedIgdbGame(r).catch(e => console.warn('Failed to cache IGDB entry:', e));
      }
    });
  }

  return results;
}

// IGDB's search doesn't rank exact title matches first (e.g. "Portal 2" can
// rank "Portal Maze 2" above the actual game), so prefer an exact match over
// whatever landed first. IGDB also sometimes has duplicate entries sharing
// the exact same title (e.g. two separate "Hades" listings) — among exact
// matches, prefer whichever one actually has completion-time data.
export function pickBestMatch(results, title) {
  const exactMatches = results.filter(r => r.title.toLowerCase() === title.toLowerCase());
  return exactMatches.find(r => r.hltb_main) ?? exactMatches[0] ?? results[0] ?? null;
}

// Re-runs the IGDB lookup for one game, discarding any manual corrections —
// used to reset a game's data back to whatever IGDB currently reports.
export async function refreshFromIGDB(title) {
  const results = await searchIGDB(title, { skipCache: true });
  const match = pickBestMatch(results, title);
  if (!match) return null;
  const { igdb_id, genres, igdb_rating, hltb_main, hltb_extra, hltb_complete, hltb_confidence } = match;
  return { igdb_id, genres, igdb_rating, hltb_main, hltb_extra, hltb_complete, hltb_confidence };
}

export function formatTime(minutes) {
  if (!minutes || minutes === 0) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
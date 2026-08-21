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

export async function searchIGDB(gameName) {
  // Step 1: search for games
  const games = await igdbPost('games',
  `fields name,cover.url,platforms.name,genres.name,rating; search "${gameName}"; limit 10;`
  );

  // Step 2: fetch time to beat for all results in one call
  let timings = [];
  if (games.length > 0) {
    const ids = games.map(g => g.id).join(',');
    try {
      timings = await igdbPost('game_time_to_beats',
        `fields game_id,hastily,normally,completely,count; where game_id = (${ids});`
      );
    } catch (e) {
      // time to beat is optional, don't fail the whole search
      console.warn('Could not fetch time to beat:', e);
    }
  }

  // Map timings by game ID for easy lookup
  const timingMap = {};
  timings.forEach(t => { timingMap[t.game_id] = t; });

  return games.map(g => {
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
  const results = await searchIGDB(title);
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
import { searchIGDB, pickBestMatch } from './igdb';
import { fetchWithTimeout, markNetworkError } from './networkError';

const STEAM_BASE = import.meta.env.DEV ? '/steam' : 'https://api.steampowered.com';

// Not every app has a library_600x900 portrait capsule (only backfilled for newer
// titles), but header.jpg is near-universal — fall back to it when the portrait art 404s.
export function getSteamCoverFallback(coverUrl) {
  if (!coverUrl?.includes('/library_600x900.jpg')) return null;
  return coverUrl.replace('/library_600x900.jpg', '/header.jpg');
}

// apiKey/steamId are each user's own Steam credentials (saved in Settings,
// stored per-account in Supabase) rather than one key shared by everyone.
export async function importSteamLibrary(apiKey, steamId) {
  if (!apiKey || !steamId) {
    throw new Error('Add your Steam API key and Steam ID in Settings before importing.');
  }

  const url = `${STEAM_BASE}/IPlayerService/GetOwnedGames/v1/?key=${apiKey}&steamid=${steamId}&include_appinfo=true&format=json`;

  let response;
  try {
    response = await fetchWithTimeout(url, {}, 10000);
  } catch (err) {
    throw markNetworkError(err, 'Could not reach Steam.');
  }
  if (!response.ok) throw new Error('Steam API error — check your API key and Steam ID');

  const data = await response.json();
  const games = data.response?.games ?? [];

  return games.map(g => ({
    title: g.name,
    platform: 'PC (Steam)',
    igdb_id: null,
    genres: null,
    igdb_rating: null,
    cover_url: `https://cdn.cloudflare.steamstatic.com/steam/apps/${g.appid}/library_600x900.jpg`,
    hltb_main: null,
    hltb_extra: null,
    hltb_complete: null,
    hltb_confidence: null,
    status: 'backlog',
    personal_rating: null,
    notes: '',
    source: 'steam',
  }));
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Steam's API doesn't provide completion times, so look each title up on IGDB
// afterward. Best-effort: a game keeps its Steam data if the lookup fails or
// finds no match. Paced to stay under IGDB's ~4 req/sec limit (2 requests per
// game via searchIGDB) — igdbPost also retries on 429 as a second line of defense.
export async function enrichWithHLTB(games, onProgress) {
  const enriched = [];
  for (const game of games) {
    if (enriched.length > 0) await sleep(400);
    try {
      const results = await searchIGDB(game.title);
      const match = pickBestMatch(results, game.title);
      enriched.push(match ? {
        ...game,
        igdb_id: match.igdb_id,
        genres: match.genres,
        igdb_rating: match.igdb_rating,
        hltb_main: match.hltb_main,
        hltb_extra: match.hltb_extra,
        hltb_complete: match.hltb_complete,
        hltb_confidence: match.hltb_confidence,
      } : game);
    } catch (err) {
      console.warn(`HLTB lookup failed for "${game.title}":`, err);
      enriched.push(game);
    }
    onProgress?.(enriched.length, games.length);
  }
  return enriched;
}
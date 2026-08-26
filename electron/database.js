const supabase = require('./supabaseClient');
const secureStore = require('./secureStore');
const { isNetworkError, NETWORK_ERROR_PREFIX } = require('./networkError');

// Supabase errors are plain objects, not real Error instances — thrown as-is
// they lose their message crossing the Electron IPC boundary (the renderer
// just sees "[object Object]"). Wrap them in a real Error so ipcMain.handle
// actually forwards something useful. A network failure gets a recognizable
// prefix too — that's the only classification that survives the IPC hop for
// the renderer to detect afterward.
function check(error) {
  if (!error) return;
  const message = error.message || JSON.stringify(error);
  throw new Error(isNetworkError(error) ? NETWORK_ERROR_PREFIX + message : message);
}

// App-wide settings (currently just the cached IGDB access token) — not
// per-user data, so this stays in the local encrypted store rather than
// Supabase.
function getSetting(key) {
  return secureStore.getItem(key);
}

function setSetting(key, value) {
  secureStore.setItem(key, value);
}

async function getAllGames() {
  const { data, error } = await supabase.from('games').select('*').order('title', { ascending: true });
  check(error);
  return data;
}

async function addGame(game) {
  const { data, error } = await supabase.from('games').insert(game).select().single();
  check(error);
  return data;
}

async function updateGame(id, fields) {
  const { data, error } = await supabase.from('games').update(fields).eq('id', id).select().single();
  check(error);
  return data;
}

async function deleteGame(id) {
  const { error } = await supabase.from('games').delete().eq('id', id);
  check(error);
  return { success: true };
}

async function deleteAllGames() {
  // RLS already scopes this to the logged-in user's own rows; the id filter
  // just satisfies Postgres/PostgREST's requirement that deletes have a
  // WHERE clause (ids are always > 0).
  const { error } = await supabase.from('games').delete().gt('id', 0);
  check(error);
  return { success: true };
}

async function updateGamesStatus(ids, status) {
  const { error } = await supabase.from('games').update({ status }).in('id', ids);
  check(error);
  return { success: true };
}

async function updateGamesPlatform(ids, platform) {
  const { error } = await supabase.from('games').update({ platform }).in('id', ids);
  check(error);
  return { success: true };
}

async function deleteGames(ids) {
  const { error } = await supabase.from('games').delete().in('id', ids);
  check(error);
  return { success: true };
}

async function searchGames(query) {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .ilike('title', `%${query}%`)
    .order('title', { ascending: true });
  check(error);
  return data;
}

// Shared IGDB metadata cache — not user-scoped, see supabase/migrations/0001_init.sql.
async function getCachedIgdbGame(igdbId) {
  const { data, error } = await supabase.from('igdb_cache').select('*').eq('igdb_id', igdbId).maybeSingle();
  check(error);
  return data;
}

async function setCachedIgdbGame(entry) {
  const { error } = await supabase.from('igdb_cache').upsert(entry, { onConflict: 'igdb_id' });
  check(error);
  return { success: true };
}

// Per-user settings (currently just each account's own Steam credentials) —
// see supabase/migrations/0004_user_settings.sql. user_id defaults to
// auth.uid() at the database level, so it's never sent from the client.
async function getUserSettings() {
  const { data, error } = await supabase.from('user_settings').select('steam_api_key, steam_id').maybeSingle();
  check(error);
  return data ?? { steam_api_key: null, steam_id: null };
}

async function setUserSettings(fields) {
  const { error } = await supabase.from('user_settings').upsert(fields, { onConflict: 'user_id' });
  check(error);
  return { success: true };
}

// Custom status slots — see supabase/migrations/0006_user_statuses.sql. Null
// means the user has no row yet (never customized anything), so the caller
// falls back to the built-in default set.
async function getUserStatuses() {
  const { data, error } = await supabase.from('user_statuses').select('statuses').maybeSingle();
  check(error);
  return data?.statuses ?? null;
}

async function setUserStatuses(statuses) {
  const { error } = await supabase.from('user_statuses').upsert({ statuses, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  check(error);
  return { success: true };
}

module.exports = {
  getAllGames, addGame, updateGame, deleteGame, deleteAllGames,
  updateGamesStatus, updateGamesPlatform, deleteGames, searchGames,
  getSetting, setSetting,
  getCachedIgdbGame, setCachedIgdbGame,
  getUserSettings, setUserSettings,
  getUserStatuses, setUserStatuses,
};

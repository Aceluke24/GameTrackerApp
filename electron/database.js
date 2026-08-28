const supabase = require('./supabaseClient');
const {
  isNetworkError, isAuthError,
  NETWORK_ERROR_PREFIX, SESSION_EXPIRED_PREFIX,
} = require('./networkError');

// Supabase errors are plain objects, not real Error instances — thrown as-is
// they lose their message crossing the Electron IPC boundary (the renderer
// just sees "[object Object]"). Wrap them in a real Error so ipcMain.handle
// actually forwards something useful, with a recognizable prefix for the two
// cases the renderer handles specially — a network failure and a dead
// session — since the prefix is the only thing that survives the IPC hop.
function check(error) {
  if (!error) return;
  const message = error.message || JSON.stringify(error);
  let prefix = '';
  if (isNetworkError(error)) prefix = NETWORK_ERROR_PREFIX;
  else if (isAuthError(error)) prefix = SESSION_EXPIRED_PREFIX;
  throw new Error(prefix + message);
}

// Runs a Supabase query. The background auto-refresh ticker normally keeps
// the access token valid, but a laptop that slept through the expiry window
// (or a token rejected for another recoverable reason) would otherwise make
// the call fail. So on an auth error, transparently refresh the session and
// try once more — auth-js serialises concurrent refreshes internally, so a
// burst of calls all recovering at once only spends the refresh token once.
// Only if the retry also fails does check() throw (SESSION_EXPIRED_PREFIX),
// and the renderer drops to the login screen.
async function query(run) {
  let { data, error } = await run();
  if (isAuthError(error)) {
    const { error: refreshError } = await supabase.auth.refreshSession();
    if (!refreshError) ({ data, error } = await run());
  }
  check(error);
  return data;
}

async function getAllGames() {
  return query(() => supabase.from('games').select('*').order('title', { ascending: true }));
}

async function addGame(game) {
  return query(() => supabase.from('games').insert(game).select().single());
}

async function updateGame(id, fields) {
  return query(() => supabase.from('games').update(fields).eq('id', id).select().single());
}

async function deleteGame(id) {
  await query(() => supabase.from('games').delete().eq('id', id));
  return { success: true };
}

async function deleteAllGames() {
  // RLS already scopes this to the logged-in user's own rows; the id filter
  // just satisfies Postgres/PostgREST's requirement that deletes have a
  // WHERE clause (ids are always > 0).
  await query(() => supabase.from('games').delete().gt('id', 0));
  return { success: true };
}

async function updateGamesStatus(ids, status) {
  await query(() => supabase.from('games').update({ status }).in('id', ids));
  return { success: true };
}

async function updateGamesPlatform(ids, platform) {
  await query(() => supabase.from('games').update({ platform }).in('id', ids));
  return { success: true };
}

async function deleteGames(ids) {
  await query(() => supabase.from('games').delete().in('id', ids));
  return { success: true };
}

async function searchGames(queryStr) {
  return query(() => supabase
    .from('games')
    .select('*')
    .ilike('title', `%${queryStr}%`)
    .order('title', { ascending: true }));
}

// Shared IGDB metadata cache — not user-scoped, see supabase/migrations/0001_init.sql.
async function getCachedIgdbGame(igdbId) {
  return query(() => supabase.from('igdb_cache').select('*').eq('igdb_id', igdbId).maybeSingle());
}

async function setCachedIgdbGame(entry) {
  await query(() => supabase.from('igdb_cache').upsert(entry, { onConflict: 'igdb_id' }));
  return { success: true };
}

// Per-user settings (currently just each account's own Steam credentials) —
// see supabase/migrations/0004_user_settings.sql. user_id defaults to
// auth.uid() at the database level, so it's never sent from the client.
async function getUserSettings() {
  const data = await query(() => supabase.from('user_settings').select('steam_api_key, steam_id').maybeSingle());
  return data ?? { steam_api_key: null, steam_id: null };
}

async function setUserSettings(fields) {
  await query(() => supabase.from('user_settings').upsert(fields, { onConflict: 'user_id' }));
  return { success: true };
}

// Custom status slots — see supabase/migrations/0006_user_statuses.sql. Null
// means the user has no row yet (never customized anything), so the caller
// falls back to the built-in default set.
async function getUserStatuses() {
  const data = await query(() => supabase.from('user_statuses').select('statuses').maybeSingle());
  return data?.statuses ?? null;
}

async function setUserStatuses(statuses) {
  await query(() => supabase.from('user_statuses').upsert({ statuses, updated_at: new Date().toISOString() }, { onConflict: 'user_id' }));
  return { success: true };
}

module.exports = {
  getAllGames, addGame, updateGame, deleteGame, deleteAllGames,
  updateGamesStatus, updateGamesPlatform, deleteGames, searchGames,
  getCachedIgdbGame, setCachedIgdbGame,
  getUserSettings, setUserSettings,
  getUserStatuses, setUserStatuses,
};

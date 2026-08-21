const supabase = require('./supabaseClient');
const secureStore = require('./secureStore');

// Supabase errors are plain objects, not real Error instances — thrown as-is
// they lose their message crossing the Electron IPC boundary (the renderer
// just sees "[object Object]"). Wrap them in a real Error so ipcMain.handle
// actually forwards something useful.
function check(error) {
  if (error) throw new Error(error.message || JSON.stringify(error));
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

module.exports = {
  getAllGames, addGame, updateGame, deleteGame, deleteAllGames,
  updateGamesStatus, deleteGames, searchGames,
  getSetting, setSetting,
  getCachedIgdbGame, setCachedIgdbGame,
};

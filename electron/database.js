const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

const dbPath = path.join(app.getPath('userData'), 'games.db');
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS games (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    title           TEXT NOT NULL,
    platform        TEXT,
    cover_url       TEXT,
    igdb_id         INTEGER,
    hltb_main       INTEGER,
    hltb_extra      INTEGER,
    hltb_complete   INTEGER,
    status          TEXT DEFAULT 'backlog',
    personal_rating INTEGER,
    notes           TEXT,
    date_added      TEXT DEFAULT (date('now')),
    date_finished   TEXT,
    source          TEXT DEFAULT 'manual'
  );
`);

// Safely add new columns if they don't exist yet
const existingColumns = db.prepare("PRAGMA table_info(games)").all().map(c => c.name);
if (!existingColumns.includes('genres'))         db.exec("ALTER TABLE games ADD COLUMN genres TEXT;");
if (!existingColumns.includes('igdb_rating'))    db.exec("ALTER TABLE games ADD COLUMN igdb_rating INTEGER;");
if (!existingColumns.includes('hltb_confidence')) db.exec("ALTER TABLE games ADD COLUMN hltb_confidence INTEGER;");

// Small key-value store — currently just holds the cached IGDB access token
// so it survives app restarts instead of re-fetching one every launch.
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT
  );
`);

function getSetting(key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : null;
}

function setSetting(key, value) {
  db.prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(key, value);
}

function getAllGames() {
  return db.prepare('SELECT * FROM games ORDER BY title ASC').all();
}

function addGame(game) {
  const stmt = db.prepare(`
    INSERT INTO games
      (title, platform, cover_url, igdb_id, genres, igdb_rating, hltb_main, hltb_extra, hltb_complete, hltb_confidence, status, personal_rating, notes, source)
    VALUES
      (@title, @platform, @cover_url, @igdb_id, @genres, @igdb_rating, @hltb_main, @hltb_extra, @hltb_complete, @hltb_confidence, @status, @personal_rating, @notes, @source)
  `);
  const result = stmt.run(game);
  return { id: result.lastInsertRowid, ...game };
}

function updateGame(id, fields) {
  const keys = Object.keys(fields);
  const setClause = keys.map(k => `${k} = @${k}`).join(', ');
  const stmt = db.prepare(`UPDATE games SET ${setClause} WHERE id = @id`);
  stmt.run({ ...fields, id });
  return db.prepare('SELECT * FROM games WHERE id = ?').get(id);
}

function deleteGame(id) {
  db.prepare('DELETE FROM games WHERE id = ?').run(id);
  return { success: true };
}

function deleteAllGames() {
  db.prepare('DELETE FROM games').run();
  return { success: true };
}

function updateGamesStatus(ids, status) {
  const placeholders = ids.map(() => '?').join(',');
  db.prepare(`UPDATE games SET status = ? WHERE id IN (${placeholders})`).run(status, ...ids);
  return { success: true };
}

function deleteGames(ids) {
  const placeholders = ids.map(() => '?').join(',');
  db.prepare(`DELETE FROM games WHERE id IN (${placeholders})`).run(...ids);
  return { success: true };
}

function searchGames(query) {
  return db.prepare("SELECT * FROM games WHERE title LIKE ? ORDER BY title ASC").all(`%${query}%`);
}

module.exports = { getAllGames, addGame, updateGame, deleteGame, deleteAllGames, updateGamesStatus, deleteGames, searchGames, getSetting, setSetting };
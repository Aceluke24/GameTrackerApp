const { app, safeStorage } = require('electron');
const fs = require('fs');
const path = require('path');

// A small encrypted key-value file (OS keychain-backed via safeStorage) used
// for two things that don't belong in Supabase: the cached IGDB access token
// (app-wide, not per-user) and the Supabase auth session itself (needed so
// logging in survives an app restart — Supabase's client normally persists
// to browser localStorage, which doesn't exist in the main process).
const storePath = path.join(app.getPath('userData'), 'secure-store.bin');

function readAll() {
  if (!fs.existsSync(storePath)) return {};
  const raw = fs.readFileSync(storePath);
  if (raw.length === 0) return {};
  try {
    const json = safeStorage.isEncryptionAvailable()
      ? safeStorage.decryptString(raw)
      : raw.toString('utf8');
    return JSON.parse(json);
  } catch {
    return {};
  }
}

function writeAll(data) {
  const json = JSON.stringify(data);
  const buf = safeStorage.isEncryptionAvailable()
    ? safeStorage.encryptString(json)
    : Buffer.from(json, 'utf8');
  fs.writeFileSync(storePath, buf);
}

function getItem(key) {
  return readAll()[key] ?? null;
}

function setItem(key, value) {
  const data = readAll();
  data[key] = value;
  writeAll(data);
}

function removeItem(key) {
  const data = readAll();
  delete data[key];
  writeAll(data);
}

module.exports = { getItem, setItem, removeItem };

require('dotenv').config();
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

const isDev = process.env.NODE_ENV !== 'production';
const appIconPath = path.join(__dirname, isDev ? '../public' : '../dist', 'icons8-closed-treasure-chest-96.png');

app.setName('Game Vault');
// Keep the on-disk data folder pinned to its original location so renaming
// the app's display name never orphans the local encrypted store (session +
// cached IGDB token — the game library itself now lives in Supabase).
app.setPath('userData', path.join(app.getPath('appData'), 'vaultlog'));

const db = require('./database');
const auth = require('./auth');

const IGDB_CLIENT_ID = process.env.IGDB_CLIENT_ID;
const IGDB_CLIENT_SECRET = process.env.IGDB_CLIENT_SECRET;
const TOKEN_REFRESH_MARGIN_MS = 24 * 60 * 60 * 1000;

// IGDB access tokens last ~60 days. Rather than requiring a manual re-paste
// every couple months, fetch one here — main process only, so the client
// secret never ships inside the renderer bundle — cache it locally, and
// refresh it once it's within a day of expiring.
async function getValidIgdbToken() {
  const storedToken = db.getSetting('igdb_access_token');
  const storedExpiry = Number(db.getSetting('igdb_token_expires_at') || 0);

  if (storedToken && storedExpiry > Date.now() + TOKEN_REFRESH_MARGIN_MS) {
    return storedToken;
  }

  if (!IGDB_CLIENT_ID || !IGDB_CLIENT_SECRET) {
    throw new Error('IGDB_CLIENT_ID / IGDB_CLIENT_SECRET are not set — add them to your .env file.');
  }

  const response = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: IGDB_CLIENT_ID,
      client_secret: IGDB_CLIENT_SECRET,
      grant_type: 'client_credentials',
    }),
  });
  if (!response.ok) throw new Error(`Twitch token request failed: ${response.statusText}`);

  const data = await response.json();
  const expiresAt = Date.now() + data.expires_in * 1000;
  db.setSetting('igdb_access_token', data.access_token);
  db.setSetting('igdb_token_expires_at', String(expiresAt));

  return data.access_token;
}

let mainWindow = null;

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset', // macOS: clean title bar
    frame: false,                  // Windows/Linux: custom title bar
    backgroundColor: '#0d0d0f',
    icon: appIconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Windows/Linux lose their native minimize/maximize/close buttons under
  // frame:false — TitleBar.jsx renders replacements there, kept in sync via
  // these events (macOS keeps its native traffic lights via titleBarStyle).
  win.on('maximize', () => win.webContents.send('window:maximizeChanged', true));
  win.on('unmaximize', () => win.webContents.send('window:maximizeChanged', false));

  mainWindow = win;
  win.on('closed', () => { if (mainWindow === win) mainWindow = null; });

  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

// Keeps the renderer's auth state in sync with the actual Supabase session —
// covers login, logout, and silent token refreshes.
auth.onAuthStateChange((session) => {
  mainWindow?.webContents.send('auth:changed', session);
});

app.whenReady().then(() => {
  if (process.platform === 'darwin' && app.dock) {
    app.dock.setIcon(appIconPath);
  }
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ─── IPC Handlers ─────────────────────────────────────────────────────────────
// These are the "API endpoints" between your React UI and Supabase.

ipcMain.handle('games:getAll', () => db.getAllGames());
ipcMain.handle('games:add', (_, game) => db.addGame(game));
ipcMain.handle('games:update', (_, id, fields) => db.updateGame(id, fields));
ipcMain.handle('games:delete', (_, id) => db.deleteGame(id));
ipcMain.handle('games:deleteAll', () => db.deleteAllGames());
ipcMain.handle('games:updateStatusMany', (_, ids, status) => db.updateGamesStatus(ids, status));
ipcMain.handle('games:deleteMany', (_, ids) => db.deleteGames(ids));
ipcMain.handle('games:search', (_, query) => db.searchGames(query));

ipcMain.handle('igdb:getToken', async () => ({
  accessToken: await getValidIgdbToken(),
  clientId: IGDB_CLIENT_ID,
}));
ipcMain.handle('igdb:getCached', (_, igdbId) => db.getCachedIgdbGame(igdbId));
ipcMain.handle('igdb:setCached', (_, entry) => db.setCachedIgdbGame(entry));

ipcMain.handle('auth:signUp', (_, email, password) => auth.signUp(email, password));
ipcMain.handle('auth:signIn', (_, email, password) => auth.signIn(email, password));
ipcMain.handle('auth:signOut', () => auth.signOut());
ipcMain.handle('auth:getSession', () => auth.getSession());

ipcMain.on('window:minimize', (event) => {
  BrowserWindow.fromWebContents(event.sender)?.minimize();
});
ipcMain.on('window:toggleMaximize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;
  win.isMaximized() ? win.unmaximize() : win.maximize();
});
ipcMain.on('window:close', (event) => {
  BrowserWindow.fromWebContents(event.sender)?.close();
});
ipcMain.handle('window:isMaximized', (event) => {
  return BrowserWindow.fromWebContents(event.sender)?.isMaximized() ?? false;
});

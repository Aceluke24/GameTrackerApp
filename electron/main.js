require('dotenv').config();
const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs/promises');

const isDev = process.env.NODE_ENV !== 'production';
const appIconPath = path.join(__dirname, isDev ? '../public' : '../dist', 'icons8-closed-treasure-chest-96.png');
const PROTOCOL = 'gamevault';

// Only one instance should run — if the email-confirmation link launches a
// second one (because the app was already open), hand its URL to this
// instance instead of opening a redundant window.
if (!app.requestSingleInstanceLock()) {
  app.quit();
}

app.setName('Game Vault');
// Keep the on-disk data folder pinned to its original location so renaming
// the app's display name never orphans the local encrypted store (session +
// cached IGDB token — the game library itself now lives in Supabase).
app.setPath('userData', path.join(app.getPath('appData'), 'vaultlog'));

const db = require('./database');
const auth = require('./auth');
const { fetchWithTimeout, isNetworkError, NETWORK_ERROR_PREFIX } = require('./networkError');

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

  let response;
  try {
    response = await fetchWithTimeout('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: IGDB_CLIENT_ID,
        client_secret: IGDB_CLIENT_SECRET,
        grant_type: 'client_credentials',
      }),
    }, 10000);
  } catch (err) {
    throw isNetworkError(err) ? new Error(NETWORK_ERROR_PREFIX + err.message) : err;
  }
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
auth.onAuthStateChange((event, session) => {
  mainWindow?.webContents.send('auth:changed', session, event);
});

// ─── Deep linking (gamevault://) ───────────────────────────────────────────
// Lets Supabase's "Confirm your email" link bring the user straight back
// into the running app instead of a dead browser tab. Packaged builds
// register the scheme automatically via the `protocols` entry in
// package.json's build config; dev mode needs the extra args below so the
// OS knows to relaunch through Electron with this script.
if (isDev) {
  if (process.platform === 'darwin') {
    app.setAsDefaultProtocolClient(PROTOCOL);
  } else {
    app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient(PROTOCOL);
}

let pendingDeepLinkUrl = null;

async function handleAuthDeepLink(url) {
  try {
    const parsed = new URL(url);
    const hashParams = new URLSearchParams(parsed.hash.replace(/^#/, ''));
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');
    const code = parsed.searchParams.get('code');
    // Supabase includes this regardless of client config — 'recovery' for a
    // password-reset link, 'signup' for email confirmation, etc. We rely on
    // this instead of Supabase's own PASSWORD_RECOVERY auth event, since
    // that event only fires from its own browser-URL detection, which is
    // disabled here (detectSessionInUrl: false — there's no URL bar in
    // Electron, we parse the link ourselves).
    const isRecovery = hashParams.get('type') === 'recovery' || parsed.searchParams.get('type') === 'recovery';

    if (accessToken && refreshToken) {
      await auth.setSessionFromTokens(accessToken, refreshToken);
    } else if (code) {
      await auth.exchangeCodeForSession(code);
    }

    if (isRecovery) {
      mainWindow?.webContents.send('auth:passwordRecovery');
    }
  } catch (err) {
    console.error('Failed to complete sign-in from email link:', err);
  }

  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
}

function urlFromArgv(argv) {
  return argv.find(arg => arg.startsWith(`${PROTOCOL}://`));
}

// macOS: fires when the app is opened (or already running) via the custom
// scheme — can fire before the window exists, so queue it in that case.
app.on('open-url', (event, url) => {
  event.preventDefault();
  if (mainWindow) handleAuthDeepLink(url);
  else pendingDeepLinkUrl = url;
});

// Windows/Linux: a second launch passes the URL as a plain argv entry
// instead of firing 'open-url'.
app.on('second-instance', (_event, argv) => {
  const url = urlFromArgv(argv);
  if (url) handleAuthDeepLink(url);
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.whenReady().then(() => {
  if (process.platform === 'darwin' && app.dock) {
    app.dock.setIcon(appIconPath);
  }
  createWindow();

  if (pendingDeepLinkUrl) {
    handleAuthDeepLink(pendingDeepLinkUrl);
    pendingDeepLinkUrl = null;
  }
  // Windows/Linux cold start via the protocol link (not already running).
  const argvUrl = urlFromArgv(process.argv);
  if (argvUrl) handleAuthDeepLink(argvUrl);

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
ipcMain.handle('games:updatePlatformMany', (_, ids, platform) => db.updateGamesPlatform(ids, platform));
ipcMain.handle('games:deleteMany', (_, ids) => db.deleteGames(ids));
ipcMain.handle('games:search', (_, query) => db.searchGames(query));

ipcMain.handle('igdb:getToken', async () => ({
  accessToken: await getValidIgdbToken(),
  clientId: IGDB_CLIENT_ID,
}));
ipcMain.handle('igdb:getCached', (_, igdbId) => db.getCachedIgdbGame(igdbId));
ipcMain.handle('igdb:setCached', (_, entry) => db.setCachedIgdbGame(entry));

ipcMain.handle('userSettings:get', () => db.getUserSettings());
ipcMain.handle('userSettings:set', (_, fields) => db.setUserSettings(fields));

ipcMain.handle('userStatuses:get', () => db.getUserStatuses());
ipcMain.handle('userStatuses:set', (_, statuses) => db.setUserStatuses(statuses));

ipcMain.handle('auth:signUp', (_, email, password) => auth.signUp(email, password));
ipcMain.handle('auth:signIn', (_, email, password) => auth.signIn(email, password));
ipcMain.handle('auth:signOut', () => auth.signOut());
ipcMain.handle('auth:deleteAccount', () => auth.deleteAccount());
ipcMain.handle('auth:getSession', () => auth.getSession());
ipcMain.handle('auth:resetPassword', (_, email) => auth.resetPasswordForEmail(email));
ipcMain.handle('auth:updatePassword', (_, newPassword) => auth.updatePassword(newPassword));

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

// Opens links in the system browser instead of navigating the app's own
// window. Restricted to https:// so a stray non-URL string can't do
// anything unexpected (e.g. a file:// or javascript: scheme).
ipcMain.handle('shell:openExternal', (_, url) => {
  if (!/^https:\/\//.test(url)) return;
  return shell.openExternal(url);
});

// Native "Save As" dialog for exporting the library — content is prepared
// entirely in the renderer (CSV/JSON string); this just handles the file
// picker and the actual disk write.
ipcMain.handle('file:save', async (event, content, defaultFilename) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    defaultPath: path.join(app.getPath('downloads'), defaultFilename),
  });
  if (canceled || !filePath) return { canceled: true };
  await fs.writeFile(filePath, content, 'utf-8');
  return { canceled: false, filePath };
});

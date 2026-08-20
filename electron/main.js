const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

const isDev = process.env.NODE_ENV !== 'production';
const appIconPath = path.join(__dirname, isDev ? '../public' : '../dist', 'icons8-closed-treasure-chest-96.png');

app.setName('Game Vault');
// Keep the on-disk data folder pinned to its original location so renaming
// the app's display name never orphans the existing games.db.
app.setPath('userData', path.join(app.getPath('appData'), 'vaultlog'));

const db = require('./database');

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

  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

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
// These are the "API endpoints" between your React UI and the SQLite database.

ipcMain.handle('games:getAll', () => db.getAllGames());
ipcMain.handle('games:add', (_, game) => db.addGame(game));
ipcMain.handle('games:update', (_, id, fields) => db.updateGame(id, fields));
ipcMain.handle('games:delete', (_, id) => db.deleteGame(id));
ipcMain.handle('games:deleteAll', () => db.deleteAllGames());
ipcMain.handle('games:updateStatusMany', (_, ids, status) => db.updateGamesStatus(ids, status));
ipcMain.handle('games:deleteMany', (_, ids) => db.deleteGames(ids));
ipcMain.handle('games:search', (_, query) => db.searchGames(query));

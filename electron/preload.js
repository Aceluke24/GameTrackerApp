const { contextBridge, ipcRenderer } = require('electron');

// This file is the secure bridge between your React frontend and Electron's
// Node.js backend. React calls window.electronAPI.xxx(), which goes through
// here, then to main.js, then to the database.

contextBridge.exposeInMainWorld('electronAPI', {
  // Games CRUD
  getAllGames:  ()           => ipcRenderer.invoke('games:getAll'),
  addGame:     (game)       => ipcRenderer.invoke('games:add', game),
  updateGame:  (id, fields) => ipcRenderer.invoke('games:update', id, fields),
  deleteGame:  (id)         => ipcRenderer.invoke('games:delete', id),
  deleteAllGames: ()        => ipcRenderer.invoke('games:deleteAll'),
  updateGamesStatus: (ids, status) => ipcRenderer.invoke('games:updateStatusMany', ids, status),
  deleteGames: (ids)        => ipcRenderer.invoke('games:deleteMany', ids),
  searchGames: (query)      => ipcRenderer.invoke('games:search', query),

  // IGDB auth — main process holds the client secret and refreshes the
  // token as needed; the renderer just asks for a currently-valid one.
  getIGDBToken: () => ipcRenderer.invoke('igdb:getToken'),

  // Window controls — macOS keeps its native traffic lights (titleBarStyle),
  // but frame:false drops them on Windows/Linux, so TitleBar.jsx renders its
  // own minimize/maximize/close buttons there, wired through these.
  platform: process.platform,
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  toggleMaximizeWindow: () => ipcRenderer.send('window:toggleMaximize'),
  closeWindow: () => ipcRenderer.send('window:close'),
  isWindowMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  onMaximizeChange: (callback) => {
    const handler = (_, isMaximized) => callback(isMaximized);
    ipcRenderer.on('window:maximizeChanged', handler);
    return () => ipcRenderer.removeListener('window:maximizeChanged', handler);
  },
});

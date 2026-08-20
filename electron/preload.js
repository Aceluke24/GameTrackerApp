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
});

import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import GameGrid from './components/GameGrid';
import StatsPage from './components/StatsPage';
import AddGameModal from './components/AddGameModal';
import GameDetailModal from './components/GameDetailModal';
import TitleBar from './components/TitleBar';
import './App.css';
import { importSteamLibrary, enrichWithHLTB } from './api/steam';

// Matches IGDB's genre taxonomy so manually picked genres line up with
// whatever IGDB search/import already writes into the genres column.
export const GENRES = [
  'Adventure', 'Arcade', 'Card & Board Game', 'Fighting',
  "Hack and slash/Beat 'em up", 'Indie', 'MOBA', 'Music', 'Pinball',
  'Platform', 'Point-and-click', 'Puzzle', 'Quiz/Trivia', 'Racing',
  'Real Time Strategy (RTS)', 'Role-playing (RPG)', 'Shooter', 'Simulator',
  'Sport', 'Strategy', 'Tactical', 'Turn-based strategy (TBS)', 'Visual Novel',
];

export const STATUSES = [
  { key: 'backlog',    label: 'Backlog',       emoji: '📦' },
  { key: 'playing',   label: 'Playing',        emoji: '🎮' },
  { key: 'live_service', label: 'Live Service', emoji: '♾️' },
  { key: 'finished',  label: 'Finished',       emoji: '✅' },
  { key: 'want_again',label: 'Play Again',     emoji: '🔁' },
  { key: 'abandoned', label: 'Abandoned',      emoji: '💀' },
  { key: 'wishlist',  label: 'Wishlist',       emoji: '⭐' },
];

export default function App() {
  const [games, setGames] = useState([]);
  const [filter, setFilter] = useState('all');
  const [view, setView] = useState('games');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedGame, setSelectedGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  function toggleTheme() {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  }

  // Load all games from SQLite on startup
  useEffect(() => {
    loadGames();
  }, []);

  async function loadGames() {
    setLoading(true);
    try {
      // In dev without Electron, fall back to mock data
      if (window.electronAPI) {
        const data = await window.electronAPI.getAllGames();
        setGames(data);
      } else {
        setGames(MOCK_GAMES); // See bottom of file
      }
    } catch (err) {
      console.error('Failed to load games:', err);
    }
    setLoading(false);
  }

  async function handleAddGame(game) {
    try {
      let saved;
      if (window.electronAPI) {
        saved = await window.electronAPI.addGame(game);
      } else {
        saved = { id: Date.now(), ...game };
      }
      setGames(prev => [...prev, saved]);
      setShowAddModal(false);
    } catch (err) {
      console.error('Failed to add game:', err);
    }
  }

  async function handleUpdateGame(id, fields) {
    try {
      let updated;
      if (window.electronAPI) {
        updated = await window.electronAPI.updateGame(id, fields);
      } else {
        updated = games.find(g => g.id === id);
        Object.assign(updated, fields);
      }
      setGames(prev => prev.map(g => g.id === id ? { ...g, ...fields } : g));
      setSelectedGame(prev => prev?.id === id ? { ...prev, ...fields } : prev);
    } catch (err) {
      console.error('Failed to update game:', err);
    }
  }

  async function handleDeleteGame(id) {
    try {
      if (window.electronAPI) await window.electronAPI.deleteGame(id);
      setGames(prev => prev.filter(g => g.id !== id));
      setSelectedGame(null);
    } catch (err) {
      console.error('Failed to delete game:', err);
    }
  }

  async function handleImportSteam() {
  try {
    const steamGames = await importSteamLibrary();
    const existingTitles = new Set(games.map(g => g.title.toLowerCase()));
    const newGames = steamGames.filter(g => !existingTitles.has(g.title.toLowerCase()));

    if (newGames.length === 0) {
      alert('No new games to import — everything is already in your vault!');
      return;
    }

    const confirmed = confirm(`Import ${newGames.length} new games from Steam? (${steamGames.length - newGames.length} already in vault)\n\nThis also looks up completion times, so it may take a bit for a large batch.`);
    if (!confirmed) return;

    setLoading(true);
    const enrichedGames = await enrichWithHLTB(newGames);

    const saved = [];
    for (const game of enrichedGames) {
      if (window.electronAPI) {
        const s = await window.electronAPI.addGame(game);
        saved.push(s);
      } else {
        saved.push({ id: Date.now() + Math.random(), ...game });
      }
    }

    setGames(prev => [...prev, ...saved]);
    alert(`✅ Imported ${saved.length} games from Steam!`);
  } catch (err) {
    console.error('Steam import failed:', err);
    alert('Steam import failed — check the console for details.');
  } finally {
    setLoading(false);
  }
  }

  async function handleDeleteAllGames() {
    if (games.length === 0) return;
    const confirmed = confirm(`Delete all ${games.length} games? This cannot be undone.`);
    if (!confirmed) return;

    try {
      if (window.electronAPI) await window.electronAPI.deleteAllGames();
      setGames([]);
      setSelectedGame(null);
    } catch (err) {
      console.error('Failed to delete all games:', err);
      alert('Failed to delete all games — check the console for details.');
    }
  }

  function toggleSelectMode() {
    setSelectMode(prev => !prev);
    setSelectedIds(new Set());
  }

  function toggleSelectGame(id) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  async function handleBulkStatusChange(status) {
    if (selectedIds.size === 0 || !status) return;
    try {
      if (window.electronAPI) await window.electronAPI.updateGamesStatus([...selectedIds], status);
      setGames(prev => prev.map(g => selectedIds.has(g.id) ? { ...g, status } : g));
      clearSelection();
    } catch (err) {
      console.error('Failed to update selected games:', err);
      alert('Failed to update selected games — check the console for details.');
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    const confirmed = confirm(`Delete ${selectedIds.size} selected game${selectedIds.size !== 1 ? 's' : ''}? This cannot be undone.`);
    if (!confirmed) return;

    try {
      if (window.electronAPI) await window.electronAPI.deleteGames([...selectedIds]);
      setGames(prev => prev.filter(g => !selectedIds.has(g.id)));
      clearSelection();
    } catch (err) {
      console.error('Failed to delete selected games:', err);
      alert('Failed to delete selected games — check the console for details.');
    }
  }

  // Filter + search
  const query = search.trim().toLowerCase();
  const filtered = games
    .filter(g => {
      const matchesFilter = filter === 'all' || g.status === filter;
      const matchesSearch = !query
        || g.title.toLowerCase().includes(query)
        || (g.platform || '').toLowerCase().includes(query)
        || (g.genres || '').toLowerCase().includes(query);
      return matchesFilter && matchesSearch;
    })
    .sort((a, b) => a.title.localeCompare(b.title));

  // Count per status for sidebar badges
  const counts = STATUSES.reduce((acc, s) => {
    acc[s.key] = games.filter(g => g.status === s.key).length;
    return acc;
  }, { all: games.length });

  return (
    <div className="app">
      <TitleBar />
      <div className="app-body">
        <Sidebar
          filter={filter}
          setFilter={setFilter}
          view={view}
          setView={setView}
          counts={counts}
          onAddGame={() => setShowAddModal(true)}
          onImportSteam={handleImportSteam}
          onDeleteAll={handleDeleteAllGames}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
        {view === 'stats' ? (
          <StatsPage games={games} />
        ) : (
          <GameGrid
            games={filtered}
            loading={loading}
            search={search}
            setSearch={setSearch}
            onSelect={setSelectedGame}
            selectMode={selectMode}
            selectedIds={selectedIds}
            onToggleSelectMode={toggleSelectMode}
            onToggleSelectGame={toggleSelectGame}
            onBulkStatusChange={handleBulkStatusChange}
            onBulkDelete={handleBulkDelete}
            onClearSelection={clearSelection}
          />
        )}
      </div>

      {showAddModal && (
        <AddGameModal
          onAdd={handleAddGame}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {selectedGame && (
        <GameDetailModal
          game={selectedGame}
          onUpdate={handleUpdateGame}
          onDelete={handleDeleteGame}
          onClose={() => setSelectedGame(null)}
        />
      )}
    </div>
  );
}

// Mock data for browser development (when Electron isn't running)
const MOCK_GAMES = [
  { id: 1, title: 'Elden Ring', platform: 'PC', status: 'finished', hltb_main: 3360, hltb_extra: 7200, hltb_complete: 10800, cover_url: null, personal_rating: 10, notes: 'GOTY' },
  { id: 2, title: 'Hollow Knight', platform: 'PC', status: 'playing', hltb_main: 2520, hltb_extra: 4800, hltb_complete: 6600, cover_url: null, personal_rating: null, notes: '' },
  { id: 3, title: 'Cyberpunk 2077', platform: 'PS5', status: 'backlog', hltb_main: 1560, hltb_extra: 5400, hltb_complete: 9000, cover_url: null, personal_rating: null, notes: '' },
  { id: 4, title: 'Hades', platform: 'PC', status: 'want_again', hltb_main: 1200, hltb_extra: 3600, hltb_complete: 7200, cover_url: null, personal_rating: 9, notes: 'Perfect roguelike' },
];

import { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import GameGrid from './components/GameGrid';
import StatsPage from './components/StatsPage';
import SettingsPage from './components/SettingsPage';
import LoginPage from './components/LoginPage';
import ResetPasswordPage from './components/ResetPasswordPage';
import AddGameModal from './components/AddGameModal';
import GameDetailModal from './components/GameDetailModal';
import SteamImportModal from './components/SteamImportModal';
import ChangePasswordModal from './components/ChangePasswordModal';
import Toast from './components/Toast';
import ConfirmDialog from './components/ConfirmDialog';
import TitleBar from './components/TitleBar';
import './App.css';
import { importSteamLibrary, enrichWithHLTB } from './api/steam';
import { applyColorScheme } from './theme';

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
  const [showSteamModal, setShowSteamModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedGame, setSelectedGame] = useState(null);
  const [loading, setLoading] = useState(true);
  // undefined = still checking for an existing session, null = logged out,
  // an object = logged in (holds the Supabase session, including user.email)
  const [session, setSession] = useState(undefined);
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const [mainColor, setMainColor] = useState(() => localStorage.getItem('mainColor') || 'neutral');
  const [accentColor, setAccentColor] = useState(() => localStorage.getItem('accentColor') || 'orange');
  const [toast, setToast] = useState(null);
  const [confirmState, setConfirmState] = useState(null);

  function showToast(message, type = 'success') {
    setToast({ message, type });
  }

  function askConfirm(message, onConfirm, { danger = true } = {}) {
    setConfirmState({ message, onConfirm, danger });
  }

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    applyColorScheme(theme, mainColor, accentColor);
    localStorage.setItem('mainColor', mainColor);
    localStorage.setItem('accentColor', accentColor);
  }, [theme, mainColor, accentColor]);

  function toggleTheme() {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  }

  // Check for an existing (or newly-changing) Supabase session. In a plain
  // browser preview without Electron there's no auth to check — fall back to
  // an always-authed dev session so MOCK_GAMES still renders as before.
  useEffect(() => {
    if (!window.electronAPI) {
      setSession({ user: { email: 'preview' } });
      return;
    }
    window.electronAPI.getSession().then(s => setSession(s ?? null));
    const unsubAuth = window.electronAPI.onAuthChange((s, event) => {
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true);
      setSession(s ?? null);
    });
    // The reliable signal — see main.js's handleAuthDeepLink. Supabase's own
    // PASSWORD_RECOVERY event only fires from its browser-URL detection,
    // which is off here (there's no URL bar in Electron).
    const unsubRecovery = window.electronAPI.onPasswordRecovery(() => setPasswordRecovery(true));
    return () => { unsubAuth(); unsubRecovery(); };
  }, []);

  // Load the games library once we know who's logged in, and always land on
  // the games view for a fresh login — but not on every session update, since
  // a background token refresh also produces a "new" session object and
  // shouldn't yank the user off whatever page they're on.
  const wasLoggedInRef = useRef(false);
  useEffect(() => {
    if (session) {
      loadGames();
      if (!wasLoggedInRef.current) setView('games');
    }
    wasLoggedInRef.current = !!session;
  }, [session]);

  async function handleSignOut() {
    try {
      if (window.electronAPI) await window.electronAPI.signOut();
    } catch (err) {
      console.error('Sign out failed:', err);
    } finally {
      setGames([]);
      setSession(null);
    }
  }

  function handleDeleteAccount() {
    askConfirm(
      `Permanently delete your account and all ${games.length} game${games.length !== 1 ? 's' : ''}? This cannot be undone.`,
      async () => {
        try {
          if (window.electronAPI) await window.electronAPI.deleteAccount();
          setGames([]);
          setSession(null);
        } catch (err) {
          console.error('Delete account failed:', err);
          showToast('Failed to delete your account. Please try again.', 'error');
        }
      }
    );
  }

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

  async function addGameNow(game) {
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
      showToast('Failed to add the game. Please try again.', 'error');
    }
  }

  function handleAddGame(game) {
    const isDuplicate = games.some(g => g.title.toLowerCase() === game.title.toLowerCase());
    if (isDuplicate) {
      askConfirm(`"${game.title}" is already in your vault. Add it anyway?`, () => addGameNow(game), { danger: false });
    } else {
      addGameNow(game);
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

  function handleDeleteGame(id) {
    askConfirm('Remove this game?', async () => {
      try {
        if (window.electronAPI) await window.electronAPI.deleteGame(id);
        setGames(prev => prev.filter(g => g.id !== id));
        setSelectedGame(null);
      } catch (err) {
        console.error('Failed to delete game:', err);
        showToast('Failed to delete the game. Please try again.', 'error');
      }
    });
  }

  async function runSteamImport(newGames) {
    setLoading(true);
    try {
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
      showToast(`Imported ${saved.length} games from Steam!`);
    } catch (err) {
      console.error('Steam import failed:', err);
      showToast('Steam import failed. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleImportSteam(apiKey, steamId) {
    try {
      const steamGames = await importSteamLibrary(apiKey, steamId);
      const existingTitles = new Set(games.map(g => g.title.toLowerCase()));
      const newGames = steamGames.filter(g => !existingTitles.has(g.title.toLowerCase()));

      if (newGames.length === 0) {
        showToast('No new games to import — everything is already in your vault!');
        return;
      }

      askConfirm(
        `Import ${newGames.length} new games from Steam? (${steamGames.length - newGames.length} already in vault)\n\nThis also looks up completion times, so it may take a bit for a large batch.`,
        () => runSteamImport(newGames),
        { danger: false }
      );
    } catch (err) {
      console.error('Steam import failed:', err);
      showToast('Steam import failed. Please try again.', 'error');
    }
  }

  function handleDeleteAllGames() {
    if (games.length === 0) return;
    askConfirm(`Delete all ${games.length} games? This cannot be undone.`, async () => {
      try {
        if (window.electronAPI) await window.electronAPI.deleteAllGames();
        setGames([]);
        setSelectedGame(null);
      } catch (err) {
        console.error('Failed to delete all games:', err);
        showToast('Failed to delete your games. Please try again.', 'error');
      }
    });
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
      showToast('Failed to update the selected games. Please try again.', 'error');
    }
  }

  function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    askConfirm(`Delete ${selectedIds.size} selected game${selectedIds.size !== 1 ? 's' : ''}? This cannot be undone.`, async () => {
      try {
        if (window.electronAPI) await window.electronAPI.deleteGames([...selectedIds]);
        setGames(prev => prev.filter(g => !selectedIds.has(g.id)));
        clearSelection();
      } catch (err) {
        console.error('Failed to delete selected games:', err);
        showToast('Failed to delete the selected games. Please try again.', 'error');
      }
    });
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

  if (passwordRecovery) {
    return (
      <div className="app">
        <TitleBar />
        <div className="app-body">
          <ResetPasswordPage onDone={() => setPasswordRecovery(false)} />
        </div>
      </div>
    );
  }

  if (session === undefined) {
    return (
      <div className="app">
        <TitleBar />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="app">
        <TitleBar />
        <div className="app-body">
          <LoginPage onAuthed={setSession} />
        </div>
      </div>
    );
  }

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
        />
        {view === 'stats' ? (
          <StatsPage games={games} />
        ) : view === 'settings' ? (
          <SettingsPage
            theme={theme}
            onToggleTheme={toggleTheme}
            mainColor={mainColor}
            setMainColor={setMainColor}
            accentColor={accentColor}
            setAccentColor={setAccentColor}
            onImportSteam={() => setShowSteamModal(true)}
            onChangePassword={() => setShowPasswordModal(true)}
            onDeleteAll={handleDeleteAllGames}
            gameCount={games.length}
            userEmail={session.user?.email}
            onSignOut={handleSignOut}
            onDeleteAccount={handleDeleteAccount}
          />
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

      {showSteamModal && (
        <SteamImportModal
          onImport={handleImportSteam}
          onClose={() => setShowSteamModal(false)}
        />
      )}

      {showPasswordModal && (
        <ChangePasswordModal onClose={() => setShowPasswordModal(false)} showToast={showToast} />
      )}

      {selectedGame && (
        <GameDetailModal
          game={selectedGame}
          onUpdate={handleUpdateGame}
          onDelete={handleDeleteGame}
          onClose={() => setSelectedGame(null)}
        />
      )}

      <Toast toast={toast} onClose={() => setToast(null)} />
      <ConfirmDialog state={confirmState} onClose={() => setConfirmState(null)} />
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

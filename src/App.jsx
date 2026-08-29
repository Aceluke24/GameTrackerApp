import { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import GameGrid from './components/GameGrid';
import StatsPage from './components/StatsPage';
import SettingsPage from './components/SettingsPage';
import LoginPage from './components/LoginPage';
import ResetPasswordPage from './components/ResetPasswordPage';
import AddGameModal from './components/AddGameModal';
import BulkAddModal from './components/BulkAddModal';
import BulkResultsModal from './components/BulkResultsModal';
import GameDetailModal from './components/GameDetailModal';
import SteamImportModal from './components/SteamImportModal';
import ChangePasswordModal from './components/ChangePasswordModal';
import Toast from './components/Toast';
import ConfirmDialog from './components/ConfirmDialog';
import TitleBar from './components/TitleBar';
import OfflineBanner from './components/OfflineBanner';
import './App.css';
import { importSteamLibrary, enrichWithHLTB } from './api/steam';
import { gamesToCSV, gamesToJSON, saveExportFile } from './api/export';
import { applyColorScheme } from './theme';
import { describeError, onNetworkTrouble, onSessionExpired } from './api/errors';
import { filterAndSortGames } from './utils/filterGames';
import useOnlineStatus from './hooks/useOnlineStatus';

// Matches IGDB's genre taxonomy so manually picked genres line up with
// whatever IGDB search/import already writes into the genres column.
export const GENRES = [
  'Adventure', 'Arcade', 'Card & Board Game', 'Fighting',
  "Hack and slash/Beat 'em up", 'Indie', 'MOBA', 'Music', 'Pinball',
  'Platform', 'Point-and-click', 'Puzzle', 'Quiz/Trivia', 'Racing',
  'Real Time Strategy (RTS)', 'Role-playing (RPG)', 'Shooter', 'Simulator',
  'Sport', 'Strategy', 'Tactical', 'Turn-based strategy (TBS)', 'Visual Novel',
];

export const SORT_OPTIONS = [
  { key: 'title_asc', label: 'Title (A–Z)' },
  { key: 'title_desc', label: 'Title (Z–A)' },
  { key: 'time_asc', label: 'Time to Beat (Short–Long)' },
  { key: 'time_desc', label: 'Time to Beat (Long–Short)' },
  { key: 'date_added_desc', label: 'Recently Added' },
];

// 12 fixed slots (label + emoji editable per user, see SettingsPage's status
// editor). `key` is what actually gets written to games.status and never
// changes after this seed — only the display label/emoji do — so renaming a
// status is a pure display change, never a data migration. `backlog` is the
// one key that's guaranteed to always exist: it's the fallback a slot's
// games get reassigned to when that slot is cleared, and it can't itself be
// cleared. The 5 trailing slots start blank for users to fill in themselves.
export const DEFAULT_STATUSES = [
  { key: 'backlog',      label: 'Backlog',      emoji: '📦' },
  { key: 'playing',      label: 'Playing',       emoji: '🎮' },
  { key: 'live_service', label: 'Live Service',  emoji: '♾️' },
  { key: 'finished',     label: 'Finished',      emoji: '✅' },
  { key: 'want_again',   label: 'Play Again',    emoji: '🔁' },
  { key: 'abandoned',    label: 'Abandoned',     emoji: '💀' },
  { key: 'wishlist',     label: 'Wishlist',      emoji: '⭐' },
  { key: 'custom_1',     label: '',              emoji: '' },
  { key: 'custom_2',     label: '',              emoji: '' },
  { key: 'custom_3',     label: '',              emoji: '' },
  { key: 'custom_4',     label: '',              emoji: '' },
  { key: 'custom_5',     label: '',              emoji: '' },
];

// The one slot that can never be cleared — every game's status falls back
// to it when its own slot is removed, so it must always exist.
export const LOCKED_STATUS_KEY = 'backlog';

export default function App() {
  const [games, setGames] = useState([]);
  const [statuses, setStatuses] = useState(DEFAULT_STATUSES);
  const [filter, setFilter] = useState('all');
  const [view, setView] = useState('games');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState(() => localStorage.getItem('sort') || 'title_asc');
  // null = no filter, otherwise { mode: 'under' | 'over', hours: number }
  const [timeFilter, setTimeFilter] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkAddModal, setShowBulkAddModal] = useState(false);
  const [bulkResults, setBulkResults] = useState(null);
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

  // `online` is the OS-level "wifi is off" signal (free, instant).
  // `apiOffline` covers the case that can't see — wifi's fine but
  // Supabase/IGDB itself is unreachable — by lighting up on any call
  // anywhere in the app that describeError classifies as network-caused,
  // then self-clearing after a short cooldown if nothing re-triggers it.
  const online = useOnlineStatus();
  const [apiOffline, setApiOffline] = useState(false);
  const apiOfflineTimer = useRef(null);
  useEffect(() => onNetworkTrouble(() => {
    setApiOffline(true);
    clearTimeout(apiOfflineTimer.current);
    apiOfflineTimer.current = setTimeout(() => setApiOffline(false), 20000);
  }), []);

  // The main process already tries a silent token refresh before surfacing
  // an auth failure (see electron/database.js) — reaching here means that
  // couldn't save the session, so send the user to the login screen rather
  // than leave them on a half-broken library.
  useEffect(() => onSessionExpired(() => {
    setGames([]);
    setStatuses(DEFAULT_STATUSES);
    setSession(null);
    window.electronAPI?.signOut().catch(() => {});
    showToast('Your session expired — please sign in again.', 'error');
  }), []);
  const isOffline = !online || apiOffline;
  const wasOnlineRef = useRef(online);
  useEffect(() => {
    if (online && !wasOnlineRef.current) showToast('Back online.');
    wasOnlineRef.current = online;
  }, [online]);

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

  useEffect(() => {
    localStorage.setItem('sort', sort);
  }, [sort]);

  // Check for an existing (or newly-changing) Supabase session. In a plain
  // browser preview without Electron there's no auth to check — fall back to
  // an always-authed dev session so MOCK_GAMES still renders as before.
  useEffect(() => {
    if (!window.electronAPI) {
      setSession({ user: { email: 'preview' } });
      return;
    }
    function checkSession() {
      window.electronAPI.getSession()
        .then(s => setSession(s ?? null))
        .catch(err => {
          // Unhandled here, session would stay `undefined` forever — the
          // app's own render logic shows nothing but the TitleBar for that
          // state, a permanent blank screen with no way out. Fail safe to
          // the login screen instead; a network failure gets picked up by
          // the retry below once connectivity actually returns.
          console.error('Failed to check session:', err);
          describeError(err);
          setSession(null);
        });
    }
    checkSession();
    // Self-heals the common case: the check above failed because the app
    // launched offline. Re-checking on every reconnect (rather than only
    // when the earlier check failed) avoids a stale-closure trap here and
    // costs nothing extra — getSession() just reads local storage unless a
    // token refresh is actually due.
    window.addEventListener('online', checkSession);
    const unsubAuth = window.electronAPI.onAuthChange((s, event) => {
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true);
      setSession(s ?? null);
    });
    // The reliable signal — see main.js's handleAuthDeepLink. Supabase's own
    // PASSWORD_RECOVERY event only fires from its browser-URL detection,
    // which is off here (there's no URL bar in Electron).
    const unsubRecovery = window.electronAPI.onPasswordRecovery(() => setPasswordRecovery(true));
    return () => { unsubAuth(); unsubRecovery(); window.removeEventListener('online', checkSession); };
  }, []);

  // Load the games library once we know who's logged in, and always land on
  // the games view for a fresh login — but not on every session update, since
  // a background token refresh also produces a "new" session object and
  // shouldn't yank the user off whatever page they're on.
  const wasLoggedInRef = useRef(false);
  useEffect(() => {
    if (session) {
      loadGames();
      loadStatuses();
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
      setStatuses(DEFAULT_STATUSES);
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
          setStatuses(DEFAULT_STATUSES);
          setSession(null);
        } catch (err) {
          console.error('Delete account failed:', err);
          showToast(describeError(err, 'Failed to delete your account.').message, 'error');
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
      showToast(describeError(err, 'Failed to load your library.').message, 'error');
    }
    setLoading(false);
  }

  async function loadStatuses() {
    try {
      if (window.electronAPI) {
        const saved = await window.electronAPI.getUserStatuses();
        setStatuses(saved ?? DEFAULT_STATUSES);
      }
    } catch (err) {
      console.error('Failed to load statuses:', err);
      showToast(describeError(err, 'Failed to load your custom statuses.').message, 'error');
    }
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
      showToast(describeError(err, 'Failed to add the game.').message, 'error');
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

  function handleBulkAdd(addedGames, meta) {
    setGames(prev => [...prev, ...addedGames]);
    setShowBulkAddModal(false);
    setBulkResults({ title: 'Bulk Add Results', added: addedGames.map(g => g.title), ...meta });
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
      showToast(describeError(err, 'Failed to save your changes.').message, 'error');
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
        showToast(describeError(err, 'Failed to delete the game.').message, 'error');
      }
    });
  }

  async function runSteamImport(newGames, skippedExisting) {
    setLoading(true);
    try {
      const enrichedGames = await enrichWithHLTB(newGames);

      const saved = [];
      const failed = [];
      for (const game of enrichedGames) {
        try {
          if (window.electronAPI) {
            const s = await window.electronAPI.addGame(game);
            saved.push(s);
          } else {
            saved.push({ id: Date.now() + Math.random(), ...game });
          }
        } catch (err) {
          failed.push({ title: game.title, reason: describeError(err).message });
        }
      }

      setGames(prev => [...prev, ...saved]);
      setBulkResults({
        title: 'Steam Import Results',
        added: saved.map(g => g.title),
        skippedDuplicateExisting: skippedExisting,
        failed,
      });
    } catch (err) {
      console.error('Steam import failed:', err);
      showToast(describeError(err, 'Steam import failed.').message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleImportSteam(apiKey, steamId) {
    try {
      const steamGames = await importSteamLibrary(apiKey, steamId);
      const existingTitles = new Set(games.map(g => g.title.toLowerCase()));
      const newGames = steamGames.filter(g => !existingTitles.has(g.title.toLowerCase()));
      const skippedExisting = steamGames.filter(g => existingTitles.has(g.title.toLowerCase())).map(g => g.title);

      if (newGames.length === 0) {
        showToast('No new games to import — everything is already in your vault!');
        return;
      }

      askConfirm(
        `Import ${newGames.length} new games from Steam? (${skippedExisting.length} already in vault)\n\nThis also looks up completion times, so it may take a bit for a large batch.`,
        () => runSteamImport(newGames, skippedExisting),
        { danger: false }
      );
    } catch (err) {
      console.error('Steam import failed:', err);
      showToast(describeError(err, 'Steam import failed.').message, 'error');
    }
  }

  async function handleExportLibrary(format) {
    if (games.length === 0) {
      showToast('Your vault is empty — nothing to export.', 'error');
      return;
    }
    try {
      const content = format === 'csv' ? gamesToCSV(games) : gamesToJSON(games);
      const date = new Date().toISOString().slice(0, 10);
      const saved = await saveExportFile(content, `game-vault-export-${date}.${format}`);
      if (saved) showToast(`Exported ${games.length} games as ${format.toUpperCase()}.`);
    } catch (err) {
      console.error('Export failed:', err);
      showToast(describeError(err, 'Export failed.').message, 'error');
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
        showToast(describeError(err, 'Failed to delete your games.').message, 'error');
      }
    });
  }

  function handleToggleNextUp(game) {
    handleUpdateGame(game.id, { next_up: !game.next_up });
  }

  // Any slot that went from a real label to blank is being "removed" — its
  // games fall back to Backlog rather than being left pointing at a status
  // that no longer shows up anywhere in the UI.
  async function handleUpdateStatuses(newStatuses) {
    const removedKeys = statuses
      .filter(old => old.label && !newStatuses.find(s => s.key === old.key)?.label)
      .map(s => s.key);

    try {
      if (window.electronAPI) await window.electronAPI.setUserStatuses(newStatuses);
      setStatuses(newStatuses);

      if (removedKeys.length > 0) {
        const affectedIds = games.filter(g => removedKeys.includes(g.status)).map(g => g.id);
        if (affectedIds.length > 0) {
          if (window.electronAPI) await window.electronAPI.updateGamesStatus(affectedIds, LOCKED_STATUS_KEY);
          setGames(prev => prev.map(g => removedKeys.includes(g.status) ? { ...g, status: LOCKED_STATUS_KEY } : g));
        }
        if (removedKeys.includes(filter)) setFilter('all');
      }
      showToast('Statuses saved.');
    } catch (err) {
      console.error('Failed to update statuses:', err);
      showToast(describeError(err, 'Failed to save your statuses.').message, 'error');
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

  function handleSelectAll(ids) {
    setSelectedIds(new Set(ids));
  }

  async function handleBulkStatusChange(status) {
    if (selectedIds.size === 0 || !status) return;
    try {
      if (window.electronAPI) await window.electronAPI.updateGamesStatus([...selectedIds], status);
      setGames(prev => prev.map(g => selectedIds.has(g.id) ? { ...g, status } : g));
      clearSelection();
    } catch (err) {
      console.error('Failed to update selected games:', err);
      showToast(describeError(err, 'Failed to update the selected games.').message, 'error');
    }
  }

  async function handleBulkPlatformChange(platform) {
    const trimmed = platform?.trim();
    if (selectedIds.size === 0 || !trimmed) return;
    try {
      if (window.electronAPI) await window.electronAPI.updateGamesPlatform([...selectedIds], trimmed);
      setGames(prev => prev.map(g => selectedIds.has(g.id) ? { ...g, platform: trimmed } : g));
      clearSelection();
    } catch (err) {
      console.error('Failed to update selected games:', err);
      showToast(describeError(err, 'Failed to update the selected games.').message, 'error');
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
        showToast(describeError(err, 'Failed to delete the selected games.').message, 'error');
      }
    });
  }

  // Filter + search (see src/utils/filterGames.js)
  const filtered = filterAndSortGames(games, { filter, search, sort, timeFilter });

  // Blank slots don't show up anywhere outside the status editor itself.
  // Each status carries a CSS var keyed to its fixed slot position (not its
  // key/label, which the user can change freely) so status colors stay
  // stable across renames.
  const activeStatuses = statuses
    .map((s, i) => ({ ...s, color: `var(--status-color-${i + 1})` }))
    .filter(s => s.label);

  // Count per status for sidebar badges
  const counts = activeStatuses.reduce((acc, s) => {
    acc[s.key] = games.filter(g => g.status === s.key).length;
    return acc;
  }, { all: games.length });

  // Platforms already in the library, offered as autocomplete suggestions
  // anywhere a platform is typed in (Add Game, Bulk Add, bulk-select change).
  const knownPlatforms = [...new Set(games.map(g => g.platform).filter(Boolean))];

  if (passwordRecovery) {
    return (
      <div className="app">
        <TitleBar />
        <OfflineBanner show={isOffline} />
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
        <OfflineBanner show={isOffline} />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="app">
        <TitleBar />
        <OfflineBanner show={isOffline} />
        <div className="app-body">
          <LoginPage onAuthed={setSession} />
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <TitleBar />
      <OfflineBanner show={isOffline} />
      <div className="app-body">
        <Sidebar
          filter={filter}
          setFilter={setFilter}
          view={view}
          setView={setView}
          counts={counts}
          statuses={activeStatuses}
          allStatuses={statuses}
          onUpdateStatuses={handleUpdateStatuses}
          onAddGame={() => setShowAddModal(true)}
        />
        {view === 'stats' ? (
          <StatsPage games={games} statuses={activeStatuses} />
        ) : view === 'settings' ? (
          <SettingsPage
            theme={theme}
            onToggleTheme={toggleTheme}
            mainColor={mainColor}
            setMainColor={setMainColor}
            accentColor={accentColor}
            setAccentColor={setAccentColor}
            onImportSteam={() => setShowSteamModal(true)}
            onExportLibrary={handleExportLibrary}
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
            sort={sort}
            setSort={setSort}
            timeFilter={timeFilter}
            setTimeFilter={setTimeFilter}
            onSelect={setSelectedGame}
            onToggleNextUp={handleToggleNextUp}
            statuses={activeStatuses}
            selectMode={selectMode}
            selectedIds={selectedIds}
            onToggleSelectMode={toggleSelectMode}
            onToggleSelectGame={toggleSelectGame}
            onSelectAll={handleSelectAll}
            onBulkStatusChange={handleBulkStatusChange}
            onBulkPlatformChange={handleBulkPlatformChange}
            knownPlatforms={knownPlatforms}
            onBulkDelete={handleBulkDelete}
            onClearSelection={clearSelection}
          />
        )}
      </div>

      {showAddModal && (
        <AddGameModal
          statuses={activeStatuses}
          knownPlatforms={knownPlatforms}
          onAdd={handleAddGame}
          onClose={() => setShowAddModal(false)}
          onSwitchToBulk={() => { setShowAddModal(false); setShowBulkAddModal(true); }}
          onSwitchToSteam={() => { setShowAddModal(false); setShowSteamModal(true); }}
        />
      )}

      {showBulkAddModal && (
        <BulkAddModal
          knownPlatforms={knownPlatforms}
          existingGames={games}
          onBulkAdd={handleBulkAdd}
          onClose={() => setShowBulkAddModal(false)}
        />
      )}

      {bulkResults && (
        <BulkResultsModal results={bulkResults} onClose={() => setBulkResults(null)} />
      )}

      {showSteamModal && (
        <SteamImportModal
          onImport={handleImportSteam}
          onClose={() => setShowSteamModal(false)}
          showToast={showToast}
        />
      )}

      {showPasswordModal && (
        <ChangePasswordModal onClose={() => setShowPasswordModal(false)} showToast={showToast} />
      )}

      {selectedGame && (
        <GameDetailModal
          game={selectedGame}
          statuses={activeStatuses}
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

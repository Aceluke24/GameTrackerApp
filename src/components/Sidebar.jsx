import { STATUSES } from '../App';
import './Sidebar.css';

export default function Sidebar({ filter, setFilter, view, setView, counts, onAddGame, onImportSteam, onDeleteAll, theme, onToggleTheme }) {
  function selectFilter(key) {
    setFilter(key);
    setView('games');
  }

  return (
    <aside className="sidebar">
      <button className="add-btn" onClick={onAddGame}>
        <span>＋</span> Add Game
      </button>
      <button className="import-btn" onClick={onImportSteam}>
        <span>🎮</span> Import Steam
      </button>
      <nav className="sidebar-nav">
        <button className={`nav-item ${view === 'games' && filter === 'all' ? 'active' : ''}`} onClick={() => selectFilter('all')}>
          <span className="nav-emoji">🎲</span>
          <span className="nav-label">All Games</span>
          <span className="nav-count">{counts.all}</span>
        </button>
        <button className={`nav-item ${view === 'stats' ? 'active' : ''}`} onClick={() => setView('stats')}>
          <span className="nav-emoji">📊</span>
          <span className="nav-label">Stats</span>
        </button>
        <div className="nav-divider">Status</div>
        {STATUSES.map(s => (
          <button key={s.key} className={`nav-item ${view === 'games' && filter === s.key ? 'active' : ''}`} onClick={() => selectFilter(s.key)} data-status={s.key}>
            <span className="nav-emoji">{s.emoji}</span>
            <span className="nav-label">{s.label}</span>
            <span className="nav-count">{counts[s.key] ?? 0}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        <span className="mono" style={{ fontSize: '11px', color: 'var(--muted)' }}>{counts.all} games tracked</span>
        <button className="theme-toggle-btn" onClick={onToggleTheme}>
          {theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode'}
        </button>
        <button className="delete-all-btn" onClick={onDeleteAll}>Delete All Games</button>
      </div>
    </aside>
  );
}

import { useState } from 'react';
import { formatTime } from '../api/igdb';
import { getSteamCoverFallback } from '../api/steam';
import { STATUSES } from '../App';
import './GameGrid.css';

export default function GameGrid({
  games, loading, search, setSearch, onSelect,
  selectMode, selectedIds, onToggleSelectMode, onToggleSelectGame, onBulkStatusChange, onBulkDelete, onClearSelection,
}) {
  if (loading) return <div className="grid-empty"><div className="spinner" /></div>;
  return (
    <main className="game-grid-container">
      <div className="grid-header">
        <div className="search-bar">
          <span className="search-icon">⌕</span>
          <input type="text" placeholder="Search title, platform, or genre..." value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button className="search-clear" onClick={() => setSearch('')}>✕</button>}
        </div>
        <span className="grid-count">{games.length} game{games.length !== 1 ? 's' : ''}</span>
        <button className={`select-mode-btn ${selectMode ? 'active' : ''}`} onClick={onToggleSelectMode}>
          {selectMode ? 'Cancel' : 'Select'}
        </button>
      </div>
      {games.length === 0 ? (
        <div className="grid-empty">
          <div className="empty-icon">◈</div>
          <p>No games here yet.</p>
          <p className="empty-sub">Add some games to your vault!</p>
        </div>
      ) : (
        <div className="game-grid">
          {games.map(game => (
            <GameCard
              key={game.id}
              game={game}
              onSelect={onSelect}
              selectMode={selectMode}
              selected={selectedIds?.has(game.id)}
              onToggleSelectGame={onToggleSelectGame}
            />
          ))}
        </div>
      )}
      {selectMode && selectedIds?.size > 0 && (
        <div className="bulk-bar">
          <span className="bulk-count">{selectedIds.size} selected</span>
          <select
            className="bulk-status-select"
            value=""
            onChange={e => onBulkStatusChange(e.target.value)}
          >
            <option value="" disabled>Set status…</option>
            {STATUSES.map(s => (
              <option key={s.key} value={s.key}>{s.emoji} {s.label}</option>
            ))}
          </select>
          <button className="bulk-delete-btn" onClick={onBulkDelete}>Delete</button>
          <button className="bulk-clear-btn" onClick={onClearSelection}>Clear</button>
        </div>
      )}
    </main>
  );
}

function GameCard({ game, onSelect, selectMode, selected, onToggleSelectGame }) {
  const status = STATUSES.find(s => s.key === game.status);
  const [coverSrc, setCoverSrc] = useState(game.cover_url);

  function handleClick() {
    if (selectMode) onToggleSelectGame(game.id);
    else onSelect(game);
  }

  return (
    <div className={`game-card ${selectMode ? 'selectable' : ''} ${selected ? 'selected' : ''}`} onClick={handleClick}>
      <div className="card-cover">
        {selectMode && (
          <div className="card-checkbox">
            <input type="checkbox" checked={!!selected} readOnly />
          </div>
        )}
        {coverSrc
          ? <img
              src={coverSrc}
              alt={game.title}
              onError={() => setCoverSrc(prev => getSteamCoverFallback(prev) || null)}
            />
          : <div className="cover-placeholder"><span>{game.title[0]}</span></div>
        }
        <div className="card-status-badge">{status?.emoji} {status?.label}</div>
      </div>
      <div className="card-info">
        <h3 className="card-title">{game.title}</h3>
        <p className="card-platform">{game.platform || 'Unknown platform'}</p>
        {game.genres && (
          <div className="card-genres">
            {game.genres.split(',').slice(0, 2).map(genre => (
              <span key={genre} className="genre-tag">{genre.trim()}</span>
            ))}
          </div>
        )}
        {game.hltb_main > 0 && (
          <div className="card-times">
            <span>🗡 {formatTime(game.hltb_main)}</span>
            {game.hltb_extra > 0 && <span>🗺 {formatTime(game.hltb_extra)}</span>}
          </div>
        )}
        {game.personal_rating && (
          <div className="card-rating">
            {'★'.repeat(Math.round(game.personal_rating / 2))}
            <span className="mono" style={{ fontSize: '11px', marginLeft: 4 }}>{game.personal_rating}/10</span>
          </div>
        )}
      </div>
    </div>
  );
}

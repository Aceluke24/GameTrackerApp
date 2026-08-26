import { useState, useRef, useEffect } from 'react';
import { formatTime } from '../api/igdb';
import { getSteamCoverFallback } from '../api/steam';
import { SORT_OPTIONS } from '../App';
import './GameGrid.css';

export default function GameGrid({
  games, loading, search, setSearch, sort, setSort, timeFilter, setTimeFilter, onSelect, onToggleNextUp, statuses,
  selectMode, selectedIds, onToggleSelectMode, onToggleSelectGame, onSelectAll, onBulkStatusChange, onBulkPlatformChange, knownPlatforms, onBulkDelete, onClearSelection,
}) {
  const [platformInput, setPlatformInput] = useState('');

  function applyPlatform() {
    if (!platformInput.trim()) return;
    onBulkPlatformChange(platformInput);
    setPlatformInput('');
  }

  if (loading) return <div className="grid-empty"><div className="spinner" /></div>;
  return (
    <main className="game-grid-container">
      <div className="grid-header">
        <div className="search-bar">
          <span className="search-icon">⌕</span>
          <input type="text" placeholder="Search title, platform, or genre..." value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button className="search-clear" onClick={() => setSearch('')}>✕</button>}
        </div>
        <select className="sort-select" value={sort} onChange={e => setSort(e.target.value)} aria-label="Sort games">
          {SORT_OPTIONS.map(o => (
            <option key={o.key} value={o.key}>{o.label}</option>
          ))}
        </select>
        <TimeFilterControl timeFilter={timeFilter} setTimeFilter={setTimeFilter} />
        <span className="grid-count">{games.length} game{games.length !== 1 ? 's' : ''}</span>
        <button className={`select-mode-btn ${selectMode ? 'active' : ''}`} onClick={onToggleSelectMode}>
          {selectMode ? 'Cancel' : 'Select'}
        </button>
        {selectMode && games.length > 0 && (
          <button className="select-mode-btn" onClick={() => onSelectAll(games.map(g => g.id))}>
            Select All
          </button>
        )}
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
              statuses={statuses}
              onSelect={onSelect}
              onToggleNextUp={onToggleNextUp}
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
            {statuses.map(s => (
              <option key={s.key} value={s.key}>{s.emoji} {s.label}</option>
            ))}
          </select>
          <div className="bulk-platform-group">
            <input
              className="bulk-platform-input"
              list="bulk-platform-list"
              placeholder="Set platform…"
              value={platformInput}
              onChange={e => setPlatformInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && applyPlatform()}
            />
            <datalist id="bulk-platform-list">
              {knownPlatforms.map(p => <option key={p} value={p} />)}
            </datalist>
            <button className="bulk-platform-btn" onClick={applyPlatform} disabled={!platformInput.trim()}>Set</button>
          </div>
          <button className="bulk-delete-btn" onClick={onBulkDelete}>Delete</button>
          <button className="bulk-clear-btn" onClick={onClearSelection}>Clear</button>
        </div>
      )}
    </main>
  );
}

function GameCard({ game, statuses, onSelect, onToggleNextUp, selectMode, selected, onToggleSelectGame }) {
  const status = statuses.find(s => s.key === game.status);
  const [coverSrc, setCoverSrc] = useState(game.cover_url);

  function handleClick() {
    if (selectMode) onToggleSelectGame(game.id);
    else onSelect(game);
  }

  function handlePinClick(e) {
    e.stopPropagation();
    onToggleNextUp(game);
  }

  return (
    <div className={`game-card ${selectMode ? 'selectable' : ''} ${selected ? 'selected' : ''} ${game.next_up ? 'next-up' : ''}`} onClick={handleClick}>
      <div className="card-cover">
        {selectMode ? (
          <div className="card-checkbox">
            <input type="checkbox" checked={!!selected} readOnly />
          </div>
        ) : (
          <button
            className={`card-pin ${game.next_up ? 'active' : ''}`}
            onClick={handlePinClick}
            title={game.next_up ? 'Remove from Next Up' : 'Mark as Next Up'}
          >
            🔥
          </button>
        )}
        {coverSrc
          ? <img
              src={coverSrc}
              alt={game.title}
              onError={() => setCoverSrc(prev => getSteamCoverFallback(prev) || null)}
            />
          : <div className="cover-placeholder"><span>{game.title[0]}</span></div>
        }
        {game.next_up && <div className="card-nextup-badge">🔥 Next Up</div>}
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

function TimeFilterControl({ timeFilter, setTimeFilter }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState(timeFilter?.mode || 'under');
  const [hours, setHours] = useState(timeFilter?.hours ?? '');
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function openPopover() {
    setMode(timeFilter?.mode || 'under');
    setHours(timeFilter?.hours ?? '');
    setOpen(o => !o);
  }

  function handleApply(e) {
    e.preventDefault();
    const h = Number(hours);
    if (!hours || h <= 0) return;
    setTimeFilter({ mode, hours: h });
    setOpen(false);
  }

  function handleClear() {
    setTimeFilter(null);
    setOpen(false);
  }

  return (
    <div className="time-filter" ref={ref}>
      <button className={`time-filter-btn ${timeFilter ? 'active' : ''}`} onClick={openPopover}>
        🗡 {timeFilter ? `${timeFilter.mode === 'under' ? 'Under' : 'Over'} ${timeFilter.hours}h` : 'Time'}
      </button>
      {timeFilter && <button className="search-clear" onClick={handleClear} title="Clear time filter">✕</button>}
      {open && (
        <form className="time-filter-popover" onSubmit={handleApply}>
          <div className="time-filter-mode">
            <button type="button" className={mode === 'under' ? 'active' : ''} onClick={() => setMode('under')}>Less than</button>
            <button type="button" className={mode === 'over' ? 'active' : ''} onClick={() => setMode('over')}>More than</button>
          </div>
          <div className="time-filter-input">
            <input
              type="number"
              min="1"
              placeholder="Hours"
              value={hours}
              onChange={e => setHours(e.target.value)}
              autoFocus
            />
            <span>hours</span>
          </div>
          <button type="submit" className="time-filter-apply">Apply</button>
        </form>
      )}
    </div>
  );
}

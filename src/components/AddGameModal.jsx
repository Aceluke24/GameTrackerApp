import { useState } from 'react';
import { searchIGDB, formatTime } from '../api/igdb';
import { describeError } from '../api/errors';
import './Modal.css';

export default function AddGameModal({ statuses, onAdd, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(null);
  const [status, setStatus] = useState('backlog');
  const [platform, setPlatform] = useState('');
  const [error, setError] = useState('');

  async function handleSearch() {
    if (!query.trim()) return;
    setSearching(true); setError(''); setResults([]); setSelected(null);
    try {
      const data = await searchIGDB(query);
      setResults(data);
      if (data.length === 0) setError('No games found. Try a different search.');
    } catch (err) {
      const { offline, message } = describeError(err);
      setError(offline
        ? 'Couldn’t reach IGDB — check your internet connection, or add the game manually below.'
        : `${message} You can also add the game manually below.`);
    }
    setSearching(false);
  }

  function handleSelect(game) { setSelected(game); setPlatform(game.platform ?? ''); }

  function handleManualAdd() {
    onAdd({ title: query, platform: platform || 'Unknown', cover_url: null, igdb_id: null, hltb_main: null, hltb_extra: null, hltb_complete: null, hltb_confidence: null, status, personal_rating: null, notes: '', source: 'manual' });
  }

  function handleAddSelected() {
    onAdd({ ...selected, platform: platform || selected.platform, status, personal_rating: null, notes: '', source: 'manual' });
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>Add Game to Vault</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="field-row">
            <input className="field-input" placeholder="Search for a game..." value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} autoFocus />
            <button className="btn-primary" onClick={handleSearch} disabled={searching}>{searching ? '...' : 'Search'}</button>
          </div>
          {error && <p className="field-error">{error}</p>}
          {results.length > 0 && !selected && (
            <div className="search-results">
              {results.map(g => (
                <div key={g.igdb_id} className="result-row" onClick={() => handleSelect(g)}>
                  {g.cover_url ? <img src={g.cover_url} alt={g.title} className="result-cover" /> : <div className="result-cover result-cover-placeholder">{g.title[0]}</div>}
                  <div className="result-info">
                    <span className="result-title">{g.title}</span>
                    <span className="result-platform">{g.platform}</span>
                    {g.hltb_main > 0 && <span className="result-time">⏱ {formatTime(g.hltb_main)} main story</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="add-form">
            {selected && (
              <div className="selected-game">
                {selected.cover_url && <img src={selected.cover_url} alt={selected.title} className="selected-cover" />}
                <div>
                  <p className="selected-title">{selected.title}</p>
                  {selected.hltb_main > 0 && (
                    <p className="selected-times">
                      Main: {formatTime(selected.hltb_main)} · Extras: {formatTime(selected.hltb_extra)} · 100%: {formatTime(selected.hltb_complete)}
                      {selected.hltb_confidence != null && ` · ${selected.hltb_confidence}% confidence`}
                    </p>
                  )}
                  <button className="btn-ghost" onClick={() => setSelected(null)}>← Change</button>
                </div>
              </div>
            )}
            <div className="form-row">
              <div className="form-field">
                <label>Platform</label>
                <input className="field-input" placeholder="PC, PS5, Xbox, Switch..." value={platform} onChange={e => setPlatform(e.target.value)} />
              </div>
              <div className="form-field">
                <label>Status</label>
                <select className="field-input field-select" value={status} onChange={e => setStatus(e.target.value)}>
                  {statuses.map(s => <option key={s.key} value={s.key}>{s.emoji} {s.label}</option>)}
                </select>
              </div>
            </div>
            <div className="form-actions">
              {selected
                ? <button className="btn-primary" onClick={handleAddSelected}>Add to Vault</button>
                : query.trim() && <button className="btn-ghost" onClick={handleManualAdd}>Add "{query}" manually</button>
              }
              <button className="btn-ghost" onClick={onClose}>Cancel</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

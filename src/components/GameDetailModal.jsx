import { useState } from 'react';
import { formatTime, refreshFromIGDB } from '../api/igdb';
import { getSteamCoverFallback } from '../api/steam';
import { STATUSES, GENRES } from '../App';
import './Modal.css';

const MANUAL_CONFIDENCE = -1;
const minutesToHours = minutes => (minutes ? String(Math.round((minutes / 60) * 10) / 10) : '');
const hoursToMinutes = hours => {
  const n = parseFloat(hours);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 60) : null;
};

export default function GameDetailModal({ game, onUpdate, onDelete, onClose }) {
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState(game.status);
  const [rating, setRating] = useState(game.personal_rating ?? '');
  const [notes, setNotes] = useState(game.notes ?? '');
  const [platform, setPlatform] = useState(game.platform ?? '');
  const [genres, setGenres] = useState(game.genres ? game.genres.split(',').map(g => g.trim()) : []);
  const [coverSrc, setCoverSrc] = useState(game.cover_url);
  const [hltbMain, setHltbMain] = useState(minutesToHours(game.hltb_main));
  const [hltbExtra, setHltbExtra] = useState(minutesToHours(game.hltb_extra));
  const [hltbComplete, setHltbComplete] = useState(minutesToHours(game.hltb_complete));
  // Tracked explicitly rather than inferred by diffing before/after minutes —
  // displaying minutes as hours rounds to 1 decimal place, so a round-trip
  // through the input can shift the value by a minute or two with no real
  // edit, which would falsely flag it as manual.
  const [confidence, setConfidence] = useState(game.hltb_confidence);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState('');

  function editHours(setter) {
    return e => {
      setter(e.target.value);
      setConfidence(MANUAL_CONFIDENCE);
    };
  }

  async function handleRefreshFromIGDB() {
    setRefreshing(true);
    setRefreshError('');
    try {
      const fresh = await refreshFromIGDB(game.title);
      if (!fresh) {
        setRefreshError('No IGDB match found for this title.');
        return;
      }
      setHltbMain(minutesToHours(fresh.hltb_main));
      setHltbExtra(minutesToHours(fresh.hltb_extra));
      setHltbComplete(minutesToHours(fresh.hltb_complete));
      setConfidence(fresh.hltb_confidence);
      onUpdate(game.id, fresh);
    } catch (err) {
      console.error('Refresh from IGDB failed:', err);
      setRefreshError('IGDB lookup failed — try again.');
    } finally {
      setRefreshing(false);
    }
  }

  function toggleGenre(genre) {
    setGenres(prev => prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]);
  }

  function handleSave() {
    onUpdate(game.id, {
      status, personal_rating: rating ? parseInt(rating) : null, notes, platform,
      genres: genres.length ? genres.join(', ') : null,
      hltb_main: hoursToMinutes(hltbMain),
      hltb_extra: hoursToMinutes(hltbExtra),
      hltb_complete: hoursToMinutes(hltbComplete),
      hltb_confidence: confidence,
    });
    setEditing(false);
  }

  const currentStatus = STATUSES.find(s => s.key === (editing ? status : game.status));

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-detail">
        <div className="modal-header">
          <h2>{game.title}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body detail-body">
          <div className="detail-cover">
            {coverSrc
              ? <img
                  src={coverSrc}
                  alt={game.title}
                  onError={() => setCoverSrc(prev => getSteamCoverFallback(prev) || null)}
                />
              : <div className="detail-cover-placeholder">{game.title[0]}</div>
            }
          </div>
          <div className="detail-info">
            <div className="detail-row">
              <span className="detail-label">Platform</span>
              {editing ? <input className="field-input field-sm" value={platform} onChange={e => setPlatform(e.target.value)} /> : <span className="detail-value">{game.platform || '—'}</span>}
            </div>
            <div className="detail-row detail-row-col">
              <span className="detail-label">Genres</span>
              {editing ? (
                <div className="genre-picker">
                  {GENRES.map(g => (
                    <button
                      type="button"
                      key={g}
                      className={`genre-chip ${genres.includes(g) ? 'selected' : ''}`}
                      onClick={() => toggleGenre(g)}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              ) : game.genres ? (
                <div className="card-genres">
                  {game.genres.split(',').map(g => <span key={g} className="genre-tag">{g.trim()}</span>)}
                </div>
              ) : (
                <span className="detail-value">—</span>
              )}
            </div>
            <div className="detail-row">
              <span className="detail-label">Status</span>
              {editing
                ? <select className="field-input field-select field-sm" value={status} onChange={e => setStatus(e.target.value)}>
                    {STATUSES.map(s => <option key={s.key} value={s.key}>{s.emoji} {s.label}</option>)}
                  </select>
                : <span className={`status-pill status-${game.status}`}>{currentStatus?.emoji} {currentStatus?.label}</span>
              }
            </div>
            {(editing || game.hltb_main > 0) && (
              <div className="detail-row">
                <span className="detail-label">Time to Beat</span>
                {editing ? (
                  <div>
                    <div className="time-grid">
                      <div className="time-cell">
                        <span className="time-label">Main (hrs)</span>
                        <input className="field-input field-sm time-input" type="number" min="0" step="0.5" placeholder="—" value={hltbMain} onChange={editHours(setHltbMain)} />
                      </div>
                      <div className="time-cell">
                        <span className="time-label">+Extras (hrs)</span>
                        <input className="field-input field-sm time-input" type="number" min="0" step="0.5" placeholder="—" value={hltbExtra} onChange={editHours(setHltbExtra)} />
                      </div>
                      <div className="time-cell">
                        <span className="time-label">100% (hrs)</span>
                        <input className="field-input field-sm time-input" type="number" min="0" step="0.5" placeholder="—" value={hltbComplete} onChange={editHours(setHltbComplete)} />
                      </div>
                    </div>
                    <button type="button" className="btn-ghost time-refresh-btn" onClick={handleRefreshFromIGDB} disabled={refreshing}>
                      {refreshing ? 'Refreshing…' : '↻ Reset to IGDB data'}
                    </button>
                    {refreshError && <p className="field-error">{refreshError}</p>}
                  </div>
                ) : (
                  <div>
                    <div className="time-grid">
                      <div className="time-cell"><span className="time-label">Main</span><span className="time-value mono">{formatTime(game.hltb_main)}</span></div>
                      <div className="time-cell"><span className="time-label">+Extras</span><span className="time-value mono">{formatTime(game.hltb_extra)}</span></div>
                      <div className="time-cell"><span className="time-label">100%</span><span className="time-value mono">{formatTime(game.hltb_complete)}</span></div>
                    </div>
                    {game.hltb_confidence != null && (
                      <span className="time-confidence">
                        {game.hltb_confidence === MANUAL_CONFIDENCE ? 'Manual entry' : `${game.hltb_confidence}% confidence`}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
            <div className="detail-row">
              <span className="detail-label">My Rating</span>
              {editing
                ? <input className="field-input field-sm" type="number" min="1" max="10" placeholder="1–10" value={rating} onChange={e => setRating(e.target.value)} />
                : <span className="detail-value">{game.personal_rating ? `${'★'.repeat(Math.round(game.personal_rating / 2))} ${game.personal_rating}/10` : '—'}</span>
              }
            </div>
            <div className="detail-row detail-row-col">
              <span className="detail-label">Notes</span>
              {editing
                ? <textarea className="field-input field-textarea" placeholder="Any thoughts..." value={notes} onChange={e => setNotes(e.target.value)} />
                : <span className="detail-value detail-notes">{game.notes || '—'}</span>
              }
            </div>
            <div className="form-actions">
              {editing
                ? <><button className="btn-primary" onClick={handleSave}>Save</button><button className="btn-ghost" onClick={() => setEditing(false)}>Cancel</button></>
                : <><button className="btn-primary" onClick={() => setEditing(true)}>Edit</button><button className="btn-danger" onClick={() => { if (confirm('Remove this game?')) onDelete(game.id); }}>Delete</button></>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

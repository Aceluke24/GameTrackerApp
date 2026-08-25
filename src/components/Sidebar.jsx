import { useRef, useState } from 'react';
import StatusEditor from './StatusEditor';
import { computeAnchorPosition } from '../utils/anchorPosition';
import './Sidebar.css';

export default function Sidebar({ filter, setFilter, view, setView, counts, statuses, allStatuses, onUpdateStatuses, onAddGame }) {
  const [editorPos, setEditorPos] = useState(null);
  const editBtnRef = useRef(null);

  function selectFilter(key) {
    setFilter(key);
    setView('games');
  }

  // position:fixed anchored via a measured rect, not a CSS-relative popover
  // — the sidebar's overflow-y:auto implicitly clips overflow-x too, which
  // would cut off a popover this much wider than the 220px sidebar. The
  // trigger sits near the bottom of a scrollable list, so there's often not
  // enough room below it — computeAnchorPosition flips it upward when that's
  // the case, and caps the height to whichever side it lands on.
  function openEditor() {
    const rect = editBtnRef.current.getBoundingClientRect();
    setEditorPos(computeAnchorPosition(rect, { width: 340, preferredHeight: 320 }));
  }

  return (
    <aside className="sidebar">
      <button className="add-btn" onClick={onAddGame}>
        <span>＋</span> Add Game
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
        {statuses.map(s => (
          <button
            key={s.key}
            className={`nav-item ${view === 'games' && filter === s.key ? 'active' : ''}`}
            onClick={() => selectFilter(s.key)}
            data-status={s.key}
            style={view === 'games' && filter === s.key ? { borderColor: s.color } : undefined}
          >
            <span className="nav-emoji">{s.emoji}</span>
            <span className="nav-label">{s.label}</span>
            <span className="nav-count">{counts[s.key] ?? 0}</span>
          </button>
        ))}
        <button className="nav-edit-statuses-btn" onClick={openEditor} ref={editBtnRef}>
          <span className="nav-emoji">⚙</span>
          <span className="nav-label">Edit Statuses</span>
        </button>
      </nav>
      {editorPos && (
        <>
          <div className="status-editor-scrim" onClick={() => setEditorPos(null)} />
          <div className="status-editor-anchor" style={{ top: editorPos.top, bottom: editorPos.bottom, left: editorPos.left, maxHeight: editorPos.maxHeight }}>
            <StatusEditor statuses={allStatuses} onSave={onUpdateStatuses} onClose={() => setEditorPos(null)} />
          </div>
        </>
      )}
      <div className="sidebar-footer">
        <span className="mono" style={{ fontSize: '11px', color: 'var(--muted)' }}>{counts.all} games tracked</span>
        <button className={`nav-item ${view === 'settings' ? 'active' : ''}`} onClick={() => setView('settings')}>
          <span className="nav-emoji">⚙</span>
          <span className="nav-label">Settings</span>
        </button>
      </div>
    </aside>
  );
}

import { useRef, useState } from 'react';
import { LOCKED_STATUS_KEY } from '../App';
import { computeAnchorPosition } from '../utils/anchorPosition';
import EmojiPicker from './EmojiPicker';
import './StatusEditor.css';

// Seeded once from `statuses` — the caller only ever mounts this fresh
// (the popover unmounts on close), so there's no stale-prop case to
// reconcile against later.
export default function StatusEditor({ statuses, onSave, onClose }) {
  const [rows, setRows] = useState(statuses);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [pickerFor, setPickerFor] = useState(null); // { index, ...position } | null
  const emojiRefs = useRef({});

  function updateRow(index, field, value) {
    setRows(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r));
    setError('');
  }

  function openPicker(index) {
    const rect = emojiRefs.current[index].getBoundingClientRect();
    setPickerFor({ index, ...computeAnchorPosition(rect, { width: 288, preferredHeight: 260 }) });
  }

  function pickEmoji(emoji) {
    updateRow(pickerFor.index, 'emoji', emoji);
    setPickerFor(null);
  }

  function handleClear(index) {
    if (rows[index].key === LOCKED_STATUS_KEY) return;
    updateRow(index, 'label', '');
    updateRow(index, 'emoji', '');
  }

  async function handleSave() {
    const trimmed = rows.map(r => ({ ...r, label: r.label.trim(), emoji: r.emoji.trim() }));
    const locked = trimmed.find(r => r.key === LOCKED_STATUS_KEY);
    if (!locked?.label) {
      setError("Backlog can't be cleared — it's the fallback for removed statuses.");
      return;
    }
    setSaving(true);
    await onSave(trimmed);
    setSaving(false);
    onClose();
  }

  return (
    <div className="status-editor">
      <div className="status-editor-header">
        <h3>Edit Statuses</h3>
        <button type="button" className="status-editor-close" onClick={onClose}>✕</button>
      </div>
      <p className="status-editor-desc">
        12 slots, label + emoji, edited in place. Clearing a slot's label moves any games using it back to Backlog.
      </p>
      <div className="status-editor-rows">
        {rows.map((r, i) => (
          <div className="status-editor-row" key={r.key}>
            <input
              ref={el => { emojiRefs.current[i] = el; }}
              className="field-input status-emoji-input"
              value={r.emoji}
              maxLength={4}
              placeholder="🏷"
              onClick={() => openPicker(i)}
              onChange={e => updateRow(i, 'emoji', e.target.value)}
            />
            <input
              className="field-input status-label-input"
              value={r.label}
              maxLength={24}
              placeholder={r.key === LOCKED_STATUS_KEY ? 'Backlog' : 'Empty slot'}
              onChange={e => updateRow(i, 'label', e.target.value)}
            />
            <button
              type="button"
              className="status-clear-btn"
              onClick={() => handleClear(i)}
              disabled={r.key === LOCKED_STATUS_KEY || (!r.label && !r.emoji)}
              title={r.key === LOCKED_STATUS_KEY ? "Backlog can't be removed" : 'Clear this slot'}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      {error && <p className="field-error">{error}</p>}
      <button className="status-save-btn" onClick={handleSave} disabled={saving}>
        {saving ? 'Saving…' : 'Save Statuses'}
      </button>
      {pickerFor && (
        <EmojiPicker position={pickerFor} onSelect={pickEmoji} onClose={() => setPickerFor(null)} />
      )}
    </div>
  );
}

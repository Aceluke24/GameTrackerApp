import { useState } from 'react';
import { searchIGDB, pickBestMatch } from '../api/igdb';
import { describeError } from '../api/errors';
import { parseNames } from '../utils/parseNames';
import { planBulkAdd } from '../utils/planBulkAdd';
import './Modal.css';

export default function BulkAddModal({ knownPlatforms, existingGames, onBulkAdd, onClose }) {
  const [platform, setPlatform] = useState('');
  const [text, setText] = useState('');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(null);

  const previewCount = parseNames(text).filter(Boolean).length;

  async function handleSubmit() {
    if (!platform.trim() || processing || previewCount === 0) return;

    const { toLookup, skippedBlank, skippedDuplicateInList, skippedDuplicateExisting } =
      planBulkAdd(text, existingGames);

    setProcessing(true);
    setProgress({ done: 0, total: toLookup.length });

    const added = [];
    const notFound = [];
    const failed = [];

    for (let i = 0; i < toLookup.length; i++) {
      const name = toLookup[i];
      try {
        const results = await searchIGDB(name);
        const match = pickBestMatch(results, name);
        if (!match) {
          notFound.push(name);
        } else {
          const game = { ...match, platform: platform.trim(), status: 'backlog', personal_rating: null, notes: '', source: 'manual' };
          try {
            const saved = await window.electronAPI.addGame(game);
            added.push(saved);
          } catch (err) {
            failed.push({ title: name, reason: describeError(err).message });
          }
        }
      } catch (err) {
        failed.push({ title: name, reason: describeError(err).message });
      }
      setProgress({ done: i + 1, total: toLookup.length });
    }

    setProcessing(false);
    onBulkAdd(added, { skippedBlank, skippedDuplicateInList, skippedDuplicateExisting, notFound, failed });
  }

  return (
    <div className="modal-overlay" onMouseDown={e => e.target === e.currentTarget && !processing && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>Bulk Add Games</h2>
          <button className="modal-close" onClick={onClose} disabled={processing}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-field">
            <label>Console</label>
            <input
              className="field-input"
              list="bulk-add-platforms"
              placeholder="PC, PS5, Xbox, Switch..."
              value={platform}
              onChange={e => setPlatform(e.target.value)}
              disabled={processing}
              autoFocus
            />
            <datalist id="bulk-add-platforms">
              {knownPlatforms.map(p => <option key={p} value={p} />)}
            </datalist>
          </div>
          <div className="form-field">
            <label>Game Names (one per line, or comma-separated)</label>
            <textarea
              className="field-input field-textarea"
              placeholder={'The Legend of Zelda: Breath of the Wild\nSuper Mario Odyssey\nMetroid Dread'}
              value={text}
              onChange={e => setText(e.target.value)}
              disabled={processing}
              rows={8}
            />
          </div>
          <div className="form-actions">
            <button className="btn-primary" onClick={handleSubmit} disabled={processing || !platform.trim() || previewCount === 0}>
              {processing ? `Adding ${progress.done}/${progress.total}...` : `Add ${previewCount || ''} Game${previewCount === 1 ? '' : 's'}`}
            </button>
            <button className="btn-ghost" onClick={onClose} disabled={processing}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

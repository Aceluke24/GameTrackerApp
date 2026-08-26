import './Modal.css';

const SECTIONS = [
  { key: 'added', icon: '✅', label: 'Added' },
  { key: 'skippedDuplicateExisting', icon: '⏭', label: 'Already in your vault' },
  { key: 'skippedDuplicateInList', icon: '⏭', label: 'Duplicate in your list' },
  { key: 'notFound', icon: '❌', label: "Couldn't find on IGDB" },
  { key: 'failed', icon: '❌', label: 'Failed to add' },
];

export default function BulkResultsModal({ results, onClose }) {
  const blankCount = results.skippedBlank || 0;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>{results.title || 'Import Results'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {SECTIONS.map(({ key, icon, label }) => {
            const items = results[key];
            if (!items || items.length === 0) return null;
            return (
              <div className="results-section" key={key}>
                <p className="results-section-title">{icon} {label} ({items.length})</p>
                <ul className="results-list">
                  {items.map((item, i) => (
                    <li key={i}>{typeof item === 'string' ? item : `${item.title} — ${item.reason}`}</li>
                  ))}
                </ul>
              </div>
            );
          })}
          {blankCount > 0 && (
            <p className="results-section-title">⏭ Skipped {blankCount} blank line{blankCount === 1 ? '' : 's'}</p>
          )}
          <div className="form-actions">
            <button className="btn-primary" onClick={onClose}>Done</button>
          </div>
        </div>
      </div>
    </div>
  );
}

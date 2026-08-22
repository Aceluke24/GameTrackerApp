import { useState, useEffect } from 'react';
import './Modal.css';
import './SettingsPage.css';

export default function SteamImportModal({ onImport, onClose }) {
  const [apiKey, setApiKey] = useState('');
  const [steamId, setSteamId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!window.electronAPI) { setLoading(false); return; }
    window.electronAPI.getUserSettings().then(({ steam_api_key, steam_id }) => {
      setApiKey(steam_api_key || '');
      setSteamId(steam_id || '');
      setLoading(false);
    });
  }, []);

  function handleExternalLink(e) {
    e.preventDefault();
    window.electronAPI?.openExternal(e.currentTarget.href);
  }

  async function saveCredentials() {
    const trimmedKey = apiKey.trim();
    const trimmedId = steamId.trim();
    if (!trimmedKey || !trimmedId || !window.electronAPI) return;
    await window.electronAPI.setUserSettings({ steam_api_key: trimmedKey, steam_id: trimmedId });
  }

  async function handleSave() {
    await saveCredentials();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleImport() {
    const trimmedKey = apiKey.trim();
    const trimmedId = steamId.trim();
    if (!trimmedKey || !trimmedId) return;

    // Import always uses (and persists) whatever's currently in the fields,
    // so it works even if Save was never clicked separately.
    await saveCredentials();
    // The import itself shows its own confirm/progress/alerts in App.jsx —
    // close right away rather than keeping the modal open over that.
    onClose();
    onImport(trimmedKey, trimmedId);
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>Import Steam Library</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <p className="settings-row-desc">
            Your own key — get one at{' '}
            <a href="https://steamcommunity.com/dev/apikey" className="settings-link" onClick={handleExternalLink}>
              steamcommunity.com/dev/apikey
            </a>
            . Find your Steam ID at{' '}
            <a href="https://store.steampowered.com/account/" className="settings-link" onClick={handleExternalLink}>
              store.steampowered.com/account
            </a>
            {' '}(shown near the top once you're logged in). Only used for your own imports, never shared
            with other accounts.
          </p>
          <div className="form-row">
            <div className="form-field">
              <label>Steam API Key</label>
              <input
                className="field-input"
                type="password"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                disabled={loading}
                autoFocus
              />
            </div>
            <div className="form-field">
              <label>Steam ID</label>
              <input
                className="field-input"
                type="text"
                placeholder="76561198000000000"
                value={steamId}
                onChange={e => setSteamId(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>
          <div className="form-actions">
            <button
              className="btn-primary"
              onClick={handleImport}
              disabled={loading || !apiKey.trim() || !steamId.trim()}
            >
              Import
            </button>
            <button
              className="btn-ghost"
              onClick={handleSave}
              disabled={loading || !apiKey.trim() || !steamId.trim()}
            >
              {saved ? '✓ Saved' : 'Save'}
            </button>
            <button className="btn-ghost" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

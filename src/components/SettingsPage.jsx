import { MAIN_COLORS, ACCENT_COLORS } from '../theme';
import './SettingsPage.css';

export default function SettingsPage({
  theme, onToggleTheme, mainColor, setMainColor, accentColor, setAccentColor,
  onImportSteam, onChangePassword, onDeleteAll, gameCount, userEmail, onSignOut, onDeleteAccount,
}) {
  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1>Settings</h1>
        <p className="settings-sub">Manage your vault</p>
      </div>

      <div className="settings-section">
        <h2>Account</h2>
        <div className="settings-row">
          <div>
            <p className="settings-row-title">Signed in</p>
            <p className="settings-row-desc">{userEmail}</p>
          </div>
          <button className="settings-action-btn" onClick={onSignOut}>Sign Out</button>
        </div>
        <div className="settings-row">
          <div>
            <p className="settings-row-title">Password</p>
            <p className="settings-row-desc">Change your account password.</p>
          </div>
          <button className="settings-action-btn" onClick={onChangePassword}>Change Password</button>
        </div>
      </div>

      <div className="settings-section">
        <h2>Appearance</h2>
        <div className="settings-row">
          <div>
            <p className="settings-row-title">Theme</p>
            <p className="settings-row-desc">Switch between light and dark mode.</p>
          </div>
          <button className="settings-action-btn" onClick={onToggleTheme}>
            {theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode'}
          </button>
        </div>
        <div className="settings-row settings-row-col">
          <div>
            <p className="settings-row-title">Main Color</p>
            <p className="settings-row-desc">Sets the background and surface tint.</p>
          </div>
          <div className="swatch-picker">
            {Object.entries(MAIN_COLORS).map(([key, c]) => (
              <button
                key={key}
                type="button"
                className={`swatch ${mainColor === key ? 'selected' : ''}`}
                style={{ background: c.swatch }}
                title={c.label}
                onClick={() => setMainColor(key)}
              >
                {mainColor === key && <span className="swatch-check">✓</span>}
              </button>
            ))}
          </div>
        </div>
        <div className="settings-row settings-row-col">
          <div>
            <p className="settings-row-title">Accent Color</p>
            <p className="settings-row-desc">Sets buttons, highlights, and links.</p>
          </div>
          <div className="swatch-picker">
            {Object.entries(ACCENT_COLORS).map(([key, c]) => (
              <button
                key={key}
                type="button"
                className={`swatch ${accentColor === key ? 'selected' : ''}`}
                style={{ background: c.swatch }}
                title={c.label}
                onClick={() => setAccentColor(key)}
              >
                {accentColor === key && <span className="swatch-check">✓</span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h2>Library</h2>
        <div className="settings-row">
          <div>
            <p className="settings-row-title">Import Steam Library</p>
            <p className="settings-row-desc">Pull in games from your Steam account and enrich them with completion-time data.</p>
          </div>
          <button className="settings-action-btn" onClick={onImportSteam}>
            <span>🎮</span> Import Steam
          </button>
        </div>
      </div>

      <div className="settings-section settings-section-danger">
        <h2>Danger Zone</h2>
        <div className="settings-row">
          <div>
            <p className="settings-row-title">Delete All Games</p>
            <p className="settings-row-desc">Permanently remove all {gameCount} game{gameCount !== 1 ? 's' : ''} from your vault. This cannot be undone.</p>
          </div>
          <button className="settings-danger-btn" onClick={onDeleteAll}>Delete All Games</button>
        </div>
        <div className="settings-row">
          <div>
            <p className="settings-row-title">Delete Account</p>
            <p className="settings-row-desc">Permanently delete your account and everything in it. This cannot be undone.</p>
          </div>
          <button className="settings-danger-btn" onClick={onDeleteAccount}>Delete Account</button>
        </div>
      </div>
    </div>
  );
}

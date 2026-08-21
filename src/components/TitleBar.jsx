import { useEffect, useState } from 'react';
import './TitleBar.css';

export default function TitleBar() {
  const hasWindowControls = window.electronAPI && window.electronAPI.platform !== 'darwin';
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (!hasWindowControls) return;
    window.electronAPI.isWindowMaximized().then(setIsMaximized);
    return window.electronAPI.onMaximizeChange(setIsMaximized);
  }, [hasWindowControls]);

  return (
    <div className="titlebar">
      <div className="titlebar-drag-region" />
      <div className="titlebar-logo">
        <img className="titlebar-icon" src="/icons8-closed-treasure-chest-96.png" alt="" />
        <span className="titlebar-name">Game Vault</span>
      </div>
      <div className="titlebar-drag-region" />
      {hasWindowControls && (
        <div className="titlebar-controls">
          <button className="titlebar-btn" onClick={() => window.electronAPI.minimizeWindow()} aria-label="Minimize">─</button>
          <button className="titlebar-btn" onClick={() => window.electronAPI.toggleMaximizeWindow()} aria-label={isMaximized ? 'Restore' : 'Maximize'}>
            {isMaximized ? '❐' : '□'}
          </button>
          <button className="titlebar-btn titlebar-btn-close" onClick={() => window.electronAPI.closeWindow()} aria-label="Close">✕</button>
        </div>
      )}
    </div>
  );
}

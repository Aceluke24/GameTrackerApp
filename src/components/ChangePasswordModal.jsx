import { useState } from 'react';
import { describeError } from '../api/errors';
import './Modal.css';

export default function ChangePasswordModal({ onClose, showToast }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleChangePassword() {
    setError('');
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords don’t match.');
      return;
    }

    setLoading(true);
    try {
      await window.electronAPI.updatePassword(newPassword);
      onClose();
      showToast('Password changed successfully!');
    } catch (err) {
      setError(describeError(err).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>Change Password</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-field">
            <label>New Password</label>
            <input
              className="field-input"
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              autoFocus
            />
          </div>
          <div className="form-field">
            <label>Confirm Password</label>
            <input
              className="field-input"
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
            />
          </div>

          {error && <p className="field-error">{error}</p>}

          <div className="form-actions">
            <button className="btn-primary" onClick={handleChangePassword} disabled={loading}>
              {loading ? 'Updating…' : 'Change Password'}
            </button>
            <button className="btn-ghost" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

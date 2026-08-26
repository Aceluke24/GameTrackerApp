import { useState } from 'react';
import { describeError } from '../api/errors';
import './Modal.css';
import './LoginPage.css';

// Shown when the app receives a PASSWORD_RECOVERY auth event (the user
// clicked the "Reset your password" email link) — a valid session already
// exists at that point, this just collects the new password.
export default function ResetPasswordPage({ onDone }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords don’t match.');
      return;
    }

    setLoading(true);
    try {
      await window.electronAPI.updatePassword(password);
      onDone();
    } catch (err) {
      setError(describeError(err).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-title">Set a New Password</h1>
        <p className="login-sub">Choose a new password for your account.</p>

        <form className="add-form" onSubmit={handleSubmit}>
          <div className="form-field">
            <label>New Password</label>
            <input
              className="field-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoFocus
            />
          </div>
          <div className="form-field">
            <label>Confirm Password</label>
            <input
              className="field-input"
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
            />
          </div>

          {error && <p className="field-error">{error}</p>}

          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Please wait…' : 'Update Password'}
            </button>
            <button type="button" className="btn-ghost" onClick={onDone} disabled={loading}>
              Skip and Sign In
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

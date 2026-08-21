import { useState } from 'react';
import './Modal.css';
import './LoginPage.css';

export default function LoginPage({ onAuthed }) {
  const [mode, setMode] = useState('signIn'); // 'signIn' | 'signUp'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setInfo('');
    if (!email || !password) {
      setError('Enter an email and password.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signUp') {
        const session = await window.electronAPI.signUp(email, password);
        if (!session) {
          // Supabase requires confirming the email before a session is issued
          setInfo('Check your email to confirm your account, then sign in.');
          setMode('signIn');
        } else {
          onAuthed(session);
        }
      } else {
        const session = await window.electronAPI.signIn(email, password);
        onAuthed(session);
      }
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  function switchMode() {
    setMode(m => (m === 'signUp' ? 'signIn' : 'signUp'));
    setError('');
    setInfo('');
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-title">Game Vault</h1>
        <p className="login-sub">
          {mode === 'signUp' ? 'Create an account to sync your library everywhere.' : 'Sign in to see your library.'}
        </p>

        <form className="add-form" onSubmit={handleSubmit}>
          <div className="form-field">
            <label>Email</label>
            <input
              className="field-input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoFocus
            />
          </div>
          <div className="form-field">
            <label>Password</label>
            <input
              className="field-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="field-error">{error}</p>}
          {info && <p className="login-info">{info}</p>}

          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Please wait…' : mode === 'signUp' ? 'Sign Up' : 'Sign In'}
            </button>
          </div>
        </form>

        <button type="button" className="login-switch" onClick={switchMode}>
          {mode === 'signUp' ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
        </button>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { describeError } from '../api/errors';
import './Modal.css';
import './LoginPage.css';

export default function LoginPage({ onAuthed }) {
  const [mode, setMode] = useState('signIn'); // 'signIn' | 'signUp'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotStep, setForgotStep] = useState(null); // null | 'email' | 'sent'

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
      setError(describeError(err).message);
    } finally {
      setLoading(false);
    }
  }

  function switchMode(newMode) {
    if (newMode === mode) return;
    setMode(newMode);
    setError('');
    setInfo('');
  }

  function openForgot() {
    setForgotStep('email');
    setError('');
    setInfo('');
  }

  function closeForgot() {
    setForgotStep(null);
    setError('');
  }

  async function handleForgotSubmit(e) {
    e.preventDefault();
    setError('');
    if (!email) {
      setError('Enter your email first.');
      return;
    }

    setLoading(true);
    try {
      await window.electronAPI.resetPassword(email);
      setForgotStep('sent');
    } catch (err) {
      setError(describeError(err).message);
    } finally {
      setLoading(false);
    }
  }

  if (forgotStep) {
    return (
      <div className="login-page">
        <div className="login-card">
          <h1 className="login-title">Game Vault</h1>
          <p className="login-sub">
            {forgotStep === 'sent'
              ? 'Check your email for a link to reset your password.'
              : "Enter your account's email and we'll send you a reset link."}
          </p>

          {forgotStep === 'email' && (
            <form className="add-form" onSubmit={handleForgotSubmit}>
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

              {error && <p className="field-error">{error}</p>}

              <div className="form-actions">
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Sending…' : 'Send Reset Link'}
                </button>
                <button type="button" className="btn-ghost" onClick={closeForgot}>Cancel</button>
              </div>
            </form>
          )}

          {forgotStep === 'sent' && (
            <button type="button" className="btn-ghost" onClick={closeForgot}>Back to Sign In</button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className={`login-card login-card-${mode === 'signUp' ? 'signup' : 'signin'}`}>
        <h1 className="login-title">Game Vault</h1>

        <div className="login-tabs">
          <button
            type="button"
            className={`login-tab ${mode === 'signIn' ? 'active' : ''}`}
            onClick={() => switchMode('signIn')}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`login-tab ${mode === 'signUp' ? 'active' : ''}`}
            onClick={() => switchMode('signUp')}
          >
            Sign Up
          </button>
        </div>

        <p className="login-sub">
          {mode === 'signUp' ? 'Create an account to save your library and access it from any device.' : 'Sign in to load your library.'}
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

        {mode === 'signIn' && (
          <button type="button" className="login-forgot" onClick={openForgot}>
            Forgot password?
          </button>
        )}
      </div>
    </div>
  );
}

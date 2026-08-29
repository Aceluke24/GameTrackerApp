import { describe, it, expect } from 'vitest';
import { cleanErrorMessage, describeError, onNetworkTrouble, onSessionExpired } from './errors';

describe('cleanErrorMessage', () => {
  it('strips Electron\'s "Error invoking remote method" wrapper', () => {
    const err = { message: "Error invoking remote method 'igdb-query': Error: Could not reach IGDB." };
    expect(cleanErrorMessage(err)).toBe('Could not reach IGDB.');
  });

  it('strips the wrapper even when there is no inner "Error:" prefix', () => {
    const err = { message: "Error invoking remote method 'save-game': disk full" };
    expect(cleanErrorMessage(err)).toBe('disk full');
  });

  it('leaves an ordinary message untouched', () => {
    expect(cleanErrorMessage({ message: 'That game is already in your vault' }))
      .toBe('That game is already in your vault');
  });

  it('falls back to a generic message when the unwrapped text is empty', () => {
    expect(cleanErrorMessage({ message: "Error invoking remote method 'x': " }))
      .toBe('Something went wrong.');
  });
});

describe('describeError', () => {
  it('flags a NETWORK_ERROR-prefixed failure as offline with friendly text', () => {
    const result = describeError({ message: 'NETWORK_ERROR: could not reach supabase' });
    expect(result.offline).toBe(true);
    expect(result.sessionExpired).toBe(false);
    expect(result.message).toMatch(/check your connection/i);
  });

  it('flags a SESSION_EXPIRED-prefixed failure as session-expired', () => {
    const result = describeError({ message: 'SESSION_EXPIRED: refresh failed' });
    expect(result.sessionExpired).toBe(true);
    expect(result.message).toMatch(/sign in again/i);
  });

  it('sees the prefix even through the Electron IPC wrapper', () => {
    const result = describeError({
      message: "Error invoking remote method 'q': Error: NETWORK_ERROR: nope",
    });
    expect(result.offline).toBe(true);
  });

  it('passes an ordinary error message straight through', () => {
    const result = describeError({ message: 'Wrong password' });
    expect(result.offline).toBe(false);
    expect(result.sessionExpired).toBe(false);
    expect(result.message).toBe('Wrong password');
  });

  it('notifies onNetworkTrouble subscribers when a network failure is described', () => {
    let fired = 0;
    const unsubscribe = onNetworkTrouble(() => { fired += 1; });

    describeError({ message: 'NETWORK_ERROR: down' });
    expect(fired).toBe(1);

    unsubscribe();
    describeError({ message: 'NETWORK_ERROR: still down' });
    expect(fired).toBe(1); // no longer listening
  });

  it('notifies onSessionExpired subscribers when the session is dead', () => {
    let fired = 0;
    const unsubscribe = onSessionExpired(() => { fired += 1; });

    describeError({ message: 'SESSION_EXPIRED: gone' });
    expect(fired).toBe(1);

    unsubscribe();
  });
});

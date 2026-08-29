import { describe, it, expect, afterEach, vi } from 'vitest';
import { isNetworkError, markNetworkError, NETWORK_ERROR_PREFIX } from './networkError';

// This is the renderer-side twin of electron/networkError.js — the browser
// gives less detail than Node (no OS error codes), so detection here leans
// on Chromium's message text plus navigator.onLine.

describe('isNetworkError (renderer)', () => {
  // `navigator` is a read-only global in Node, so swap it with Vitest's
  // stubGlobal helper (which knows how to restore it) rather than assigning.
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('is false for a missing error', () => {
    expect(isNetworkError(null)).toBe(false);
  });

  it('recognises an aborted request', () => {
    expect(isNetworkError({ name: 'AbortError' })).toBe(true);
  });

  it('recognises the Chromium network-failure messages', () => {
    expect(isNetworkError({ message: 'Failed to fetch' })).toBe(true);
    expect(isNetworkError({ message: 'NetworkError when attempting to fetch resource' })).toBe(true);
    expect(isNetworkError({ message: 'net::ERR_NAME_NOT_RESOLVED' })).toBe(true);
  });

  it('treats a known-offline browser as a network error regardless of message', () => {
    vi.stubGlobal('navigator', { onLine: false });
    expect(isNetworkError({ message: 'anything at all' })).toBe(true);
  });

  it('is false for an ordinary error while online', () => {
    vi.stubGlobal('navigator', { onLine: true });
    expect(isNetworkError({ message: 'Game not found' })).toBe(false);
  });
});

describe('markNetworkError', () => {
  it('returns the original error untouched when it is not network-related', () => {
    const original = new Error('Validation failed');
    expect(markNetworkError(original, 'fallback')).toBe(original);
  });

  it('wraps a network error with the shared prefix and the fallback message', () => {
    const wrapped = markNetworkError({ message: 'Failed to fetch' }, 'Could not reach IGDB.');
    expect(wrapped).toBeInstanceOf(Error);
    expect(wrapped.message).toBe(NETWORK_ERROR_PREFIX + 'Could not reach IGDB.');
  });

  it('falls back to the original message when no fallback is given', () => {
    const wrapped = markNetworkError({ message: 'Failed to fetch' });
    expect(wrapped.message).toBe(NETWORK_ERROR_PREFIX + 'Failed to fetch');
  });
});

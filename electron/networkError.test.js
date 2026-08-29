import { describe, it, expect } from 'vitest';
import { isAuthError, isNetworkError } from './networkError.js';

// These two functions decide how the app reacts to a failed request:
//   - isAuthError  -> the login is stale, try a silent refresh / show sign-in
//   - isNetworkError -> the connection is down, show the offline banner
// They only ever look at an error object's shape, so they're easy to test:
// hand-build the error shapes the real libraries throw and assert the verdict.

describe('isAuthError', () => {
  it('is false for a missing error', () => {
    expect(isAuthError(null)).toBe(false);
    expect(isAuthError(undefined)).toBe(false);
  });

  it('recognises PostgREST bad-JWT codes', () => {
    expect(isAuthError({ code: 'PGRST301' })).toBe(true);
    expect(isAuthError({ code: 'PGRST302' })).toBe(true);
  });

  it('recognises auth-js AuthSessionMissingError by name', () => {
    expect(isAuthError({ name: 'AuthSessionMissingError', message: 'Auth session missing!' })).toBe(true);
  });

  it('recognises JWT/JWS wording in the message', () => {
    expect(isAuthError({ message: 'JWT expired' })).toBe(true);
    expect(isAuthError({ message: 'JWSError JWSInvalidSignature' })).toBe(true);
    expect(isAuthError({ message: 'token is expired' })).toBe(true);
    expect(isAuthError({ message: 'invalid signature' })).toBe(true);
    expect(isAuthError({ message: 'invalid_token' })).toBe(true);
  });

  it('is false for an ordinary error', () => {
    expect(isAuthError({ message: 'Could not find that game' })).toBe(false);
    expect(isAuthError({ code: 'PGRST116', message: 'no rows' })).toBe(false);
  });
});

describe('isNetworkError', () => {
  it('is false for a missing error', () => {
    expect(isNetworkError(null)).toBe(false);
  });

  it('recognises an aborted (timed-out) request', () => {
    expect(isNetworkError({ name: 'AbortError' })).toBe(true);
  });

  it('recognises auth-js AuthRetryableFetchError', () => {
    expect(isNetworkError({ name: 'AuthRetryableFetchError', message: 'Failed to fetch' })).toBe(true);
  });

  it('recognises a Node fetch failure by its cause code', () => {
    expect(isNetworkError({ message: 'fetch failed', cause: { code: 'ENOTFOUND' } })).toBe(true);
    expect(isNetworkError({ message: 'fetch failed', cause: { code: 'ECONNREFUSED' } })).toBe(true);
  });

  it('ignores a cause code that is not a known network code', () => {
    expect(isNetworkError({ message: 'boom', cause: { code: 'EPERM' } })).toBe(false);
  });

  it('recognises the empty-code + TypeError/FetchError shape postgrest-js resolves', () => {
    expect(isNetworkError({ code: '', message: 'TypeError: Failed to fetch' })).toBe(true);
    expect(isNetworkError({ code: '', message: 'FetchError: request to ... failed' })).toBe(true);
  });

  it('recognises plain "fetch failed" / "network" wording', () => {
    expect(isNetworkError({ message: 'fetch failed' })).toBe(true);
    expect(isNetworkError({ message: 'Network request failed' })).toBe(true);
  });

  it('is false for an ordinary error', () => {
    expect(isNetworkError({ message: 'Could not find that game' })).toBe(false);
    expect(isNetworkError({ code: 'PGRST301', message: 'JWT expired' })).toBe(false);
  });
});

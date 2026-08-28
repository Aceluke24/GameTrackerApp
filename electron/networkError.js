// Prepended to a message before it crosses the IPC boundary to the renderer
// — ipcRenderer.invoke only reliably preserves an Error's message string
// (not custom properties like .name/.code), so this is the only signal that
// survives to tell the renderer "this specific failure was a network
// problem" vs. any other error. Nothing else in this app's error text
// starts with it.
const NETWORK_ERROR_PREFIX = 'NETWORK_ERROR:';

// Same idea as NETWORK_ERROR_PREFIX, for the other case the renderer needs
// to react to specially: the stored login is no longer valid and a silent
// refresh couldn't save it (see database.js's query()). The renderer drops
// to the login screen when it sees this.
const SESSION_EXPIRED_PREFIX = 'SESSION_EXPIRED:';

// PostgREST rejects a bad JWT with code PGRST301, or a message mentioning
// JWT/JWS (e.g. "JWT expired", "JWSError JWSInvalidSignature"). auth-js
// surfaces a missing/blank session as AuthSessionMissingError. Any of these
// means "re-authenticate", as opposed to a transient network or data error.
function isAuthError(err) {
  if (!err) return false;
  if (err.code === 'PGRST301' || err.code === 'PGRST302') return true;
  if (err.name === 'AuthSessionMissingError') return true;
  return /jw[stke]|token is expired|invalid(?:[_\s]?)(?:signature|claim|token)/i.test(err.message || '');
}

const NETWORK_ERROR_CODES = new Set([
  'ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT', 'EAI_AGAIN',
  'ECONNRESET', 'ENETUNREACH', 'EHOSTUNREACH', 'ENETDOWN',
]);

// Covers the shapes seen in the main process: Node/undici fetch failures
// (TypeError: fetch failed, with a .cause.code), our own AbortController
// timeouts, and Supabase's own network-failure signals — auth-js throws a
// typed AuthRetryableFetchError, and postgrest-js resolves an error with an
// empty `code` and a TypeError/FetchError-prefixed message instead of one of
// Postgres's real error codes.
function isNetworkError(err) {
  if (!err) return false;
  if (err.name === 'AbortError') return true;
  if (err.name === 'AuthRetryableFetchError') return true;
  if (err.cause?.code && NETWORK_ERROR_CODES.has(err.cause.code)) return true;
  if (err.code === '' && /^(TypeError|FetchError):/.test(err.message || '')) return true;
  if (/fetch failed|network/i.test(err.message || '')) return true;
  return false;
}

async function fetchWithTimeout(url, options = {}, ms = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

module.exports = {
  NETWORK_ERROR_PREFIX, SESSION_EXPIRED_PREFIX,
  isNetworkError, isAuthError, fetchWithTimeout,
};

// Prepended to a message before it crosses the IPC boundary to the renderer
// — ipcRenderer.invoke only reliably preserves an Error's message string
// (not custom properties like .name/.code), so this is the only signal that
// survives to tell the renderer "this specific failure was a network
// problem" vs. any other error. Nothing else in this app's error text
// starts with it.
const NETWORK_ERROR_PREFIX = 'NETWORK_ERROR:';

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

module.exports = { NETWORK_ERROR_PREFIX, isNetworkError, fetchWithTimeout };

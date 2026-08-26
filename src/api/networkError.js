// Renderer-side twin of electron/networkError.js. Kept as a separate file
// rather than shared — electron/ is CommonJS, src/ is ESM/Vite, and there's
// no existing shared-module setup between the two, so duplicating this
// small helper beats introducing one just for this.
export const NETWORK_ERROR_PREFIX = 'NETWORK_ERROR:';

// Browser fetch failures don't expose OS-level error codes the way Node's
// does (no .cause.code) — Chromium just gives a generic "Failed to fetch" /
// "NetworkError" message. Detection here leans on message text plus
// navigator.onLine as a corroborating signal.
export function isNetworkError(err) {
  if (!err) return false;
  if (err.name === 'AbortError') return true;
  if (/Failed to fetch|NetworkError|Load failed|ERR_INTERNET_DISCONNECTED|ERR_NAME_NOT_RESOLVED|ERR_CONNECTION|ERR_NETWORK/i.test(err.message || '')) return true;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  return false;
}

// Wraps a caught error with the same NETWORK_ERROR_PREFIX convention used
// on the main-process side, so renderer code that talks directly to
// IGDB/Steam (not through IPC) is detectable the same way downstream.
export function markNetworkError(err, fallbackMessage) {
  if (!isNetworkError(err)) return err;
  return new Error(NETWORK_ERROR_PREFIX + (fallbackMessage ?? err.message));
}

export async function fetchWithTimeout(url, options = {}, ms = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

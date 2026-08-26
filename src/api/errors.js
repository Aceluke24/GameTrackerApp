import { NETWORK_ERROR_PREFIX } from './networkError';

// Electron's ipcRenderer.invoke() wraps any error a main-process handler
// throws as "Error invoking remote method '<channel>': Error: <message>" —
// strip that boilerplate so only the actual message (already made
// user-friendly in electron/auth.js) shows up in the UI.
export function cleanErrorMessage(err) {
  const msg = err?.message || String(err);
  const match = msg.match(/^Error invoking remote method '[^']+':\s*(?:Error:\s*)?([\s\S]*)$/);
  return (match ? match[1] : msg) || 'Something went wrong.';
}

// Fires whenever describeError below classifies a failure as network-caused
// — this is the app's one hook point for "something just failed to reach
// the network," used to light up the offline banner without every call site
// having to separately detect and report that.
const listeners = new Set();
export function onNetworkTrouble(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

// The one place every catch block should get its toast text from — folds in
// both IPC errors (prefixed by electron/networkError.js's check()) and
// direct renderer fetch errors (prefixed by src/api/networkError.js's
// markNetworkError), so a connection problem reads the same everywhere
// instead of each handler's own generic "Failed to X" string.
export function describeError(err, fallback = 'Something went wrong. Please try again.') {
  const cleaned = cleanErrorMessage(err);
  const offline = cleaned.startsWith(NETWORK_ERROR_PREFIX);
  if (offline) listeners.forEach(cb => cb());
  return {
    offline,
    message: offline
      ? "Can't reach the server — check your connection and try again."
      : (cleaned || fallback),
  };
}

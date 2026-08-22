// Electron's ipcRenderer.invoke() wraps any error a main-process handler
// throws as "Error invoking remote method '<channel>': Error: <message>" —
// strip that boilerplate so only the actual message (already made
// user-friendly in electron/auth.js) shows up in the UI.
export function cleanErrorMessage(err) {
  const msg = err?.message || String(err);
  const match = msg.match(/^Error invoking remote method '[^']+':\s*(?:Error:\s*)?([\s\S]*)$/);
  return (match ? match[1] : msg) || 'Something went wrong.';
}

// Fields included in a library export. Excludes `id`/`user_id` — they're
// internal identifiers, not portable data a backup needs to preserve.
const EXPORT_FIELDS = [
  'title', 'platform', 'status', 'personal_rating', 'notes',
  'genres', 'igdb_id', 'igdb_rating',
  'hltb_main', 'hltb_extra', 'hltb_complete', 'hltb_confidence',
  'date_added', 'date_finished', 'source', 'cover_url',
];

export function gamesToJSON(games) {
  const data = games.map(g => Object.fromEntries(EXPORT_FIELDS.map(f => [f, g[f] ?? null])));
  return JSON.stringify(data, null, 2);
}

function csvCell(value) {
  const str = value == null ? '' : String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export function gamesToCSV(games) {
  const header = EXPORT_FIELDS.join(',');
  const rows = games.map(g => EXPORT_FIELDS.map(f => csvCell(g[f])).join(','));
  return [header, ...rows].join('\n');
}

// Electron gets a native Save dialog; a plain browser (preview mode) falls
// back to a standard anchor-download since there's no filesystem access.
export async function saveExportFile(content, filename) {
  if (window.electronAPI) {
    const result = await window.electronAPI.saveFile(content, filename);
    return !result.canceled;
  }
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return true;
}

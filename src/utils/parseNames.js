// Splits the free-text box in BulkAddModal into individual game names.
// Users paste either one name per line, or a comma-separated list, or a
// mix of both — so we split on any run of newlines and/or commas.
//
// Each entry is trimmed but NOT filtered here: the caller counts the blank
// entries (to report "N blank lines skipped") before dropping them.
export function parseNames(text) {
  return text.split(/[\n,]+/).map(s => s.trim());
}

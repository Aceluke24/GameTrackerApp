import { parseNames } from './parseNames';

// Turns the Bulk Add text box into a plan: which names to actually look up
// on IGDB, and which were dropped and why (so BulkResultsModal can report
// "3 blank lines, 1 already in your vault, 2 duplicated in the list").
//
// Matching is case-insensitive. Order is preserved; the FIRST occurrence of
// a name in the list is the one kept.
export function planBulkAdd(text, existingGames = []) {
  const rawEntries = parseNames(text);
  const skippedBlank = rawEntries.filter(e => !e).length;
  const nonBlank = rawEntries.filter(Boolean);

  const seen = new Set();
  const skippedDuplicateInList = [];
  const uniqueNames = [];
  for (const name of nonBlank) {
    const key = name.toLowerCase();
    if (seen.has(key)) { skippedDuplicateInList.push(name); continue; }
    seen.add(key);
    uniqueNames.push(name);
  }

  const existingTitles = new Set(existingGames.map(g => g.title.toLowerCase()));
  const skippedDuplicateExisting = [];
  const toLookup = [];
  for (const name of uniqueNames) {
    if (existingTitles.has(name.toLowerCase())) skippedDuplicateExisting.push(name);
    else toLookup.push(name);
  }

  return { toLookup, skippedBlank, skippedDuplicateInList, skippedDuplicateExisting };
}

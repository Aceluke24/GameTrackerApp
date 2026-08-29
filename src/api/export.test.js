import { describe, it, expect } from 'vitest';
import { csvCell, gamesToCSV, gamesToJSON } from './export';

describe('csvCell', () => {
  it('leaves a plain value untouched', () => {
    expect(csvCell('Hades')).toBe('Hades');
    expect(csvCell(42)).toBe('42');
  });

  it('renders null / undefined as an empty string', () => {
    expect(csvCell(null)).toBe('');
    expect(csvCell(undefined)).toBe('');
  });

  it('wraps a value containing a comma in quotes', () => {
    expect(csvCell('Action, Adventure')).toBe('"Action, Adventure"');
  });

  it('wraps a value containing a newline in quotes', () => {
    expect(csvCell('line one\nline two')).toBe('"line one\nline two"');
  });

  it('doubles embedded quotes and wraps the field', () => {
    expect(csvCell('The "Best" Game')).toBe('"The ""Best"" Game"');
  });
});

describe('gamesToCSV', () => {
  it('starts with a header row of the exported field names', () => {
    const csv = gamesToCSV([]);
    expect(csv.split('\n')[0]).toBe(
      'title,platform,status,personal_rating,notes,genres,igdb_id,igdb_rating,' +
      'hltb_main,hltb_extra,hltb_complete,hltb_confidence,date_added,date_finished,source,cover_url'
    );
  });

  it('emits one row per game, in field order, with missing fields blank', () => {
    const csv = gamesToCSV([{ title: 'Hades', platform: 'Switch', status: 'finished' }]);
    const row = csv.split('\n')[1];
    expect(row.startsWith('Hades,Switch,finished,,')).toBe(true);
  });

  it('escapes a title that contains a comma so the column count stays right', () => {
    const csv = gamesToCSV([{ title: 'Half-Life: Alyx, VR' }]);
    expect(csv.split('\n')[1]).toContain('"Half-Life: Alyx, VR"');
  });

  it('does not leak internal id / user_id columns', () => {
    const csv = gamesToCSV([{ title: 'X', id: 99, user_id: 'secret' }]);
    expect(csv).not.toContain('secret');
    expect(csv.split('\n')[0]).not.toContain('user_id');
  });
});

describe('gamesToJSON', () => {
  it('produces pretty-printed JSON of just the exported fields', () => {
    const json = gamesToJSON([{ title: 'Hades', platform: 'Switch', id: 1, user_id: 'u' }]);
    const parsed = JSON.parse(json);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].title).toBe('Hades');
    expect(parsed[0]).not.toHaveProperty('id');
    expect(parsed[0]).not.toHaveProperty('user_id');
  });

  it('fills every exported field, using null where the game has no value', () => {
    const parsed = JSON.parse(gamesToJSON([{ title: 'Bare' }]));
    expect(parsed[0].platform).toBeNull();
    expect(parsed[0].hltb_main).toBeNull();
    expect(parsed[0].cover_url).toBeNull();
  });

  it('round-trips an empty library', () => {
    expect(JSON.parse(gamesToJSON([]))).toEqual([]);
  });
});

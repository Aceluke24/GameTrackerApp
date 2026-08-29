import { describe, it, expect } from 'vitest';
import { parseNames } from './parseNames';

// Each `it(...)` is one test: a short sentence describing the behaviour,
// then a function that must not throw. `expect(x).toEqual(y)` compares the
// two by contents (right for arrays/objects); if they differ the test fails
// and Vitest prints both.
describe('parseNames', () => {
  it('splits a one-per-line list', () => {
    expect(parseNames('Halo\nZelda\nCeleste')).toEqual(['Halo', 'Zelda', 'Celeste']);
  });

  it('splits a comma-separated list', () => {
    expect(parseNames('Halo, Zelda, Celeste')).toEqual(['Halo', 'Zelda', 'Celeste']);
  });

  it('handles commas and newlines mixed together', () => {
    expect(parseNames('Halo, Zelda\nCeleste')).toEqual(['Halo', 'Zelda', 'Celeste']);
  });

  it('trims whitespace around every name', () => {
    expect(parseNames('  Halo  \n\t Zelda ')).toEqual(['Halo', 'Zelda']);
  });

  it('collapses several separators in a row into one split', () => {
    // "Halo\n\n\nZelda" should give two names, not a pile of blanks
    expect(parseNames('Halo\n\n\nZelda')).toEqual(['Halo', 'Zelda']);
    expect(parseNames('Halo,,,Zelda')).toEqual(['Halo', 'Zelda']);
  });

  it('keeps a single blank entry when the text is empty or whitespace', () => {
    // The caller relies on this to count "blank lines skipped" before
    // filtering them out.
    expect(parseNames('')).toEqual(['']);
    expect(parseNames('   ')).toEqual(['']);
  });

  it('does not split on spaces inside a title', () => {
    expect(parseNames('The Legend of Zelda')).toEqual(['The Legend of Zelda']);
  });
});

import { describe, it, expect } from 'vitest';
import { computeLibraryStats, MINUTES_PER_DAY_PLAYED } from './libraryStats';

const game = (over = {}) => ({
  title: 'Untitled', status: 'backlog', platform: null, genres: null, hltb_main: null, ...over,
});

describe('computeLibraryStats', () => {
  it('handles an empty library without dividing by zero', () => {
    const s = computeLibraryStats([]);
    expect(s.total).toBe(0);
    expect(s.totalBacklogMinutes).toBe(0);
    expect(s.finishRate).toBe(0);
    expect(s.sortedPlatforms).toEqual([]);
    expect(s.sortedGenres).toEqual([]);
    expect(s.maxPlatformGames).toBe(1); // guard value, not 0
  });

  it('sums main-story time for backlog + playing only', () => {
    const s = computeLibraryStats([
      game({ status: 'backlog', hltb_main: 600 }),
      game({ status: 'playing', hltb_main: 400 }),
      game({ status: 'finished', hltb_main: 999 }), // excluded
      game({ status: 'wishlist', hltb_main: 999 }), // excluded
    ]);
    expect(s.totalBacklogMinutes).toBe(1000);
  });

  it('derives backlog debt from the play-pace constant', () => {
    const s = computeLibraryStats([game({ status: 'backlog', hltb_main: MINUTES_PER_DAY_PLAYED * 10 })]);
    expect(s.daysToComplete).toBe(10);
    expect(s.yearsToComplete).toBeCloseTo(10 / 365);
  });

  it('finish rate = finished / started, where "started" excludes wishlist & backlog', () => {
    const s = computeLibraryStats([
      game({ status: 'finished' }),
      game({ status: 'finished' }),
      game({ status: 'want_again' }),   // counts as both started and finished
      game({ status: 'abandoned' }),    // started, not finished
      game({ status: 'backlog' }),      // neither
      game({ status: 'wishlist' }),     // neither
    ]);
    expect(s.started).toBe(4);
    expect(s.finished).toBe(3);
    expect(s.finishRate).toBe(75);
  });

  it('groups platforms, counts finished per platform, and sorts by total desc', () => {
    const s = computeLibraryStats([
      game({ platform: 'Switch', status: 'finished' }),
      game({ platform: 'Switch', status: 'backlog', hltb_main: 500 }),
      game({ platform: 'Switch', status: 'backlog', hltb_main: 100 }),
      game({ platform: 'PC', status: 'finished' }),
    ]);
    const [top] = s.sortedPlatforms;
    expect(top[0]).toBe('Switch');
    expect(top[1]).toEqual({ total: 3, finished: 1, backlogMinutes: 600 });
    expect(s.maxPlatformGames).toBe(3);
  });

  it('buckets a missing platform as "Unknown"', () => {
    const s = computeLibraryStats([game({ platform: null }), game({ platform: '' })]);
    expect(s.sortedPlatforms[0][0]).toBe('Unknown');
    expect(s.sortedPlatforms[0][1].total).toBe(2);
  });

  it('splits the comma-separated genres string and counts each, top 8 only', () => {
    const s = computeLibraryStats([
      game({ genres: 'Indie, Platform' }),
      game({ genres: 'Indie, Puzzle' }),
      game({ genres: null }),
    ]);
    const asObj = Object.fromEntries(s.sortedGenres);
    expect(asObj.Indie).toBe(2);
    expect(asObj.Platform).toBe(1);
    expect(asObj.Puzzle).toBe(1);
    expect(s.sortedGenres.length).toBeLessThanOrEqual(8);
  });
});

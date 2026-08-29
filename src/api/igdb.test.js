import { describe, it, expect } from 'vitest';
import {
  formatTime,
  pickBestMatch,
  plausibleMinutes,
  confidenceFromCount,
} from './igdb';

describe('formatTime', () => {
  it('shows a dash for nothing / zero', () => {
    expect(formatTime(0)).toBe('—');
    expect(formatTime(null)).toBe('—');
    expect(formatTime(undefined)).toBe('—');
  });

  it('shows just minutes when under an hour', () => {
    expect(formatTime(45)).toBe('45m');
  });

  it('shows just hours when it divides evenly', () => {
    expect(formatTime(120)).toBe('2h');
  });

  it('shows hours and minutes otherwise', () => {
    expect(formatTime(150)).toBe('2h 30m');
  });
});

describe('plausibleMinutes', () => {
  it('converts seconds to whole minutes', () => {
    expect(plausibleMinutes(3600, 200)).toBe(60);     // 1 hour
    expect(plausibleMinutes(36000, 200)).toBe(600);   // 10 hours
  });

  it('rounds to the nearest minute', () => {
    expect(plausibleMinutes(90, 200)).toBe(2);   // 1.5 min -> 2
    expect(plausibleMinutes(89, 200)).toBe(1);   // 1.48 min -> 1
  });

  it('rejects an outlier above maxHours as bad data', () => {
    // 500 hours of seconds, cap of 200 hours -> treated as garbage
    expect(plausibleMinutes(500 * 3600, 200)).toBeNull();
  });

  it('keeps a value exactly on the cap', () => {
    expect(plausibleMinutes(200 * 3600, 200)).toBe(200 * 60);
  });

  it('returns null for missing input', () => {
    expect(plausibleMinutes(0, 200)).toBeNull();
    expect(plausibleMinutes(undefined, 200)).toBeNull();
  });
});

describe('confidenceFromCount', () => {
  it('is null when there are no submissions', () => {
    expect(confidenceFromCount(0)).toBeNull();
    expect(confidenceFromCount(undefined)).toBeNull();
  });

  it('scales toward full confidence at 5 submissions', () => {
    expect(confidenceFromCount(1)).toBe(20);
    expect(confidenceFromCount(3)).toBe(60);
    expect(confidenceFromCount(5)).toBe(100);
  });

  it('caps at 100 for more than 5 submissions', () => {
    expect(confidenceFromCount(50)).toBe(100);
  });
});

describe('pickBestMatch', () => {
  const results = [
    { title: 'Portal Maze 2', hltb_main: 120 },
    { title: 'Portal 2', hltb_main: null },
    { title: 'Portal 2', hltb_main: 500 },
  ];

  it('prefers an exact title match over whatever ranked first', () => {
    expect(pickBestMatch(results, 'Portal 2').title).toBe('Portal 2');
  });

  it('among exact matches, prefers the one that has completion-time data', () => {
    expect(pickBestMatch(results, 'Portal 2').hltb_main).toBe(500);
  });

  it('matches case-insensitively', () => {
    expect(pickBestMatch(results, 'PORTAL 2').title).toBe('Portal 2');
  });

  it('falls back to the first result when nothing matches exactly', () => {
    expect(pickBestMatch(results, 'Half-Life').title).toBe('Portal Maze 2');
  });

  it('returns null for an empty result list', () => {
    expect(pickBestMatch([], 'Anything')).toBeNull();
  });
});

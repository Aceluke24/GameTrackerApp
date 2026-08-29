import { describe, it, expect, afterEach, vi } from 'vitest';
import { scoreBacklog, pickWeighted } from './backlogScore';

const game = (over = {}) => ({
  id: Math.random(), title: 'Untitled', status: 'backlog',
  hltb_main: null, igdb_rating: null, date_added: null, ...over,
});

describe('scoreBacklog', () => {
  it('only scores games in the "backlog" status', () => {
    const scored = scoreBacklog([
      game({ title: 'In backlog', status: 'backlog' }),
      game({ title: 'Playing', status: 'playing' }),
      game({ title: 'Finished', status: 'finished' }),
    ]);
    expect(scored.map(g => g.title)).toEqual(['In backlog']);
  });

  it('returns an empty array when nothing is in the backlog', () => {
    expect(scoreBacklog([game({ status: 'finished' })])).toEqual([]);
  });

  it('ranks a short, highly-rated game above a long, poorly-rated one', () => {
    const scored = scoreBacklog([
      game({ title: 'Long+Bad', hltb_main: 6000, igdb_rating: 40 }),
      game({ title: 'Short+Good', hltb_main: 300, igdb_rating: 95 }),
    ]);
    expect(scored[0].title).toBe('Short+Good');
  });

  it('gives every game a score between 0 and 100', () => {
    const scored = scoreBacklog([
      game({ hltb_main: 300, igdb_rating: 90, date_added: '2020-01-01' }),
      game({ hltb_main: 9000, igdb_rating: 10, date_added: '2026-01-01' }),
      game({ hltb_main: null, igdb_rating: null, date_added: null }),
    ]);
    for (const g of scored) {
      expect(g.score).toBeGreaterThanOrEqual(0);
      expect(g.score).toBeLessThanOrEqual(100);
    }
  });

  it('gives a game with no time/rating data the neutral 20+20, plus its age score', () => {
    // Single game -> it is both newest and oldest, so ageScore is 0.
    const [only] = scoreBacklog([game({ hltb_main: null, igdb_rating: null, date_added: '2025-01-01' })]);
    expect(only.score).toBeCloseTo(40);
  });

  it('does not throw when every game was added on the same day (zero date range)', () => {
    expect(() => scoreBacklog([
      game({ date_added: '2025-05-05' }),
      game({ date_added: '2025-05-05' }),
    ])).not.toThrow();
  });

  it('keeps the original game fields and adds `score`', () => {
    const [scored] = scoreBacklog([game({ title: 'Hades', hltb_main: 1200 })]);
    expect(scored.title).toBe('Hades');
    expect(scored.hltb_main).toBe(1200);
    expect(typeof scored.score).toBe('number');
  });
});

describe('pickWeighted', () => {
  afterEach(() => vi.restoreAllMocks());

  const scored = [
    { id: 'a', score: 90 },
    { id: 'b', score: 30 },
    { id: 'c', score: 5 },
  ];

  it('picks the high-scoring game when the random draw lands low', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0); // r = 0 -> first candidate
    expect(pickWeighted(scored).id).toBe('a');
  });

  it('picks a later game when the random draw lands high', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99); // r near totalWeight -> last
    expect(pickWeighted(scored).id).toBe('c');
  });

  it('never returns the excluded game when others are available', () => {
    for (const r of [0, 0.25, 0.5, 0.75, 0.999]) {
      vi.spyOn(Math, 'random').mockReturnValue(r);
      expect(pickWeighted(scored, 'a').id).not.toBe('a');
      vi.restoreAllMocks();
    }
  });

  it('falls back to the only game even if it is the excluded one', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    expect(pickWeighted([{ id: 'solo', score: 50 }], 'solo').id).toBe('solo');
  });

  it('still works when every score is zero (floor weight of 1 each)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const pick = pickWeighted([{ id: 'x', score: 0 }, { id: 'y', score: 0 }]);
    expect(['x', 'y']).toContain(pick.id);
  });
});

import { describe, it, expect } from 'vitest';
import { getSteamCoverFallback } from './steam';

describe('getSteamCoverFallback', () => {
  it('swaps the portrait capsule for the near-universal header image', () => {
    const portrait = 'https://cdn.cloudflare.steamstatic.com/steam/apps/1145360/library_600x900.jpg';
    expect(getSteamCoverFallback(portrait)).toBe(
      'https://cdn.cloudflare.steamstatic.com/steam/apps/1145360/header.jpg'
    );
  });

  it('returns null when the URL is not a Steam portrait capsule', () => {
    expect(getSteamCoverFallback('https://images.igdb.com/abc/cover_big.jpg')).toBeNull();
    expect(getSteamCoverFallback('https://.../apps/1/header.jpg')).toBeNull();
  });

  it('returns null for a missing / empty cover URL (no crash)', () => {
    expect(getSteamCoverFallback(null)).toBeNull();
    expect(getSteamCoverFallback(undefined)).toBeNull();
    expect(getSteamCoverFallback('')).toBeNull();
  });
});

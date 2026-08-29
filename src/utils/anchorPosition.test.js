import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { computeAnchorPosition } from './anchorPosition';

// computeAnchorPosition reads window.innerWidth / window.innerHeight, which
// don't exist in a plain Node test — so we stub a fake window before each
// test and remove it after. `rect` mimics the object a real
// element.getBoundingClientRect() returns.
beforeEach(() => {
  global.window = { innerWidth: 1000, innerHeight: 800 };
});
afterEach(() => {
  delete global.window;
});

describe('computeAnchorPosition', () => {
  it('opens downward when there is plenty of room below the trigger', () => {
    const rect = { top: 100, bottom: 130, left: 50 };
    const pos = computeAnchorPosition(rect, { width: 300 });

    expect(pos.top).toBe(138);        // rect.bottom + 8
    expect(pos.bottom).toBeUndefined();
    expect(pos.maxHeight).toBe(654);  // 800 - 130 - 16
  });

  it('flips upward when there is little room below but lots above', () => {
    const rect = { top: 700, bottom: 730, left: 50 };
    const pos = computeAnchorPosition(rect, { width: 300 });

    expect(pos.bottom).toBe(108);     // 800 - 700 + 8
    expect(pos.top).toBeUndefined();
    expect(pos.maxHeight).toBe(684);  // spaceAbove: 700 - 16
  });

  it('stays downward when neither side has room (just uses the space it has)', () => {
    global.window = { innerWidth: 1000, innerHeight: 500 };
    const rect = { top: 20, bottom: 400, left: 50 };
    const pos = computeAnchorPosition(rect, { width: 300 });

    expect(pos.top).toBe(408);
    expect(pos.maxHeight).toBe(84);   // 500 - 400 - 16
  });

  it('clamps the left edge so a right-aligned trigger stays on screen', () => {
    const rect = { top: 100, bottom: 130, left: 900 };
    const pos = computeAnchorPosition(rect, { width: 300 });

    // 900 would push a 300px-wide popover off the right edge, so it clamps
    // to innerWidth - width - margin = 1000 - 300 - 16
    expect(pos.left).toBe(684);
  });

  it('leaves the left edge alone when the trigger is comfortably inside', () => {
    const rect = { top: 100, bottom: 130, left: 50 };
    const pos = computeAnchorPosition(rect, { width: 300 });
    expect(pos.left).toBe(50);
  });
});

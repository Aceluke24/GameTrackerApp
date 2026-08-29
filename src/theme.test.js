import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { applyColorScheme, MAIN_COLORS, ACCENT_COLORS } from './theme';

// applyColorScheme writes CSS custom properties onto <html>. Stub a minimal
// document whose style object just records what was set, so we can assert on it.
let setProps;
beforeEach(() => {
  setProps = {};
  global.document = {
    documentElement: {
      style: { setProperty: (k, v) => { setProps[k] = v; } },
    },
  };
});
afterEach(() => {
  delete global.document;
});

describe('applyColorScheme', () => {
  it('applies the requested Main + Accent palette for the dark theme', () => {
    applyColorScheme('dark', 'cool', 'blue');
    expect(setProps['--bg']).toBe(MAIN_COLORS.cool.dark.bg);
    expect(setProps['--text']).toBe(MAIN_COLORS.cool.dark.text);
    expect(setProps['--accent']).toBe(ACCENT_COLORS.blue.dark.accent);
    expect(setProps['--accent-rgb']).toBe(ACCENT_COLORS.blue.dark.accentRgb);
  });

  it('applies the light variant when asked', () => {
    applyColorScheme('light', 'warm', 'green');
    expect(setProps['--surface']).toBe(MAIN_COLORS.warm.light.surface);
    expect(setProps['--accent']).toBe(ACCENT_COLORS.green.light.accent);
  });

  it('falls back to neutral / orange for unknown keys instead of crashing', () => {
    applyColorScheme('dark', 'chartreuse', 'ultraviolet');
    expect(setProps['--bg']).toBe(MAIN_COLORS.neutral.dark.bg);
    expect(setProps['--accent']).toBe(ACCENT_COLORS.orange.dark.accent);
  });

  it('sets all eight custom properties every time', () => {
    applyColorScheme('dark', 'rose', 'pink');
    expect(Object.keys(setProps).sort()).toEqual([
      '--accent', '--accent-rgb', '--bg', '--border', '--muted', '--surface', '--surface2', '--text',
    ]);
  });
});

describe('palette data', () => {
  it('every Main color defines a full dark and light token set', () => {
    const tokens = ['bg', 'surface', 'surface2', 'border', 'text', 'muted'];
    for (const [name, preset] of Object.entries(MAIN_COLORS)) {
      for (const mode of ['dark', 'light']) {
        for (const t of tokens) {
          expect(preset[mode][t], `${name}.${mode}.${t}`).toMatch(/^#[0-9a-f]{6}$/i);
        }
      }
    }
  });

  it('every Accent color defines a dark and light accent + rgb triple', () => {
    for (const [name, preset] of Object.entries(ACCENT_COLORS)) {
      for (const mode of ['dark', 'light']) {
        expect(preset[mode].accent, `${name}.${mode}`).toMatch(/^#[0-9a-f]{6}$/i);
        expect(preset[mode].accentRgb, `${name}.${mode}`).toMatch(/^\d{1,3}, \d{1,3}, \d{1,3}$/);
      }
    }
  });
});

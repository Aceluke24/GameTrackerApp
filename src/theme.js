// Curated Main (background) and Accent color presets. Each is hand-tuned per
// light/dark mode so every combination stays legible — Main controls
// bg/surface/border/text, Accent controls the highlight color only.
// Danger red and the per-status colors are intentionally NOT customizable
// here since they're semantic signals (destructive actions, status legend).

export const MAIN_COLORS = {
  neutral: {
    label: 'Neutral', swatch: '#6b6b80',
    dark:  { bg: '#0d0d0f', surface: '#16161a', surface2: '#1e1e24', border: '#2a2a35', text: '#e8e8f0', muted: '#6b6b80' },
    light: { bg: '#faf7f2', surface: '#ffffff', surface2: '#f2ede4', border: '#e6ddd0', text: '#2a221a', muted: '#8a7f6f' },
  },
  warm: {
    label: 'Warm', swatch: '#c98a4b',
    dark:  { bg: '#1a0f06', surface: '#26160a', surface2: '#33200f', border: '#4a2c14', text: '#f5ece2', muted: '#a8886e' },
    light: { bg: '#fbdfc0', surface: '#fff3e6', surface2: '#ffe4c2', border: '#f0c290', text: '#2a1808', muted: '#9c7148' },
  },
  cool: {
    label: 'Cool', swatch: '#64748b',
    dark:  { bg: '#0a0f1a', surface: '#131a26', surface2: '#1a2333', border: '#263349', text: '#e6ecf5', muted: '#7a8aa8' },
    light: { bg: '#eef2fb', surface: '#ffffff', surface2: '#e4ebf7', border: '#d3ddef', text: '#16202e', muted: '#64748b' },
  },
  forest: {
    label: 'Forest', swatch: '#5c8770',
    dark:  { bg: '#0a140f', surface: '#11201a', surface2: '#182b22', border: '#24392e', text: '#e6f0ea', muted: '#7fa38f' },
    light: { bg: '#eef7f1', surface: '#ffffff', surface2: '#e2f0e7', border: '#cde3d6', text: '#142019', muted: '#5c8770' },
  },
  rose: {
    label: 'Rose', swatch: '#a8637a',
    dark:  { bg: '#150a10', surface: '#211219', surface2: '#2c1a23', border: '#3f2530', text: '#f2e6ec', muted: '#a8798e' },
    light: { bg: '#fbeef3', surface: '#ffffff', surface2: '#f7e2ea', border: '#edc9d7', text: '#200c15', muted: '#8a5a6d' },
  },
};

export const ACCENT_COLORS = {
  orange: {
    label: 'Orange', swatch: '#fe7c12',
    dark:  { accent: '#fe7c12', accentRgb: '254, 124, 18' },
    light: { accent: '#ea580c', accentRgb: '234, 88, 12' },
  },
  purple: {
    label: 'Purple', swatch: '#8b7cf7',
    dark:  { accent: '#8b7cf7', accentRgb: '139, 124, 247' },
    light: { accent: '#7c3aed', accentRgb: '124, 58, 237' },
  },
  blue: {
    label: 'Blue', swatch: '#38bdf8',
    dark:  { accent: '#38bdf8', accentRgb: '56, 189, 248' },
    light: { accent: '#0284c7', accentRgb: '2, 132, 199' },
  },
  green: {
    label: 'Green', swatch: '#4ade80',
    dark:  { accent: '#4ade80', accentRgb: '74, 222, 128' },
    light: { accent: '#16a34a', accentRgb: '22, 163, 74' },
  },
  pink: {
    label: 'Pink', swatch: '#f472b6',
    dark:  { accent: '#f472b6', accentRgb: '244, 114, 182' },
    light: { accent: '#db2777', accentRgb: '219, 39, 119' },
  },
  teal: {
    label: 'Teal', swatch: '#2dd4bf',
    dark:  { accent: '#2dd4bf', accentRgb: '45, 212, 191' },
    light: { accent: '#0d9488', accentRgb: '13, 148, 136' },
  },
};

export function applyColorScheme(theme, mainKey, accentKey) {
  const main = (MAIN_COLORS[mainKey] ?? MAIN_COLORS.neutral)[theme];
  const accent = (ACCENT_COLORS[accentKey] ?? ACCENT_COLORS.orange)[theme];
  const root = document.documentElement.style;
  root.setProperty('--bg', main.bg);
  root.setProperty('--surface', main.surface);
  root.setProperty('--surface2', main.surface2);
  root.setProperty('--border', main.border);
  root.setProperty('--text', main.text);
  root.setProperty('--muted', main.muted);
  root.setProperty('--accent', accent.accent);
  root.setProperty('--accent-rgb', accent.accentRgb);
}

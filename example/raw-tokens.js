import { Color, group, ref, theme, tokens } from '../lib/index.js';

// ─── Colors ──────────────────────────────────────────────────

const palette = {
  steelblue: new Color('steelblue'),
  crimson: new Color('crimson'),
  forestgreen: new Color('forestgreen'),
};

const colors = group('color', {
  primary: [palette.steelblue, 'Primary branding color'],
  secondary: palette.crimson,
  success: [palette.forestgreen, 'Use for success states'],
  error: ['red', 'Use for error states'],
  textPrimary: ['rgba(0, 0, 0, .95)', 'Use for prominent text'],
  link: ref('primary'),
  surface: '#ffffff',
  background: '#fafafa',
});

// A theme is an override layer applied on top of the base colors.
const darkColors = theme('dark', colors, {
  surface: '#1a1a1a',
  background: '#121212',
});

// ─── Typography ──────────────────────────────────────────────

const fontFamilies = group('font-family', {
  body: ['"Roboto Condensed", sans-serif', 'All body fonts'],
  headers: ['Arial, Helvetica, sans-serif', 'All header fonts'],
});

// ─── Export ──────────────────────────────────────────────────

export const allTokens = tokens(colors, fontFamilies);
export const themes = [darkColors];

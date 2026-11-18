import { Color } from '../TokenTypes/Color/index.js';
import type { ColorFormat } from '../TokenTypes/Color/types.js';

/**
 * The color a token value holds, or `null` when it holds none a plugin can
 * work with: a CSS-wide keyword, `currentColor`, `var(--x)`, `color-mix()`, ….
 * Color plugins leave such a value alone rather than throwing on it.
 */
export const parseColor = (value: unknown): Color | null => {
  if (value instanceof Color) {
    return value;
  }

  if (typeof value !== 'string') {
    return null;
  }

  try {
    return new Color(value);
  } catch {
    return null;
  }
};

const COLOR_FORMATS: Record<ColorFormat, true> = {
  rgb: true,
  rgba: true,
  hex3: true,
  hex: true,
  hsl: true,
  hsla: true,
  xyz: true,
  xyza: true,
  lab: true,
  laba: true,
  lch: true,
  lcha: true,
  oklab: true,
  oklaba: true,
  oklch: true,
  oklcha: true,
  named: true,
  xkcd: true,
  native: true,
};

export const isColorFormat = (value: unknown): value is ColorFormat =>
  typeof value === 'string' && Object.hasOwn(COLOR_FORMATS, value);

export const colorFormatNames = (): string => Object.keys(COLOR_FORMATS).join(', ');

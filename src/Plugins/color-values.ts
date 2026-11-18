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

const BLACK = new Color('#000');

/** Throws, naming the plugin option and the valid formats, when `value` is not a color format. */
export const assertColorFormat = ({
  plugin,
  option,
  value,
}: {
  plugin: string;
  option: string;
  value: unknown;
}): void => {
  try {
    BLACK.toString(value as ColorFormat);
  } catch (cause) {
    throw new Error(
      `${plugin}: unknown ${option} "${String(value)}". ${(cause as Error).message}`,
      { cause },
    );
  }
};

import { isRefString } from './ref-guard.js';

/** Source of a regex matching a CSS `<number>`: `1`, `-1.5`, `.5`, `+5`, `1e3`. */
export const CSS_NUMBER: string = String.raw`[+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?`;

/**
 * Strip float noise from an arithmetic result (`0.1 * 3` → `0.3`). Only a
 * value within a few ulps of a 12-digit decimal is snapped to it; anything
 * else (`4 / 3`, `1234567890123.5`) is returned untouched.
 */
export const tidy = (n: number): number => {
  const snapped = Number(n.toPrecision(12));

  return Math.abs(snapped - n) <= 8 * Number.EPSILON * Math.abs(n) ? snapped : n;
};

/** Format a number for CSS output — never exponent notation. */
export const formatNumber = (n: number): string => {
  const s = String(n);

  if (!s.includes('e')) {
    return s;
  }

  if (Math.abs(n) >= 1) {
    return BigInt(n).toString();
  }

  const [mantissa, exponent] = s.split('e');
  const decimals = (mantissa!.split('.')[1]?.length ?? 0) - Number(exponent);

  return n.toFixed(Math.min(decimals, 100));
};

// A whitespace-padded `{ref}` is not a reference (the resolver matches
// strictly), so free-form string fields reject it instead of emitting it.
export const assertNotPaddedRef = (input: unknown, field: string): void => {
  if (typeof input === 'string' && input !== input.trim() && isRefString(input.trim())) {
    throw new Error(
      `${field} "${input}" looks like a reference with surrounding whitespace — ` +
        `write it as "${input.trim()}".`,
    );
  }
};

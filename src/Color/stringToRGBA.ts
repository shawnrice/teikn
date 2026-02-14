import { convert } from './ColorSpace';
import { parseColorString } from './parseColorString';
import type { RGBA } from './types';

/**
 * Takes a string and converts it to an RGBA tuple.
 *
 * Valid strings:
 * - hex: #RRGGBB or #RRGGBBAA
 * - rgb: rgb(r, g, b)
 * - rgba: rgba(r, g, b, a)
 * - hsl: hsl(h, s%, l%)
 * - hsla: hsla(h, s%, l%, a)
 * - lab: lab(L, a, b)
 * - lch: lch(L, C, H)
 * - xyz: xyz(x, y, z)
 * - named colors: red, aliceblue, green, etc.
 */
export const stringToRGBA = (c: string): RGBA => {
  const parsed = parseColorString(c);
  const rgb = parsed.space === 'rgb' ? parsed.data : convert(parsed.space, 'rgb', parsed.data);
  return [...(rgb as readonly [number, number, number]), parsed.alpha] as unknown as RGBA;
};

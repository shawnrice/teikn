import { hexToRGB } from './hexToRGB';
import { namedColors } from './namedColors';
import { RGBA } from './types';
import { isHex, isRGB, isRGBA, stringToRgb, stringToRgba } from './util';

/**
 * Takes a string and converts it to an RGBA tuple.
 *
 * Valid strings:
 * - hex: #RRGGBB or #RRGGBBAA
 * - rgb: rgb(r, g, b)
 * - rgba: rgba(r, g, b, a)
 * - named colors: red, aliceblue, green, etc.
 */
export const stringToRGBA = (c: string): RGBA => {
  if (Object.keys(namedColors).includes(c.toLowerCase())) {
    // @ts-expect-error: we've already checked for the key
    return stringToRGBA(namedColors[c.toLowerCase()]);
  }

  if (isHex(c)) {
    return [...hexToRGB(c), 1] as RGBA;
  }

  if (isRGB(c)) {
    return [...stringToRgb(c), 1] as RGBA;
  }

  if (isRGBA(c)) {
    return stringToRgba(c);
  }

  throw new Error(`Cannot extract color from "${c}"`);
};

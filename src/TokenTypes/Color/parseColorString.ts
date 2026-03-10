import type { Space, SpaceData } from './ColorSpace';
import { hexToRGBWithAlpha } from './conversions';
import { namedColors } from './namedColors';
import {
  isHex,
  isHSL,
  isHSLA,
  isLAB,
  isLCH,
  isRGB,
  isRGBA,
  isXYZ,
  normalizeDegrees,
  stringToRgb,
  stringToRgba,
} from './util';
import { xkcdColors } from './xkcdNamedColors';

export type ParsedColor = {
  space: Space;
  data: SpaceData[Space];
  alpha: number;
};

const hslRegex =
  /^hsla?\([\s]*(-?[0-9]+(?:\.[0-9]+)?)(?:deg)?[\s,]*([0-9]+(?:\.[0-9]+)?)%[\s,]*([0-9]+(?:\.[0-9]+)?)%(?:[\s,]*(?:\/[\s]*)?([0-9]*\.?[0-9]+))?\)$/i;
const labRegex =
  /^lab\([\s]*([0-9]+(?:\.[0-9]+)?)[\s,]*([+-]?[0-9]+(?:\.[0-9]+)?)[\s,]*([+-]?[0-9]+(?:\.[0-9]+)?)(?:[\s]*\/[\s]*([0-9]*\.?[0-9]+))?\)$/i;
const lchRegex =
  /^lch\([\s]*([0-9]+(?:\.[0-9]+)?)[\s,]*([0-9]+(?:\.[0-9]+)?)[\s,]*([0-9]+(?:\.[0-9]+)?)(?:[\s]*\/[\s]*([0-9]*\.?[0-9]+))?\)$/i;
const xyzRegex =
  /^xyz\([\s]*([0-9]+(?:\.[0-9]+)?)[\s,]*([0-9]+(?:\.[0-9]+)?)[\s,]*([0-9]+(?:\.[0-9]+)?)(?:[\s]*\/[\s]*([0-9]*\.?[0-9]+))?\)$/i;

const parseHSLString = (c: string): ParsedColor => {
  const m = c.match(hslRegex);
  if (!m) {
    throw new Error(`Cannot parse HSL from "${c}"`);
  }
  const h = normalizeDegrees(parseFloat(m[1]!));
  const s = parseFloat(m[2]!) / 100;
  const l = parseFloat(m[3]!) / 100;
  const a = m[4] !== undefined ? parseFloat(m[4]) : 1;
  return { space: 'hsl', data: [h, s, l], alpha: a };
};

const parseLABString = (c: string): ParsedColor => {
  const m = c.match(labRegex);
  if (!m) {
    throw new Error(`Cannot parse LAB from "${c}"`);
  }
  const L = parseFloat(m[1]!);
  const a = parseFloat(m[2]!);
  const b = parseFloat(m[3]!);
  const alpha = m[4] !== undefined ? parseFloat(m[4]) : 1;
  return { space: 'lab', data: [L, a, b], alpha };
};

const parseLCHString = (c: string): ParsedColor => {
  const m = c.match(lchRegex);
  if (!m) {
    throw new Error(`Cannot parse LCH from "${c}"`);
  }
  const L = parseFloat(m[1]!);
  const C = parseFloat(m[2]!);
  const H = parseFloat(m[3]!);
  const alpha = m[4] !== undefined ? parseFloat(m[4]) : 1;
  return { space: 'lch', data: [L, C, H], alpha };
};

const parseXYZString = (c: string): ParsedColor => {
  const m = c.match(xyzRegex);
  if (!m) {
    throw new Error(`Cannot parse XYZ from "${c}"`);
  }
  const x = parseFloat(m[1]!);
  const y = parseFloat(m[2]!);
  const z = parseFloat(m[3]!);
  const alpha = m[4] !== undefined ? parseFloat(m[4]) : 1;
  return { space: 'xyz', data: [x, y, z], alpha };
};

export const parseColorString = (c: string): ParsedColor => {
  const trimmed = c.trim();

  // xkcd named colors (e.g. "xkcd:seafoam", "xkcd:electric purple")
  if (trimmed.toLowerCase().startsWith('xkcd:')) {
    const name = trimmed.slice(5).toLowerCase();
    if (name in xkcdColors) {
      return parseColorString(xkcdColors[name as keyof typeof xkcdColors]);
    }
    throw new Error(`Unknown xkcd color "${name}"`);
  }

  // CSS named colors → resolve to their hex value and re-parse
  if (Object.keys(namedColors).includes(trimmed.toLowerCase())) {
    const resolved: string = namedColors[trimmed.toLowerCase() as keyof typeof namedColors];
    return parseColorString(resolved);
  }

  // Hex
  if (isHex(trimmed)) {
    const { rgb, alpha } = hexToRGBWithAlpha(trimmed);
    return { space: 'rgb', data: rgb, alpha };
  }

  // RGB / RGBA
  if (isRGB(trimmed)) {
    return { space: 'rgb', data: stringToRgb(trimmed), alpha: 1 };
  }
  if (isRGBA(trimmed)) {
    const rgba = stringToRgba(trimmed);
    return { space: 'rgb', data: [rgba[0], rgba[1], rgba[2]], alpha: rgba[3] };
  }

  // HSL / HSLA
  if (isHSL(trimmed) || isHSLA(trimmed)) {
    return parseHSLString(trimmed);
  }

  // LAB
  if (isLAB(trimmed)) {
    return parseLABString(trimmed);
  }

  // LCH
  if (isLCH(trimmed)) {
    return parseLCHString(trimmed);
  }

  // XYZ
  if (isXYZ(trimmed)) {
    return parseXYZString(trimmed);
  }

  throw new Error(`Cannot extract color from "${c}"`);
};

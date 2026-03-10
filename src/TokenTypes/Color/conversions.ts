import type { HSL, LAB, LCH, RGB, XYZ } from './types';
import { byteToUnit, pad0, parseInt16, pipe } from './util';

// Color space conversion references:
// - W3C CSS Color 4 conversions: https://github.com/w3c/csswg-drafts/blob/main/css-color-4/conversions.js
// - Bruce Lindbloom color math: http://www.brucelindbloom.com/index.html?Math.html
// - sRGB ↔ LAB/LCH conversions: https://mina86.com/2021/srgb-lab-lchab-conversions/

// ─── RGB ↔ HSL ──────────────────────────────────────────────

const getRawHue = (r: number, g: number, b: number): number => {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const chroma = max - min;

  switch (max) {
    case min:
      return 0;
    case r:
      return (g - b) / chroma;
    case g:
      return 2 + (b - r) / chroma;
    case b:
      return 4 + (r - g) / chroma;
    default:
      throw new Error('An unexpected error occurred');
  }
};

const getHue = (r: number, g: number, b: number): number => {
  const hue = Math.min(getRawHue(r, g, b) * 60, 360);
  return hue < 0 ? hue + 360 : hue;
};

const getLightness = (r: number, g: number, b: number): number =>
  (Math.min(r, g, b) + Math.max(r, g, b)) / 2;

const getSaturation = (r: number, g: number, b: number): number => {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const chroma = max - min;

  if (min === max) {
    return 0;
  }

  return chroma / (1 - Math.abs(2 * getLightness(r, g, b) - 1));
};

export const RGBToHSL = (rgb: RGB): HSL => {
  const [r, g, b] = rgb.map(byteToUnit) as [number, number, number];
  return [getHue(r, g, b), getSaturation(r, g, b), getLightness(r, g, b)];
};

export const HSLToRGB = ([hue, saturation, lightness]: HSL): RGB => {
  const f = (coefficient: number) => {
    const angle = saturation * Math.min(lightness, 1 - lightness);
    const k = (coefficient + hue / 30) % 12;
    return lightness - angle * Math.max(Math.min(k - 3, 9 - k, 1), -1);
  };

  return [0, 8, 4]
    .map(f)
    .map(x => x * 255)
    .map(Math.round) as unknown as RGB;
};

// ─── RGB ↔ XYZ ──────────────────────────────────────────────

// prettier-ignore
const sRGBToXYZMatrix = [
  [0.4124564, 0.3575761, 0.1804375],
  [0.2126729, 0.7151522, 0.0721750],
  [0.0193339, 0.1191920, 0.9503041],
] as const;

// prettier-ignore
const xyzToSRGBMatrix = [
  [ 3.2404542, -1.5371385, -0.4985314],
  [-0.969266,   1.8760108,  0.0415560],
  [ 0.0556434, -0.2040259,  1.0572252],
] as const;

const linearize = (v: number): number => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);

const applyGamma = (v: number): number =>
  v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055;

/**
 * sRGB to CIE-XYZ
 * @see https://www.image-engineering.de/library/technotes/958-how-to-convert-between-srgb-and-ciexyz
 * @see https://peteroupc.github.io/colorgen.html#Transformations_of_RGB_Colors
 * @see https://mina86.com/2021/srgb-lab-lchab-conversions/
 */
export const RGBToXYZ = (rgb: RGB): XYZ => {
  const [r, g, b] = rgb.map(byteToUnit).map(linearize) as [number, number, number];
  const m = sRGBToXYZMatrix;
  return [
    r * m[0][0] + g * m[0][1] + b * m[0][2],
    r * m[1][0] + g * m[1][1] + b * m[1][2],
    r * m[2][0] + g * m[2][1] + b * m[2][2],
  ];
};

/**
 * CIE-XYZ to sRGB
 * @see https://www.image-engineering.de/library/technotes/958-how-to-convert-between-srgb-and-ciexyz
 */
export const XYZToRGB = (xyz: XYZ): RGB => {
  const m = xyzToSRGBMatrix;
  return xyz
    .map((_, i) => xyz[0] * m[i]![0] + xyz[1] * m[i]![1] + xyz[2] * m[i]![2])
    .map(applyGamma)
    .map(x => x * 255)
    .map(Math.round) as unknown as RGB;
};

// ─── XYZ ↔ LAB ──────────────────────────────────────────────

/** D65 illuminant reference white point */
const D65 = [0.95047, 1.0, 1.08883] as const;
const [wpX, wpY, wpZ] = D65;

const labEpsilon = (6 / 29) ** 3; // 0.008856
const labKappa = (1 / 3) * (29 / 6) ** 2; // 7.787

export const XYZToLAB = ([x, y, z]: XYZ): LAB => {
  const f = (t: number): number => (t > labEpsilon ? Math.pow(t, 1 / 3) : labKappa * t + 16 / 116);
  const fx = f(x / D65[0]);
  const fy = f(y / D65[1]);
  const fz = f(z / D65[2]);

  const L = 116 * fy - 16;
  const a = 500 * (fx - fy);
  const b = 200 * (fy - fz);

  return [L, a, b];
};

export const LABToXYZ = ([L, a, b]: LAB): XYZ => {
  const y = (L + 16) / 116;
  const x = y + a / 500;
  const z = y - b / 200;

  const x3 = x * x * x;
  const y3 = y * y * y;
  const z3 = z * z * z;

  const xVal = x3 > labEpsilon ? x3 : (x - 16 / 116) / labKappa;
  const yVal = y3 > labEpsilon ? y3 : (y - 16 / 116) / labKappa;
  const zVal = z3 > labEpsilon ? z3 : (z - 16 / 116) / labKappa;

  return [xVal * wpX, yVal * wpY, zVal * wpZ] as XYZ;
};

// ─── LAB ↔ LCH ──────────────────────────────────────────────

const DEG = 180 / Math.PI;
const RAD = Math.PI / 180;

export const LABToLCH = ([L, a, b]: LAB): LCH => {
  const C = Math.sqrt(a * a + b * b);
  const H = Math.atan2(b, a) * DEG;
  return [L, C, H < 0 ? H + 360 : H];
};

export const LCHToLAB = ([l, c, h]: LCH): LAB => {
  // Convert degrees to radians
  const hRad = h * RAD;

  // Convert LCH to LAB
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);

  return [l, a, b];
};

// ─── Hex ─────────────────────────────────────────────────────

export const RGBToHex = (rgb: RGB, preferShort = false): string => {
  const initial = rgb.map(x => x.toString(16)).map(pad0);
  if (preferShort && initial.every(x => x.length === 2 && x[0] === x[1])) {
    return initial.map(x => x[0]).join('');
  }
  return initial.join('');
};

export type HexResult = { rgb: RGB; alpha: number };

export const hexToRGBWithAlpha = (c: string): HexResult => {
  // Possibly remove the hash
  const color = c.slice(0, 1) === '#' ? c.slice(1) : c;

  // 6-character hex: #RRGGBB
  if (color.length === 6) {
    const rgb = [color.slice(0, 2), color.slice(2, 4), color.slice(4, 6)].map(
      parseInt16,
    ) as unknown as RGB;
    return { rgb, alpha: 1 };
  }

  // 3-character hex: #RGB → expand each to double
  if (color.length === 3) {
    const rgb = color
      .split('')
      .map(x => `${x}${x}`)
      .map(parseInt16) as unknown as RGB;
    return { rgb, alpha: 1 };
  }

  // 8-character hex: #RRGGBBAA
  if (color.length === 8) {
    const rgb = [color.slice(0, 2), color.slice(2, 4), color.slice(4, 6)].map(
      parseInt16,
    ) as unknown as RGB;
    const alpha = parseInt16(color.slice(6, 8)) / 255;
    return { rgb, alpha };
  }

  // 4-character hex: #RGBA → expand each to double
  if (color.length === 4) {
    const rgb = color
      .slice(0, 3)
      .split('')
      .map(x => `${x}${x}`)
      .map(parseInt16) as unknown as RGB;
    const alphaChar = color[3]!;
    const alpha = parseInt16(`${alphaChar}${alphaChar}`) / 255;
    return { rgb, alpha };
  }

  throw new Error(`Cannot parse color ${c} as hex.`);
};

/** Backward-compatible wrapper — ignores alpha channel */
export const hexToRGB = (c: string): RGB => hexToRGBWithAlpha(c).rgb;

// ─── Compound ────────────────────────────────────────────────

export const HSLToHex: (hsl: HSL) => string = pipe(HSLToRGB, RGBToHex);

export const XYZToLCH: (xyz: XYZ) => LCH = pipe(XYZToLAB, LABToLCH);
export const LCHToXYZ: (lch: LCH) => XYZ = pipe(LCHToLAB, LABToXYZ);

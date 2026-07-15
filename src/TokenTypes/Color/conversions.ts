import type { HSL, LAB, LCH, Oklab, Oklch, RGB, XYZ } from './types.js';
import { byteToUnit, clamp, pad0, parseInt16, pipe } from './util.js';

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

  // Clamp before scaling: an out-of-range saturation/lightness can push a
  // channel outside [0, 1], which would otherwise emit an invalid byte.
  return [0, 8, 4].map(f).map(x => Math.round(clamp(0, 1, x) * 255)) as unknown as RGB;
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

  // Per-channel clamp to the sRGB gamut, mirroring `linearSRGBToByte`. Any
  // lab()/lch()/xyz() color outside sRGB (all legitimate CSS) reaches RGB
  // through this edge; without the clamp its channels fall outside [0, 255]
  // and produce an invalid, un-parseable hex string.
  return xyz
    .map((_, i) => xyz[0] * m[i]![0] + xyz[1] * m[i]![1] + xyz[2] * m[i]![2])
    .map(applyGamma)
    .map(x => Math.round(clamp(0, 1, x) * 255)) as unknown as RGB;
};

// ─── XYZ ↔ LAB ──────────────────────────────────────────────

/** D65 illuminant reference white point */
const D65 = [0.95047, 1.0, 1.08883] as const;
const [wpX, wpY, wpZ] = D65;

const labEpsilon = (6 / 29) ** 3; // 0.008856
const labKappa = (1 / 3) * (29 / 6) ** 2; // 7.787

export const XYZToLAB = ([x, y, z]: XYZ): LAB => {
  const f = (t: number): number => (t > labEpsilon ? t ** (1 / 3) : labKappa * t + 16 / 116);
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

// ─── linear sRGB ↔ Oklab ↔ Oklch ────────────────────────────
//
// Oklab (Björn Ottosson, 2020) is a perceptual color space; Oklch is its
// polar form. Conversion goes through *linear* sRGB — NOT XYZ — using the
// matrices published at https://bottosson.github.io/posts/oklab/.
//
// The graph edge that surfaces Oklab/Oklch to sRGB is `oklab → rgb`, and the
// only conversion paths that traverse it originate at oklab/oklch. That makes
// `OklabToRGB` the natural (and sufficient) place to gamut-map: an Oklch color
// outside sRGB is mapped back via CSS Color 4 chroma reduction instead of a
// naive per-channel clip.

const clamp01 = (v: number): number => clamp(0, 1, v);

/** Oklab → linear-light sRGB (channels may fall outside [0, 1] when out of gamut) */
const oklabToLinearSRGB = ([L, a, b]: Oklab): [number, number, number] => {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
};

/** linear-light sRGB → Oklab */
const linearSRGBToOklab = ([r, g, b]: readonly [number, number, number]): Oklab => {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
};

export const OklabToOklch = ([L, a, b]: Oklab): Oklch => {
  const C = Math.hypot(a, b);
  // Below this chroma the hue is meaningless (achromatic) — pin it to 0.
  const h = C < 1e-4 ? 0 : (((Math.atan2(b, a) * DEG) % 360) + 360) % 360;

  return [L, C, h];
};

export const OklchToOklab = ([L, C, h]: Oklch): Oklab => {
  const hRad = h * RAD;

  return [L, C * Math.cos(hRad), C * Math.sin(hRad)];
};

export const RGBToOklab = (rgb: RGB): Oklab =>
  linearSRGBToOklab(rgb.map(byteToUnit).map(linearize) as [number, number, number]);

const linInGamut = ([r, g, b]: readonly [number, number, number]): boolean =>
  r >= -1e-4 && r <= 1 + 1e-4 && g >= -1e-4 && g <= 1 + 1e-4 && b >= -1e-4 && b <= 1 + 1e-4;

/** Gamma-encode a linear-light sRGB triplet, clip to [0, 1], scale to 0-255 bytes */
const linearSRGBToByte = (lin: readonly [number, number, number]): RGB =>
  lin.map(applyGamma).map(v => Math.round(clamp01(v) * 255)) as unknown as RGB;

/** Euclidean ΔE in Oklab (the perceptual distance CSS Color 4 uses for gamut mapping) */
const deltaEOK = (a: Oklab, b: Oklab): number => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/**
 * Oklab → sRGB bytes with CSS Color 4 gamut mapping.
 *
 * If the color is already displayable it is converted directly. Otherwise we
 * hold L and h and binary-search a reduced chroma, using clip + Oklab ΔE
 * (JND ≈ 0.02) as the acceptance test — never a naive per-channel clip of the
 * full-chroma color.
 * @see https://www.w3.org/TR/css-color-4/#css-gamut-mapping
 */
export const OklabToRGB = (oklab: Oklab): RGB => {
  const direct = oklabToLinearSRGB(oklab);

  if (linInGamut(direct)) {
    return linearSRGBToByte(direct);
  }

  const [L, C, h] = OklabToOklch(oklab);

  // Degenerate lightness: no chroma can pull these into gamut.
  if (L >= 1) {
    return [255, 255, 255];
  }

  if (L <= 0) {
    return [0, 0, 0];
  }

  const JND = 0.02;
  const EPSILON = 1e-4;

  const linAt = (chroma: number): [number, number, number] =>
    oklabToLinearSRGB(OklchToOklab([L, chroma, h]));

  let current = linAt(C);
  let clipped: [number, number, number] = [
    clamp01(current[0]),
    clamp01(current[1]),
    clamp01(current[2]),
  ];

  if (deltaEOK(linearSRGBToOklab(clipped), linearSRGBToOklab(current)) < JND) {
    return linearSRGBToByte(clipped);
  }

  let min = 0;
  let max = C;
  let minInGamut = true;

  while (max - min > EPSILON) {
    const chroma = (min + max) / 2;
    current = linAt(chroma);

    if (minInGamut && linInGamut(current)) {
      min = chroma;
      continue;
    }

    clipped = [clamp01(current[0]), clamp01(current[1]), clamp01(current[2])];
    const E = deltaEOK(linearSRGBToOklab(clipped), linearSRGBToOklab(current));

    if (E < JND) {
      if (JND - E < EPSILON) {
        return linearSRGBToByte(clipped);
      }

      minInGamut = false;
      min = chroma;
    } else {
      max = chroma;
    }
  }

  return linearSRGBToByte([clamp01(current[0]), clamp01(current[1]), clamp01(current[2])]);
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

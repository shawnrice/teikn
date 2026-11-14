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
  // Normalise first: `%` keeps the sign, so a negative hue would break `k` below.
  const h = ((hue % 360) + 360) % 360;

  const f = (coefficient: number) => {
    const angle = saturation * Math.min(lightness, 1 - lightness);
    const k = (coefficient + h / 30) % 12;

    return lightness - angle * Math.max(Math.min(k - 3, 9 - k, 1), -1);
  };

  // Clamp before scaling: an out-of-range saturation/lightness can push a
  // channel outside [0, 1], which would otherwise emit an invalid byte.
  return [0, 8, 4].map(f).map(x => Math.round(clamp(0, 1, x) * 255)) as unknown as RGB;
};

// ─── RGB ↔ XYZ ──────────────────────────────────────────────

type Vec3 = readonly [number, number, number];
type Mat3 = readonly [Vec3, Vec3, Vec3];

const transform = (m: Mat3, [x, y, z]: Vec3): [number, number, number] => [
  m[0][0] * x + m[0][1] * y + m[0][2] * z,
  m[1][0] * x + m[1][1] * y + m[1][2] * z,
  m[2][0] * x + m[2][1] * y + m[2][2] * z,
];

// Exact rational matrices from the CSS Color 4 sample code (D65). The rounded
// 7-digit forms leave greys slightly chromatic once adapted to D50 for Lab.
// prettier-ignore
const sRGBToXYZMatrix: Mat3 = [
  [506752 / 1228815,  87881 / 245763,   12673 /   70218],
  [ 87098 /  409605, 175762 / 245763,   12673 /  175545],
  [  7918 /  409605,  87881 / 737289, 1001167 / 1053270],
];

// prettier-ignore
const xyzToSRGBMatrix: Mat3 = [
  [  12831 /   3959,    -329 /    214, -1974 /   3959],
  [-851781 / 878810, 1648619 / 878810, 36519 / 878810],
  [    705 /  12673,   -2585 /  12673,   705 /    667],
];

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
  const lin = rgb.map(byteToUnit).map(linearize) as [number, number, number];

  return transform(sRGBToXYZMatrix, lin);
};

/**
 * CIE-XYZ to sRGB
 * @see https://www.image-engineering.de/library/technotes/958-how-to-convert-between-srgb-and-ciexyz
 */
export const XYZToRGB = (xyz: XYZ): RGB => {
  const lin = transform(xyzToSRGBMatrix, xyz);

  // lab()/lch()/xyz() colors (all legitimate CSS) reach sRGB through this edge
  // and are often out of gamut. Out-of-gamut colors route through the same CSS
  // Color 4 chroma-reduction mapper oklab/oklch use, not a hue-distorting clip.
  return linInGamut(lin) ? linearSRGBToByte(lin) : OklabToRGB(linearSRGBToOklab(lin));
};

// ─── XYZ ↔ LAB ──────────────────────────────────────────────

// CSS Color 4 defines lab()/lch() relative to D50; teikn's `xyz` is D65, so
// Lab conversions adapt between the two with the spec's Bradford matrices.

/** D50 illuminant reference white point */
const D50 = [0.3457 / 0.3585, 1.0, (1.0 - 0.3457 - 0.3585) / 0.3585] as const;
const [wpX, wpY, wpZ] = D50;

// prettier-ignore
const D65ToD50Matrix: Mat3 = [
  [ 1.0479297925449969,   0.022946870601609652, -0.05019226628920524 ],
  [ 0.02962780877005599,  0.9904344267538799,   -0.017073799063418826],
  [-0.009243040646204504, 0.015055191490298152,  0.7518742814281371  ],
];

// prettier-ignore
const D50ToD65Matrix: Mat3 = [
  [ 0.955473421488075,    -0.02309845494876471,  0.06325924320057072 ],
  [-0.0283697093338637,    1.0099953980813041,   0.021041441191917323],
  [ 0.012314014864481998, -0.020507649298898964, 1.330365926242124   ],
];

const labEpsilon = (6 / 29) ** 3; // 0.008856
const labKappa = (1 / 3) * (29 / 6) ** 2; // 7.787

const labF = (t: number): number => (t > labEpsilon ? t ** (1 / 3) : labKappa * t + 16 / 116);

export const XYZToLAB = (xyz: XYZ): LAB => {
  const [x, y, z] = transform(D65ToD50Matrix, xyz);
  const fx = labF(x / wpX);
  const fy = labF(y / wpY);
  const fz = labF(z / wpZ);

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

  return transform(D50ToD65Matrix, [xVal * wpX, yVal * wpY, zVal * wpZ]);
};

// ─── LAB ↔ LCH ──────────────────────────────────────────────

const DEG = 180 / Math.PI;
const RAD = Math.PI / 180;

export const LABToLCH = ([L, a, b]: LAB): LCH => {
  const C = Math.sqrt(a * a + b * b);

  // Below this chroma the hue is meaningless (achromatic) — pin it to 0.
  if (C < 0.0015) {
    return [L, C, 0];
  }

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

// Unquantised, un-gamut-mapped bridge between the XYZ side and the Oklab side.
export const XYZToOklab = (xyz: XYZ): Oklab => linearSRGBToOklab(transform(xyzToSRGBMatrix, xyz));

export const OklabToXYZ = (oklab: Oklab): XYZ =>
  transform(sRGBToXYZMatrix, oklabToLinearSRGB(oklab));

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

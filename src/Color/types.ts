// Generic helper type to add alpha channel
type WithAlpha<T extends readonly number[]> = readonly [...T, alpha: number];

// Base color space types
export type RGB = readonly [red: number, green: number, blue: number];
export type HSL = readonly [hue: number, saturation: number, lightness: number];
export type XYZ = readonly [x: number, y: number, z: number];
export type LAB = readonly [lightness: number, a: number, b: number];
export type LCH = readonly [lightness: number, chroma: number, hue: number];
export type CMYK = readonly [cyan: number, magenta: number, yellow: number, black: number];

// Alpha variants using the helper type
export type RGBA = WithAlpha<RGB>;
export type HSLA = WithAlpha<HSL>;
export type XYZA = WithAlpha<XYZ>;
export type LABA = WithAlpha<LAB>;
export type LCHA = WithAlpha<LCH>;
export type CMYKA = WithAlpha<CMYK>;

// Type definitions
export type ColorFormat =
  | 'rgb'
  | 'rgba'
  | 'hex3'
  // | 'hex4' // hex3 + alpha
  // | 'hex6' // same as 'hex'
  // | 'hex8' // hex6 + alpha
  | 'hex' // same as 'hex6'
  | 'hsl'
  | 'hsla'
  // | 'xyz'  // not yet supported
  // | 'xyza' // not yet supported
  // | 'lab'  // not yet supported
  // | 'laba' // not yet supported
  // | 'lch'  // not yet supported
  // | 'lcha' // not yet supported
  // | 'cmyk' // not yet supported
  // | 'cmyka' // not yet supported
  | 'named';

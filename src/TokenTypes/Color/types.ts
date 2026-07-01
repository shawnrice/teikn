// Generic helper type to add alpha channel
type WithAlpha<T extends readonly number[]> = readonly [...T, alpha: number];

// Base color space types
export type RGB = readonly [red: number, green: number, blue: number];
export type HSL = readonly [hue: number, saturation: number, lightness: number];
export type XYZ = readonly [x: number, y: number, z: number];
export type LAB = readonly [lightness: number, a: number, b: number];
export type LCH = readonly [lightness: number, chroma: number, hue: number];
// Oklab / Oklch (Björn Ottosson's perceptual space + its polar form)
export type Oklab = readonly [lightness: number, a: number, b: number];
export type Oklch = readonly [lightness: number, chroma: number, hue: number];

// Alpha variants using the helper type
export type RGBA = WithAlpha<RGB>;
export type HSLA = WithAlpha<HSL>;
export type XYZA = WithAlpha<XYZ>;
export type LABA = WithAlpha<LAB>;
export type LCHA = WithAlpha<LCH>;
export type OklabA = WithAlpha<Oklab>;
export type OklchA = WithAlpha<Oklch>;

export type ColorBlindnessType =
  | 'protanopia'
  | 'deuteranopia'
  | 'tritanopia'
  | 'protanomaly'
  | 'deuteranomaly'
  | 'tritanomaly';

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
  | 'xyz'
  | 'xyza'
  | 'lab'
  | 'laba'
  | 'lch'
  | 'lcha'
  | 'oklab'
  | 'oklaba'
  | 'oklch'
  | 'oklcha'
  | 'named'
  | 'xkcd';

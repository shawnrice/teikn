import type { RGB, RGBA } from './types';

/** Compose two unary functions: `pipe(f, g)(x)` === `g(f(x))` */
export const pipe =
  <A, B, C>(f: (a: A) => B, g: (b: B) => C) =>
  (a: A): C =>
    g(f(a));

// Utility functions
export const clamp = (min: number, max: number, n: number): number => Math.min(Math.max(n, min), max);
export const pad0 = (x: string): string => (x.toString().length < 2 ? `0${x}` : x);
export const hexRange = (num: number): number => clamp(0, 255, num);
export const percentRange = (num: number): number => clamp(0, 1, num);
export const degreeRange = (num: number): number => clamp(0, 360, num);

export const byteToUnit = (x: number): number => x / 255;
export const unitToByte = (x: number): number => Math.round(x * 255);

export const round = (digits: number, n: number): number =>
  Math.round(n * 10 ** digits) / 10 ** digits;

export const roundArray =
  (numbers: number[]) =>
  (arr: number[]): number[] =>
    arr.map((v, i) => round(numbers[i] ?? 0, v));

export const roundHSL: (arr: number[]) => number[] = roundArray([0, 2, 2]);

export const toPercentage = (n: number, precision = 0): number =>
  Math.round(n * 10 ** (2 + precision)) / 10 ** precision;

export const toPercent = (n: number, precision = 0): string => `${toPercentage(n, precision)}%`;

export const parseInt16 = (x: string): number => parseInt(x, 16);
export const parseInt10 = (x: string): number => parseInt(x, 10);

const inRange = (lower: number, upper: number, number: number) =>
  lower <= number && number <= upper;

const inHex = (x: number) => inRange(0, 255, x); // 0-255
const inUnit = (x: number) => inRange(0, 1, x); // 0-1
const inDegrees = (x: number) => inRange(0, 359, x); // 0-359
const inPercent = (x: number) => inRange(0, 100, x); // 0-100

const regex = {
  hex: /^(#)?[a-f0-9]{3,6}$/i,
  rgb: /^rgb\(([0-9]{1,3})[\s,]*([0-9]{1,3})[\s,]*([0-9]{1,3})\)$/i,
  rgba: /^rgba\([\s]*([0-9]{1,3})[\s,]*([0-9]{1,3})[\s,]*([0-9]{1,3})[\s,]*([0-9.]+)\)$/i,
  hsl: /^hsl\([\s]*([0-9]{1,3})(?:deg)?[\s,]*([0-9]{1,3})%[\s,]*([0-9]{1,3})%(?:[\s]*\/[\s]*([0-9.]+))?\)$/i,
  hsla: /^hsla\([\s]*([0-9]{1,3})(?:deg)?[\s,]*([0-9]{1,3})%[\s,]*([0-9]{1,3})%[\s,]*([0-9.]+)\)$/i,
  lab: /^lab\(([0-9]{1,3}),[\s]*([0-9]{1,3}),[\s]*([0-9]{1,3})\)$/i,
  lch: /^lch\(([0-9]{1,3}),[\s]*([0-9]{1,3}),[\s]*([0-9]{1,3})\)$/i,
};

const formats = {
  rgb: {
    regex:
      /^rgb\(([0-9]{1,3}(?:\.[0-9]+)?)[\s,]*([0-9]{1,3}(?:\.[0-9]+)?)[\s,]*([0-9]{1,3}(?:\.[0-9]+)?)\)$/i,
    validators: [inHex, inHex, inHex],
    hasOptionalParams: true,
  },
  rgba: {
    regex:
      /^rgba\([\s]*([0-9]{1,3}(?:\.[0-9]+)?)[\s,]*([0-9]{1,3}(?:\.[0-9]+)?)[\s,]*([0-9]{1,3}(?:\.[0-9]+)?)[\s,]*([0-9]+(?:\.[0-9]+)?)\)$/i,
    validators: [inHex, inHex, inHex, inUnit],
    hasOptionalParams: false,
  },
  hsl: {
    regex:
      /^hsl\([\s]*([0-9]+(?:\.[0-9]+)?)(?:deg)?[\s,]*([0-9]+(?:\.[0-9]+)?)%[\s,]*([0-9]+(?:\.[0-9]+)?)%(?:[\s]*\/[\s]*([0-9]+(?:\.[0-9]+)?))?\)$/i,
    validators: [inDegrees, inPercent, inPercent, inUnit],
    hasOptionalParams: true,
  },
  hsla: {
    regex:
      /^hsla\([\s]*([0-9]+(?:\.[0-9]+)?)(?:deg)?[\s,]*([0-9]+(?:\.[0-9]+)?)%[\s,]*([0-9]+(?:\.[0-9]+)?)%[\s,]*([0-9]+(?:\.[0-9]+)?)\)$/i,
    validators: [inDegrees, inPercent, inPercent, inUnit],
    hasOptionalParams: false,
  },
  lab: {
    regex:
      /^lab\([\s]*([0-9]+(?:\.[0-9]+)?)[\s,]*([+-]?[0-9]+(?:\.[0-9]+)?)[\s,]*([+-]?[0-9]+(?:\.[0-9]+)?)(?:[\s]*\/[\s]*([0-9]+(?:\.[0-9]+)?))?\)$/i,
    validators: [
      (l: number) => inRange(0, 100, l), // L: 0 to 100
      (a: number) => inRange(-125, 125, a), // a: -125 to 125
      (b: number) => inRange(-125, 125, b), // b: -125 to 125
      inUnit, // alpha: 0 to 1
    ],
    hasOptionalParams: true,
  },
  lch: {
    regex:
      /^lch\([\s]*([0-9]+(?:\.[0-9]+)?)[\s,]*([0-9]+(?:\.[0-9]+)?)[\s,]*([0-9]+(?:\.[0-9]+)?)(?:[\s]*\/[\s]*([0-9]+(?:\.[0-9]+)?))?\)$/i,
    validators: [
      (l: number) => inRange(0, 100, l), // L: 0 to 100
      (c: number) => inRange(0, 150, c), // C: 0 to ~150
      (h: number) => inRange(0, 360, h), // H: 0 to 360
      inUnit, // alpha: 0 to 1
    ],
    hasOptionalParams: true,
  },
  xyz: {
    regex:
      /^xyz\([\s]*([0-9]+(?:\.[0-9]+)?)[\s,]*([0-9]+(?:\.[0-9]+)?)[\s,]*([0-9]+(?:\.[0-9]+)?)(?:[\s]*\/[\s]*([0-9]+(?:\.[0-9]+)?))?\)$/i,
    validators: [
      (x: number) => inRange(0, 0.95, x), // X: 0 to ~0.95
      (y: number) => inRange(0, 1, y), // Y: 0 to 1
      (z: number) => inRange(0, 1.08, z), // Z: 0 to ~1.08
      inUnit, // alpha: 0 to 1
    ],
    hasOptionalParams: true,
  },
} as const;

const isValidColor = (format: keyof typeof formats): ((color: string) => boolean) => {
  const { regex, validators, hasOptionalParams } = formats[format];

  return (color: string): boolean => {
    const c = color.trim();

    if (!regex.test(c)) {
      return false;
    }

    const matches = c.match(regex);
    if (!matches) {
      return false;
    }

    const components = matches.slice(1);

    // Parse and validate values
    return components.every((value, index) => {
      if (value === undefined) {
        // Allow undefined if it's the last parameter and optional params are allowed
        return hasOptionalParams && index === validators.length - 1;
      }

      const parsedValue = parseFloat(value);
      const validator = validators[index];
      return validator !== undefined && !Number.isNaN(parsedValue) && validator(parsedValue);
    });
  };
};

export const isHex = (c: string): boolean => regex.hex.test(c);
export const isRGB: (color: string) => boolean = isValidColor('rgb');
export const isRGBA: (color: string) => boolean = isValidColor('rgba');
export const isHSL: (color: string) => boolean = isValidColor('hsl');
export const isHSLA: (color: string) => boolean = isValidColor('hsla');
export const isLAB: (color: string) => boolean = isValidColor('lab');
export const isLCH: (color: string) => boolean = isValidColor('lch');
export const isXYZ: (color: string) => boolean = isValidColor('xyz');

/**
 * Call only on a verified RGB string
 */
export const stringToRgb = (c: string): RGB =>
  c.match(regex.rgb)!.slice(1).map(parseInt10) as unknown as RGB;

/**
 * Call only on a verified RGBA string
 */
export const stringToRgba = (c: string): RGBA =>
  c
    .match(regex.rgba)!
    .slice(1)
    .map((x, i) => (i === 3 ? parseFloat(x) : parseInt10(x))) as unknown as RGBA;

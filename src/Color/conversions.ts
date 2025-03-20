import { HSL, RGB } from './types';
import { byteToUnit, parseInt16 } from './util';

export const hexToRgb = (c: string): RGB => {
  // Possibly remove the hash
  const color = c.slice(0, 1) === '#' ? c.slice(1) : c;

  // If it's a 6-character hex, then just parse it
  if (color.length === 6) {
    return [color.slice(0, 2), color.slice(2, 4), color.slice(4, 6)].map(
      parseInt16,
    ) as unknown as RGB;
  }

  // If it's an abbreviated hex, then double each value and parse it as a 6 color hex
  if (color.length === 3) {
    return color
      .split('')
      .map(x => `${x}${x}`)
      .map(parseInt16) as unknown as RGB;
  }

  throw new Error(`Cannot parse color ${c} as hex.`);
};

export const rgbToHex = ([r, g, b]: RGB): string => {
  const hex = ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
  return `#${hex}`;
};

const getRawHue = (red: number, green: number, blue: number): number => {
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);

  const chroma = max - min;

  switch (max) {
    case min:
      return 0;
    case red:
      return (green - blue) / chroma;
    case green:
      return 2 + (blue - red) / chroma;
    case blue:
      return 4 + (red - green) / chroma;
    default:
      // Never
      throw new Error('An unexpected error occurred');
  }
};

const getHue = (red: number, green: number, blue: number): number => {
  const hue = Math.min(getRawHue(red, green, blue) * 60, 360);
  return hue < 0 ? hue + 360 : hue;
};

const getLightness = (red: number, green: number, blue: number): number => {
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);

  return (min + max) / 2;
};

const getSaturation = (red: number, green: number, blue: number): number => {
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const chroma = max - min;

  if (min === max) {
    return 0;
  }

  return chroma / (1 - Math.abs(2 * getLightness(red, green, blue) - 1));
};

export const rgbToHsl = (rgb: RGB): HSL => {
  const [r, g, b] = rgb.map(byteToUnit);
  const hue = getHue(r, g, b);
  const lightness = getLightness(r, g, b);
  const saturation = getSaturation(r, g, b);

  return [hue, saturation, lightness] as const;
};

export const rgbToXyz = (rgb: RGB): XYZ => {
  const [r, g, b] = rgb.map(byteToUnit);
  const x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 100;
  const y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 100;
  const z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 100;

  return [x, y, z] as const;
};

export const rgbToCmyk = (rgb: RGB): CMYK => {
  const [r, g, b] = rgb.map(byteToUnit);
  const k = Math.min(1 - r, 1 - g, 1 - b);
  const c = (1 - r - k) / (1 - k);
  const m = (1 - g - k) / (1 - k);
  const y = (1 - b - k) / (1 - k);

  return [c, m, y, k] as const;
};

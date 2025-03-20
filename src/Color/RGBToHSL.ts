import { HSL, RGB } from './types';
import { byteToUnit } from './util';

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

export const getHue = (red: number, green: number, blue: number): number => {
  const hue = Math.min(getRawHue(red, green, blue) * 60, 360);
  return hue < 0 ? hue + 360 : hue;
};

export const getLightness = (red: number, green: number, blue: number): number => {
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);

  return (min + max) / 2;
};

export const getSaturation = (red: number, green: number, blue: number): number => {
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const chroma = max - min;

  if (min === max) {
    return 0;
  }

  return chroma / (1 - Math.abs(2 * getLightness(red, green, blue) - 1));
};

export const RGBToHSL = (rgb: RGB): HSL => {
  const [r, g, b] = rgb.map(byteToUnit);
  return [getHue(r, g, b), getSaturation(r, g, b), getLightness(r, g, b)] as HSL;
};

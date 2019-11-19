import { HSLToRGB } from './HSLToRGB';
import { RGBToHex } from './RGBToHex';

export const HSLToHex = (hue: number, saturation: number, lightness: number) =>
  RGBToHex(...HSLToRGB(hue, saturation, lightness));

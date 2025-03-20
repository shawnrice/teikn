import type { HSL } from './types';

import { HSLToRGB } from './HSLToRGB';
import { RGBToHex } from './RGBToHex';

export const HSLToHex = (hsl: HSL): string => RGBToHex(HSLToRGB(hsl));

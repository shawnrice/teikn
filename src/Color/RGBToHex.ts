import type { RGB } from './types';
import { pad0 } from './util';

export const RGBToHex = (rgb: RGB, preferShort = false): string => {
  const initial = rgb.map(x => x.toString(16)).map(pad0);

  if (preferShort && initial.every(x => x.length === 2 && x[0] === x[1])) {
    return initial.map(x => x[0]).join('');
  }

  return initial.join('');
};

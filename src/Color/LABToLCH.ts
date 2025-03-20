import { LAB, LCH } from './types';

export const LABToLCH = ([L, a, b]: LAB): LCH => {
  const C = Math.sqrt(a * a + b * b);
  const H = Math.atan2(b, a) * (180 / Math.PI);

  return [L, C, H < 0 ? H + 360 : H];
};

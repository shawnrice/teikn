import { LAB, LCH } from './types';

export const LCHToLAB = ([l, c, h]: LCH): LAB => {
  // Convert degrees to radians
  const hRad = (h * Math.PI) / 180;

  // Convert LCH to LAB
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);

  return [l, a, b];
};

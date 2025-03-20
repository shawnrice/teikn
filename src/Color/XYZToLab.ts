import { LAB, XYZ } from './types';

export const XYZToLAB = ([x, y, z]: XYZ): LAB => {
  // Reference white point (D65)
  const xn = 0.95047;
  const yn = 1.0;
  const zn = 1.08883;

  // Helper function for the non-linear transformation
  const f = (t: number): number => {
    return t > 0.008856 ? Math.pow(t, 1 / 3) : 7.787 * t + 16 / 116;
  };

  const fx = f(x / xn);
  const fy = f(y / yn);
  const fz = f(z / zn);

  const L = 116 * fy - 16;
  const a = 500 * (fx - fy);
  const b = 200 * (fy - fz);

  return [L, a, b];
};

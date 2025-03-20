import { RGB, XYZ } from './types';

// prettier-ignore
const matrix = [
  [ 3.2404542, -1.5371385, -0.4985314],
  [-0.969266,   1.8760108,  0.0415560],
  [ 0.0556434, -0.2040259,  1.0572252],
];

const applyGamma = (v: number): number => {
  if (v <= 0.0031308) {
    return v * 12.92;
  }

  return 1.055 * v ** (1 / 2.4) - 0.055;
};

/**
 * Converts XYZ to RGB
 *
 * @see https://www.image-engineering.de/library/technotes/958-how-to-convert-between-srgb-and-ciexyz
 */
export const XYZToRGB = (xyz: XYZ): RGB => {
  return xyz
    .map((_, i) => xyz[0] * matrix[i][0] + xyz[1] * matrix[i][1] + xyz[2] * matrix[i][2])
    .map(applyGamma)
    .map(x => x * 255)
    .map(Math.round) as unknown as RGB;
};

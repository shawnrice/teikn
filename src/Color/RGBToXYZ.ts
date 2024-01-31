type RGBTuple = [number, number, number];

const linearize = (v: number): number => {
  if (v <= 0.04045) {
    return v / 12.92;
  }

  return ((v + 0.055) / 1.055) ** 2.4;
};

// prettier-ignore
const matrix = [
  [0.4124564, 0.3575761, 0.1804375],
  [0.2126729, 0.7151522, 0.0721750],
  [0.0193339, 0.1191920, 0.9503041],
] as const;

export type XYZTuple = [number, number, number];

/**
 * Coverts sRGB to CIE-XYZ
 * @see https://www.image-engineering.de/library/technotes/958-how-to-convert-between-srgb-and-ciexyz
 * @see https://peteroupc.github.io/colorgen.html#Transformations_of_RGB_Colors
 * @see https://mina86.com/2021/srgb-lab-lchab-conversions/
 */
export const RGBToXYZ = (rgb: RGBTuple): XYZTuple => {
  const [r, g, b] = rgb.map(x => x / 255).map(linearize);

  const x = r * matrix[0][0] + g * matrix[0][1] + b * matrix[0][2];
  const y = r * matrix[1][0] + g * matrix[1][1] + b * matrix[1][2];
  const z = r * matrix[2][0] + g * matrix[2][1] + b * matrix[2][2];

  return [x, y, z];
};

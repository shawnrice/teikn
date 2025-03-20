import { LAB, XYZ } from './types';

const labLinearCoefficient = (1 / 3) * (29 / 6) ** 2; // 7.787
const magicNumber = (6 / 29) ** 3; // 0.008856;
const whitePoint = [0.95047, 1.0, 1.08883]; // D65 illuminant
const [wpX, wpY, wpZ] = whitePoint;

export const LABToXYZ = ([L, a, b]: LAB): XYZ => {
  const y = (L + 16) / 116;
  const x = y + a / 500;
  const z = y - b / 200;

  const x3 = x * x * x;
  const y3 = y * y * y;
  const z3 = z * z * z;

  const xVal = x3 > magicNumber ? x3 : (x - 16 / 116) / labLinearCoefficient;
  const yVal = y3 > magicNumber ? y3 : (y - 16 / 116) / labLinearCoefficient;
  const zVal = z3 > magicNumber ? z3 : (z - 16 / 116) / labLinearCoefficient;

  return [xVal * wpX, yVal * wpY, zVal * wpZ] as XYZ;
};

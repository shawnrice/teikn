import {
  HSLToRGB,
  LABToLCH,
  LABToXYZ,
  LCHToLAB,
  OklabToOklch,
  OklabToRGB,
  OklchToOklab,
  RGBToHSL,
  RGBToOklab,
  RGBToXYZ,
  XYZToLAB,
  XYZToRGB,
} from './conversions.js';
import type { HSL, LAB, LCH, Oklab, Oklch, RGB, XYZ } from './types.js';

export type Space = 'rgb' | 'hsl' | 'xyz' | 'lab' | 'lch' | 'oklab' | 'oklch';

export type SpaceData = {
  hsl: HSL;
  lab: LAB;
  lch: LCH;
  oklab: Oklab;
  oklch: Oklch;
  rgb: RGB;
  xyz: XYZ;
};

type DirectConversion = {
  [From in Space]?: {
    [To in Space]?: (data: SpaceData[From]) => SpaceData[To];
  };
};

const direct: DirectConversion = {
  hsl: { rgb: HSLToRGB },
  lab: { xyz: LABToXYZ, lch: LABToLCH },
  lch: { lab: LCHToLAB },
  oklab: { rgb: OklabToRGB, oklch: OklabToOklch },
  oklch: { oklab: OklchToOklab },
  rgb: { hsl: RGBToHSL, xyz: RGBToXYZ, oklab: RGBToOklab },
  xyz: { rgb: XYZToRGB, lab: XYZToLAB },
};

// Hardcoded shortest paths through the conversion graph:
//   HSL ↔ RGB ↔ XYZ ↔ LAB ↔ LCH
//             ↕
//           Oklab ↔ Oklch
const paths: Record<Space, Record<Space, Space[]>> = {
  hsl: {
    hsl: [],
    lab: ['rgb', 'xyz', 'lab'],
    lch: ['rgb', 'xyz', 'lab', 'lch'],
    oklab: ['rgb', 'oklab'],
    oklch: ['rgb', 'oklab', 'oklch'],
    rgb: ['rgb'],
    xyz: ['rgb', 'xyz'],
  },
  lab: {
    hsl: ['xyz', 'rgb', 'hsl'],
    lab: [],
    lch: ['lch'],
    oklab: ['xyz', 'rgb', 'oklab'],
    oklch: ['xyz', 'rgb', 'oklab', 'oklch'],
    rgb: ['xyz', 'rgb'],
    xyz: ['xyz'],
  },
  lch: {
    hsl: ['lab', 'xyz', 'rgb', 'hsl'],
    lab: ['lab'],
    lch: [],
    oklab: ['lab', 'xyz', 'rgb', 'oklab'],
    oklch: ['lab', 'xyz', 'rgb', 'oklab', 'oklch'],
    rgb: ['lab', 'xyz', 'rgb'],
    xyz: ['lab', 'xyz'],
  },
  oklab: {
    hsl: ['rgb', 'hsl'],
    lab: ['rgb', 'xyz', 'lab'],
    lch: ['rgb', 'xyz', 'lab', 'lch'],
    oklab: [],
    oklch: ['oklch'],
    rgb: ['rgb'],
    xyz: ['rgb', 'xyz'],
  },
  oklch: {
    hsl: ['oklab', 'rgb', 'hsl'],
    lab: ['oklab', 'rgb', 'xyz', 'lab'],
    lch: ['oklab', 'rgb', 'xyz', 'lab', 'lch'],
    oklab: ['oklab'],
    oklch: [],
    rgb: ['oklab', 'rgb'],
    xyz: ['oklab', 'rgb', 'xyz'],
  },
  rgb: {
    hsl: ['hsl'],
    lab: ['xyz', 'lab'],
    lch: ['xyz', 'lab', 'lch'],
    oklab: ['oklab'],
    oklch: ['oklab', 'oklch'],
    rgb: [],
    xyz: ['xyz'],
  },
  xyz: {
    hsl: ['rgb', 'hsl'],
    lab: ['lab'],
    lch: ['lab', 'lch'],
    oklab: ['rgb', 'oklab'],
    oklch: ['rgb', 'oklab', 'oklch'],
    rgb: ['rgb'],
    xyz: [],
  },
};

type Conversion = (d: SpaceData[Space]) => SpaceData[Space];

type ConvertAcc = [data: SpaceData[Space], space: Space];

type IntermediateResults = Partial<{ [K in Space]: SpaceData[K] }>;

type ConvertWithIntermediatesAcc = [data: SpaceData[Space], space: Space, IntermediateResults];

export const convert = <To extends Space>(
  from: Space,
  to: To,
  data: SpaceData[Space],
): SpaceData[To] => {
  if (from === to) {
    return data as SpaceData[To];
  }

  const [d] = paths[from][to].reduce<ConvertAcc>(
    ([acc, prev], next) => [(direct[prev]![next]! as Conversion)(acc), next],
    [data, from],
  );

  return d as SpaceData[To];
};

export const convertWithIntermediates = (
  from: Space,
  to: Space,
  data: SpaceData[Space],
): IntermediateResults => {
  if (from === to) {
    return { [from]: data };
  }

  const [, , res] = paths[from][to].reduce<ConvertWithIntermediatesAcc>(
    ([acc, prev, history], next) => {
      const converted = (direct[prev]![next]! as Conversion)(acc);

      return [converted, next, { ...history, [next]: converted }];
    },
    [data, from, { [from]: data }],
  );

  return res;
};

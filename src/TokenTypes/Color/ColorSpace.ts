import {
  HSLToRGB,
  LABToLCH,
  LABToXYZ,
  LCHToLAB,
  RGBToHSL,
  RGBToXYZ,
  XYZToLAB,
  XYZToRGB,
} from "./conversions.js";
import type { HSL, LAB, LCH, RGB, XYZ } from "./types.js";

export type Space = "rgb" | "hsl" | "xyz" | "lab" | "lch";

export type SpaceData = {
  hsl: HSL;
  lab: LAB;
  lch: LCH;
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
  rgb: { hsl: RGBToHSL, xyz: RGBToXYZ },
  xyz: { rgb: XYZToRGB, lab: XYZToLAB },
};

// Hardcoded shortest paths through the conversion graph:
// HSL ↔ RGB ↔ XYZ ↔ LAB ↔ LCH
const paths: Record<Space, Record<Space, Space[]>> = {
  hsl: {
    hsl: [],
    lab: ["rgb", "xyz", "lab"],
    lch: ["rgb", "xyz", "lab", "lch"],
    rgb: ["rgb"],
    xyz: ["rgb", "xyz"],
  },
  lab: {
    hsl: ["xyz", "rgb", "hsl"],
    lab: [],
    lch: ["lch"],
    rgb: ["xyz", "rgb"],
    xyz: ["xyz"],
  },
  lch: {
    hsl: ["lab", "xyz", "rgb", "hsl"],
    lab: ["lab"],
    lch: [],
    rgb: ["lab", "xyz", "rgb"],
    xyz: ["lab", "xyz"],
  },
  rgb: {
    hsl: ["hsl"],
    lab: ["xyz", "lab"],
    lch: ["xyz", "lab", "lch"],
    rgb: [],
    xyz: ["xyz"],
  },

  xyz: {
    hsl: ["rgb", "hsl"],
    lab: ["lab"],
    lch: ["lab", "lch"],
    rgb: ["rgb"],
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

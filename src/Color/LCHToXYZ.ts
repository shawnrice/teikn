import { LABToXYZ } from './LabToXYZ';
import { LCHToLAB } from './LCHToLAB';
import type { LCH, XYZ } from './types';

export const LCHToXYZ = (lch: LCH): XYZ => LABToXYZ(LCHToLAB(lch));

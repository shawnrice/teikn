import { LABToLCH } from './LABToLCH';
import { LCH, XYZ } from './types';
import { XYZToLAB } from './XYZToLab';

export const XYZToLCH = (xyz: XYZ): LCH => LABToLCH(XYZToLAB(xyz));

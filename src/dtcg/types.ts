// Dtcg value types per the W3C spec
import type { DimensionUnit } from '../TokenTypes/Dimension.js';

export type DtcgColorValue = {
  colorSpace: string;
  components: [number, number, number];
  alpha?: number;
};

// The DTCG spec's dimension type is px/rem only, but teikn authors legitimately
// use font-relative and percentage units (em, %, …) for letter-spacing, radii,
// etc. We emit them as structured `{value, unit}` so they survive a round-trip
// rather than degrading to an unparseable raw string.
export type DtcgDimensionValue = { value: number; unit: DimensionUnit };

export type DtcgDurationValue = { value: number; unit: 'ms' | 's' };

export type DtcgStrokeStyleValue =
  | string
  | { dashArray: number[]; lineCap: 'butt' | 'round' | 'square' };

export type DtcgCubicBezierValue = [number, number, number, number];

export type DtcgGradientStop = { color: DtcgColorValue; position: number };

// Composite types
export type DtcgBorderValue = {
  color: DtcgColorValue | string;
  width: DtcgDimensionValue | string;
  style: DtcgStrokeStyleValue | string;
};

export type DtcgTransitionValue = {
  duration: DtcgDurationValue | string;
  timingFunction: DtcgCubicBezierValue | string;
  delay?: DtcgDurationValue | string;
};

export type DtcgShadowValue = {
  color: DtcgColorValue | string;
  offsetX: DtcgDimensionValue | string;
  offsetY: DtcgDimensionValue | string;
  blur: DtcgDimensionValue | string;
  spread: DtcgDimensionValue | string;
};

export type DtcgTypographyValue = {
  fontFamily: string | string[];
  fontSize: DtcgDimensionValue | string;
  fontWeight: number | string;
  lineHeight?: number | string;
  letterSpacing?: DtcgDimensionValue | string;
  [key: string]: unknown;
};

export type DtcgGradientValue = DtcgGradientStop[];

// Any Dtcg value
export type DtcgValue =
  | DtcgColorValue
  | DtcgDimensionValue
  | DtcgDurationValue
  | DtcgStrokeStyleValue
  | DtcgCubicBezierValue
  | DtcgBorderValue
  | DtcgTransitionValue
  | DtcgShadowValue
  | DtcgTypographyValue
  | DtcgGradientValue
  | number
  | string
  | string[];

// Document structure
export type DtcgToken = {
  $value: DtcgValue | string;
  $type?: string;
  $description?: string;
  $deprecated?: boolean | string;
  $extensions?: Record<string, unknown>;
};

export type DtcgGroup = {
  $type?: string;
  $description?: string;
  $extensions?: Record<string, unknown>;
  [key: string]: DtcgGroup | DtcgToken | string | boolean | Record<string, unknown> | undefined;
};

export type DtcgDocument = Record<
  string,
  DtcgGroup | DtcgToken | string | boolean | Record<string, unknown> | undefined
>;

// Type name constants matching the Dtcg spec
export const DtcgTypes = {
  color: 'color',
  dimension: 'dimension',
  fontFamily: 'fontFamily',
  fontWeight: 'fontWeight',
  duration: 'duration',
  cubicBezier: 'cubicBezier',
  number: 'number',
  strokeStyle: 'strokeStyle',
  border: 'border',
  transition: 'transition',
  shadow: 'shadow',
  gradient: 'gradient',
  typography: 'typography',
  fontStyle: 'fontStyle',
} as const;

export type DtcgTypeName = (typeof DtcgTypes)[keyof typeof DtcgTypes];

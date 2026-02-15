// DTCG value types per the W3C spec
export type DTCGColorValue = {
  colorSpace: string;
  components: [number, number, number];
  alpha?: number;
};

export type DTCGDimensionValue = {
  value: number;
  unit: 'px' | 'rem';
};

export type DTCGDurationValue = {
  value: number;
  unit: 'ms' | 's';
};

export type DTCGStrokeStyleValue = string | {
  dashArray: number[];
  lineCap: 'butt' | 'round' | 'square';
};

export type DTCGCubicBezierValue = [number, number, number, number];

export type DTCGGradientStop = {
  color: DTCGColorValue;
  position: number;
};

// Composite types
export type DTCGBorderValue = {
  color: DTCGColorValue | string;
  width: DTCGDimensionValue | string;
  style: DTCGStrokeStyleValue | string;
};

export type DTCGTransitionValue = {
  duration: DTCGDurationValue | string;
  timingFunction: DTCGCubicBezierValue | string;
  delay?: DTCGDurationValue | string;
};

export type DTCGShadowValue = {
  color: DTCGColorValue | string;
  offsetX: DTCGDimensionValue | string;
  offsetY: DTCGDimensionValue | string;
  blur: DTCGDimensionValue | string;
  spread: DTCGDimensionValue | string;
};

export type DTCGTypographyValue = {
  fontFamily: string | string[];
  fontSize: DTCGDimensionValue | string;
  fontWeight: number | string;
  lineHeight?: number | string;
  letterSpacing?: DTCGDimensionValue | string;
  [key: string]: unknown;
};

export type DTCGGradientValue = DTCGGradientStop[];

// Any DTCG value
export type DTCGValue =
  | DTCGColorValue
  | DTCGDimensionValue
  | DTCGDurationValue
  | DTCGStrokeStyleValue
  | DTCGCubicBezierValue
  | DTCGBorderValue
  | DTCGTransitionValue
  | DTCGShadowValue
  | DTCGTypographyValue
  | DTCGGradientValue
  | number
  | string
  | string[];

// Document structure
export type DTCGToken = {
  $value: DTCGValue | string;
  $type?: string;
  $description?: string;
  $deprecated?: boolean | string;
  $extensions?: Record<string, unknown>;
};

export type DTCGGroup = {
  $type?: string;
  $description?: string;
  $extensions?: Record<string, unknown>;
  [key: string]: DTCGGroup | DTCGToken | string | boolean | Record<string, unknown> | undefined;
};

export type DTCGDocument = Record<string, DTCGGroup | DTCGToken | string | boolean | Record<string, unknown> | undefined>;

// Type name constants matching the DTCG spec
export const DTCG_TYPES = {
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

export type DTCGTypeName = typeof DTCG_TYPES[keyof typeof DTCG_TYPES];

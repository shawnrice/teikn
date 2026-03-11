import { BoxShadow, BoxShadowList } from '../TokenTypes/BoxShadow';
import { Color } from '../TokenTypes/Color';
import { CubicBezier } from '../TokenTypes/CubicBezier';
import { Dimension } from '../TokenTypes/Dimension';
import { Duration, isDurationUnit } from '../TokenTypes/Duration';
import { GradientList, LinearGradient, RadialGradient } from '../TokenTypes/Gradient';
import { Transition, TransitionList } from '../TokenTypes/Transition';
import type {
  DTCGColorValue,
  DTCGCubicBezierValue,
  DTCGDimensionValue,
  DTCGDurationValue,
  DTCGGradientStop,
  DTCGGradientValue,
  DTCGShadowValue,
  DTCGValue,
} from './types';
import { DTCG_TYPES } from './types';

// ─── Helpers ─────────────────────────────────────────────────

const dimensionRe = /^(-?\d+(?:\.\d+)?)(px|rem)$/;
const durationRe = /^(-?\d+(?:\.\d+)?)(ms|s)$/;

const parseDimension = (str: string): { value: number; unit: 'px' | 'rem' } | null => {
  const m = str.match(dimensionRe);
  if (!m) {
    return null;
  }
  return { value: parseFloat(m[1]!), unit: m[2]! as 'px' | 'rem' };
};

const parseDuration = (str: string): { value: number; unit: 'ms' | 's' } | null => {
  const m = str.match(durationRe);
  if (!m) {
    return null;
  }
  return { value: parseFloat(m[1]!), unit: m[2]! as 'ms' | 's' };
};

const isAlias = (value: unknown): value is string =>
  typeof value === 'string' && value.startsWith('{') && value.endsWith('}');

// ─── DTCG → teikn type mapping ──────────────────────────────

const dtcgToTeiknMap: Record<string, string> = {
  fontFamily: 'font-family',
  fontWeight: 'font-weight',
  cubicBezier: 'timing',
  strokeStyle: 'strokeStyle',
  fontStyle: 'font-style',
};

const teiknToDtcgMap: Record<string, string> = {
  spacing: 'dimension',
  size: 'dimension',
  'border-radius': 'dimension',
  breakpoint: 'dimension',
  'font-size': 'dimension',
  'letter-spacing': 'dimension',
  'line-height': 'dimension',
  opacity: 'number',
  'z-layer': 'number',
  'z-index': 'number',
  'font-family': 'fontFamily',
  'font-weight': 'fontWeight',
  timing: 'cubicBezier',
  easing: 'cubicBezier',
  'font-style': 'fontStyle',
};

export const dtcgTypeToTeikn = (type: string): string => dtcgToTeiknMap[type] ?? type;

export const teiknTypeToDTCG = (type: string): string => teiknToDtcgMap[type] ?? type;

// ─── DTCG → teikn value converters ──────────────────────────

const colorToTeikn = (value: DTCGColorValue): Color => {
  const [r, g, b] = value.components;
  return Color.fromRGB(
    Math.round(r * 255),
    Math.round(g * 255),
    Math.round(b * 255),
    value.alpha ?? 1,
  );
};

const dimensionToTeikn = (value: DTCGDimensionValue): Dimension =>
  new Dimension(value.value, value.unit);

const durationToTeikn = (value: DTCGDurationValue): Duration =>
  new Duration(value.value, value.unit as 'ms' | 's');

const cubicBezierToTeikn = (value: DTCGCubicBezierValue): CubicBezier =>
  new CubicBezier(value[0], value[1], value[2], value[3]);

const shadowToTeikn = (value: DTCGShadowValue): BoxShadow => {
  const resolveColor = (c: DTCGColorValue | string): Color =>
    typeof c === 'string' ? new Color(c) : colorToTeikn(c);
  const resolveDim = (d: DTCGDimensionValue | string): number =>
    typeof d === 'string' ? parseFloat(d) : d.value;

  return new BoxShadow(
    resolveDim(value.offsetX),
    resolveDim(value.offsetY),
    resolveDim(value.blur),
    resolveDim(value.spread),
    resolveColor(value.color),
  );
};

const gradientToTeikn = (stops: DTCGGradientStop[]): LinearGradient => {
  const gradientStops = stops.map(stop => {
    const color = colorToTeikn(stop.color);
    const position = `${Math.round(stop.position * 100)}%`;
    return [color, position] as [Color, string];
  });
  return new LinearGradient(180, gradientStops);
};

const fontFamilyToTeikn = (value: string | string[]): string =>
  Array.isArray(value) ? value.join(', ') : value;

// ─── DTCG value type guards ──────────────────────────────────

const isDTCGDimension = (val: unknown): val is DTCGDimensionValue =>
  val != null && typeof val === 'object' && 'value' in val && 'unit' in val;

const isDTCGColor = (val: unknown): val is DTCGColorValue =>
  val != null && typeof val === 'object' && 'colorSpace' in val;

const isDTCGCubicBezier = (val: unknown): val is DTCGCubicBezierValue =>
  Array.isArray(val) && val.length === 4 && val.every(v => typeof v === 'number');

// ─── Composite field converter ───────────────────────────────

const convertCompositeFields = (obj: Record<string, unknown>): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (isAlias(val)) {
      result[key] = val;
    } else if (isDTCGDimension(val)) {
      const typed = val as { value: number; unit: string };
      result[key] = isDurationUnit(typed.unit)
        ? durationToTeikn(typed as DTCGDurationValue)
        : dimensionToTeikn(typed as DTCGDimensionValue);
    } else if (isDTCGColor(val)) {
      result[key] = colorToTeikn(val);
    } else if (isDTCGCubicBezier(val)) {
      result[key] = cubicBezierToTeikn(val);
    } else {
      result[key] = val;
    }
  }
  return result;
};

export const dtcgValueToTeikn = (value: DTCGValue, type: string): any => {
  if (isAlias(value)) {
    return value;
  }

  switch (type) {
    case DTCG_TYPES.color:
      return colorToTeikn(value as DTCGColorValue);
    case DTCG_TYPES.dimension:
      return dimensionToTeikn(value as DTCGDimensionValue);
    case DTCG_TYPES.duration:
      return durationToTeikn(value as DTCGDurationValue);
    case DTCG_TYPES.cubicBezier:
      return cubicBezierToTeikn(value as DTCGCubicBezierValue);
    case DTCG_TYPES.number:
      return value;
    case DTCG_TYPES.fontFamily:
      return fontFamilyToTeikn(value as string | string[]);
    case DTCG_TYPES.fontWeight:
      return value;
    case DTCG_TYPES.strokeStyle:
      return value;
    case DTCG_TYPES.fontStyle:
      return value;
    case DTCG_TYPES.shadow:
      return shadowToTeikn(value as DTCGShadowValue);
    case DTCG_TYPES.gradient:
      return gradientToTeikn(value as DTCGGradientValue);
    case DTCG_TYPES.border:
      return convertCompositeFields(value as Record<string, unknown>);
    case DTCG_TYPES.transition:
      return convertCompositeFields(value as Record<string, unknown>);
    case DTCG_TYPES.typography:
      return convertCompositeFields(value as Record<string, unknown>);
    default:
      return value;
  }
};

// ─── teikn → DTCG value converters ──────────────────────────

const colorToDTCG = (color: Color): DTCGColorValue => {
  const result: DTCGColorValue = {
    colorSpace: 'srgb',
    components: [color.red / 255, color.green / 255, color.blue / 255],
  };
  if (color.alpha !== 1) {
    result.alpha = color.alpha;
  }
  return result;
};

const stringDimensionToDTCG = (str: string): DTCGDimensionValue | string => {
  const parsed = parseDimension(str);
  return parsed ?? str;
};

const stringDurationToDTCG = (str: string): DTCGDurationValue | string => {
  const parsed = parseDuration(str);
  return parsed ?? str;
};

const cubicBezierToDTCG = (cb: CubicBezier): DTCGCubicBezierValue => [cb.x1, cb.y1, cb.x2, cb.y2];

const shadowToDTCG = (shadow: BoxShadow): DTCGShadowValue => ({
  color: colorToDTCG(shadow.color),
  offsetX: { value: shadow.offsetX, unit: 'px' },
  offsetY: { value: shadow.offsetY, unit: 'px' },
  blur: { value: shadow.blur, unit: 'px' },
  spread: { value: shadow.spread, unit: 'px' },
});

const gradientStopToDTCG = (stop: { color: Color; position?: string }): DTCGGradientStop => {
  const posStr = stop.position ?? '0%';
  const posNum = parseFloat(posStr) / 100;
  return {
    color: colorToDTCG(stop.color),
    position: isNaN(posNum) ? 0 : posNum,
  };
};

const gradientToDTCG = (gradient: LinearGradient | RadialGradient): DTCGGradientValue =>
  [...gradient.stops].map(gradientStopToDTCG);

// Convert a single teikn value (instanceof-based) to its DTCG representation.
// Returns null when the value is not a recognized first-class type.
const convertSingleValue = (value: unknown): DTCGValue | null => {
  if (value instanceof Color) {
    return colorToDTCG(value);
  }
  if (value instanceof CubicBezier) {
    return cubicBezierToDTCG(value);
  }
  if (value instanceof BoxShadow) {
    return shadowToDTCG(value);
  }
  if (value instanceof BoxShadowList) {
    return value.layers.map(shadowToDTCG) as unknown as DTCGValue;
  }
  if (value instanceof LinearGradient || value instanceof RadialGradient) {
    return gradientToDTCG(value);
  }
  if (value instanceof GradientList) {
    return value.layers.map(g => gradientToDTCG(g)) as unknown as DTCGValue;
  }
  if (value instanceof Dimension) {
    return { value: value.value, unit: value.unit } as DTCGDimensionValue;
  }
  if (value instanceof Duration) {
    return { value: value.value, unit: value.unit } as DTCGDurationValue;
  }
  return null;
};

const transitionToDTCG = (t: Transition): Record<string, unknown> => {
  const result: Record<string, unknown> = {
    duration: stringDurationToDTCG(t.duration),
    timingFunction: cubicBezierToDTCG(t.timingFunction),
  };
  if (t.delay && t.delay !== '0s') {
    result.delay = stringDurationToDTCG(t.delay);
  }
  if (t.property && t.property !== 'all') {
    result.property = t.property;
  }
  return result;
};

export const teiknValueToDTCG = (value: any, type: string): DTCGValue => {
  if (isAlias(value)) {
    return value;
  }

  const single = convertSingleValue(value);
  if (single !== null) {
    return single;
  }

  if (value instanceof TransitionList) {
    return value.layers.map(transitionToDTCG) as unknown as DTCGValue;
  }

  if (value instanceof Transition) {
    return transitionToDTCG(value) as DTCGValue;
  }

  if (typeof value === 'number') {
    return value;
  }

  const dtcgType = teiknTypeToDTCG(type);

  if (typeof value === 'string') {
    if (dtcgType === DTCG_TYPES.color) {
      try {
        return colorToDTCG(new Color(value));
      } catch {
        return value;
      }
    }
    if (dtcgType === DTCG_TYPES.dimension) {
      return stringDimensionToDTCG(value);
    }
    if (dtcgType === DTCG_TYPES.duration) {
      return stringDurationToDTCG(value);
    }
    return value;
  }

  // Composite objects — convert nested Color/CubicBezier/BoxShadow/dimensions
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      const converted = convertSingleValue(val);
      if (converted !== null) {
        result[key] = converted;
      } else if (typeof val === 'string') {
        const dim = parseDimension(val);
        if (dim) {
          result[key] = dim;
        } else {
          const dur = parseDuration(val);
          result[key] = dur ?? val;
        }
      } else {
        result[key] = val;
      }
    }
    return result as DTCGValue;
  }

  return value;
};

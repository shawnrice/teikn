import { BoxShadow, BoxShadowList } from "../TokenTypes/BoxShadow";
import { Color } from "../TokenTypes/Color";
import { CubicBezier } from "../TokenTypes/CubicBezier";
import { Dimension } from "../TokenTypes/Dimension";
import { Duration, isDurationUnit } from "../TokenTypes/Duration";
import { GradientList, LinearGradient, RadialGradient } from "../TokenTypes/Gradient";
import { Transition, TransitionList } from "../TokenTypes/Transition";
import type {
  DtcgColorValue,
  DtcgCubicBezierValue,
  DtcgDimensionValue,
  DtcgDurationValue,
  DtcgGradientStop,
  DtcgGradientValue,
  DtcgShadowValue,
  DtcgValue,
} from "./types";
import { DtcgTypes } from "./types";

// ─── Helpers ─────────────────────────────────────────────────

const dimensionRe = /^(-?\d+(?:\.\d+)?)(px|rem)$/;
const durationRe = /^(-?\d+(?:\.\d+)?)(ms|s)$/;

const parseDimension = (str: string): { value: number; unit: "px" | "rem" } | null => {
  const m = str.match(dimensionRe);
  if (!m) {
    return null;
  }
  return { value: parseFloat(m[1]!), unit: m[2]! as "px" | "rem" };
};

const parseDuration = (str: string): { value: number; unit: "ms" | "s" } | null => {
  const m = str.match(durationRe);
  if (!m) {
    return null;
  }
  return { value: parseFloat(m[1]!), unit: m[2]! as "ms" | "s" };
};

const isAlias = (value: unknown): value is string =>
  typeof value === "string" && value.startsWith("{") && value.endsWith("}");

// ─── Dtcg → teikn type mapping ──────────────────────────────

const dtcgToTeiknMap: Record<string, string> = {
  fontFamily: "font-family",
  fontWeight: "font-weight",
  cubicBezier: "timing",
  strokeStyle: "strokeStyle",
  fontStyle: "font-style",
};

const teiknToDtcgMap: Record<string, string> = {
  spacing: "dimension",
  size: "dimension",
  "border-radius": "dimension",
  breakpoint: "dimension",
  "font-size": "dimension",
  "letter-spacing": "dimension",
  "line-height": "dimension",
  opacity: "number",
  "z-layer": "number",
  "z-index": "number",
  "font-family": "fontFamily",
  "font-weight": "fontWeight",
  timing: "cubicBezier",
  easing: "cubicBezier",
  "font-style": "fontStyle",
};

export const dtcgTypeToTeikn = (type: string): string => dtcgToTeiknMap[type] ?? type;

export const teiknTypeToDtcg = (type: string): string => teiknToDtcgMap[type] ?? type;

// ─── Dtcg → teikn value converters ──────────────────────────

const colorToTeikn = (value: DtcgColorValue): Color => {
  const [r, g, b] = value.components;
  return Color.fromRGB(
    Math.round(r * 255),
    Math.round(g * 255),
    Math.round(b * 255),
    value.alpha ?? 1,
  );
};

const dimensionToTeikn = (value: DtcgDimensionValue): Dimension =>
  new Dimension(value.value, value.unit);

const durationToTeikn = (value: DtcgDurationValue): Duration =>
  new Duration(value.value, value.unit as "ms" | "s");

const cubicBezierToTeikn = (value: DtcgCubicBezierValue): CubicBezier =>
  new CubicBezier(value[0], value[1], value[2], value[3]);

const resolveDim = (d: DtcgDimensionValue | string): number =>
  typeof d === "string" ? parseFloat(d) : d.value;

const shadowToTeikn = (value: DtcgShadowValue): BoxShadow => {
  const resolveColor = (c: DtcgColorValue | string): Color =>
    typeof c === "string" ? new Color(c) : colorToTeikn(c);

  return new BoxShadow(
    resolveDim(value.offsetX),
    resolveDim(value.offsetY),
    resolveDim(value.blur),
    resolveDim(value.spread),
    resolveColor(value.color),
  );
};

const gradientToTeikn = (stops: DtcgGradientStop[]): LinearGradient => {
  const gradientStops = stops.map((stop) => {
    const color = colorToTeikn(stop.color);
    const position = `${Math.round(stop.position * 100)}%`;
    return [color, position] as [Color, string];
  });
  return new LinearGradient(180, gradientStops);
};

const fontFamilyToTeikn = (value: string | string[]): string =>
  Array.isArray(value) ? value.join(", ") : value;

// ─── Dtcg value type guards ──────────────────────────────────

const isDtcgDimension = (val: unknown): val is DtcgDimensionValue =>
  val != null && typeof val === "object" && "value" in val && "unit" in val;

const isDtcgColor = (val: unknown): val is DtcgColorValue =>
  val != null && typeof val === "object" && "colorSpace" in val;

const isDtcgCubicBezier = (val: unknown): val is DtcgCubicBezierValue =>
  Array.isArray(val) && val.length === 4 && val.every((v) => typeof v === "number");

// ─── Composite field converter ───────────────────────────────

const convertCompositeFields = (obj: Record<string, unknown>): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (isAlias(val)) {
      result[key] = val;
    } else if (isDtcgDimension(val)) {
      const typed = val as { value: number; unit: string };
      result[key] = isDurationUnit(typed.unit)
        ? durationToTeikn(typed as DtcgDurationValue)
        : dimensionToTeikn(typed as DtcgDimensionValue);
    } else if (isDtcgColor(val)) {
      result[key] = colorToTeikn(val);
    } else if (isDtcgCubicBezier(val)) {
      result[key] = cubicBezierToTeikn(val);
    } else {
      result[key] = val;
    }
  }
  return result;
};

export const dtcgValueToTeikn = (value: DtcgValue, type: string): any => {
  if (isAlias(value)) {
    return value;
  }

  switch (type) {
    case DtcgTypes.color:
      return colorToTeikn(value as DtcgColorValue);
    case DtcgTypes.dimension:
      return dimensionToTeikn(value as DtcgDimensionValue);
    case DtcgTypes.duration:
      return durationToTeikn(value as DtcgDurationValue);
    case DtcgTypes.cubicBezier:
      return cubicBezierToTeikn(value as DtcgCubicBezierValue);
    case DtcgTypes.number:
      return value;
    case DtcgTypes.fontFamily:
      return fontFamilyToTeikn(value as string | string[]);
    case DtcgTypes.fontWeight:
      return value;
    case DtcgTypes.strokeStyle:
      return value;
    case DtcgTypes.fontStyle:
      return value;
    case DtcgTypes.shadow:
      return shadowToTeikn(value as DtcgShadowValue);
    case DtcgTypes.gradient:
      return gradientToTeikn(value as DtcgGradientValue);
    case DtcgTypes.border:
      return convertCompositeFields(value as Record<string, unknown>);
    case DtcgTypes.transition:
      return convertCompositeFields(value as Record<string, unknown>);
    case DtcgTypes.typography:
      return convertCompositeFields(value as Record<string, unknown>);
    default:
      return value;
  }
};

// ─── teikn → Dtcg value converters ──────────────────────────

const colorToDtcg = (color: Color): DtcgColorValue => {
  const result: DtcgColorValue = {
    colorSpace: "srgb",
    components: [color.red / 255, color.green / 255, color.blue / 255],
  };
  if (color.alpha !== 1) {
    result.alpha = color.alpha;
  }
  return result;
};

const stringDimensionToDtcg = (str: string): DtcgDimensionValue | string => {
  const parsed = parseDimension(str);
  return parsed ?? str;
};

const stringDurationToDtcg = (str: string): DtcgDurationValue | string => {
  const parsed = parseDuration(str);
  return parsed ?? str;
};

const cubicBezierToDtcg = (cb: CubicBezier): DtcgCubicBezierValue => [cb.x1, cb.y1, cb.x2, cb.y2];

const gradientStopToDtcg = (stop: { color: Color; position?: string }): DtcgGradientStop => {
  const posStr = stop.position ?? "0%";
  const posNum = parseFloat(posStr) / 100;
  return {
    color: colorToDtcg(stop.color),
    position: isNaN(posNum) ? 0 : posNum,
  };
};

const gradientToDtcg = (gradient: LinearGradient | RadialGradient): DtcgGradientValue =>
  [...gradient.stops].map(gradientStopToDtcg);

// Convert a single teikn value (instanceof-based) to its Dtcg representation.
// Returns null when the value is not a recognized first-class type.
const convertSingleValue = (value: unknown, refMap?: DtcgRefMap): DtcgValue | null => {
  if (value instanceof Color) {
    return colorToDtcg(value);
  }
  if (value instanceof CubicBezier) {
    return cubicBezierToDtcg(value);
  }
  if (value instanceof BoxShadow) {
    return shadowToDtcgWithRefs(value, refMap);
  }
  if (value instanceof BoxShadowList) {
    return value.layers.map((s) => shadowToDtcgWithRefs(s, refMap)) as unknown as DtcgValue;
  }
  if (value instanceof LinearGradient || value instanceof RadialGradient) {
    return gradientToDtcg(value);
  }
  if (value instanceof GradientList) {
    return value.layers.map((g) => gradientToDtcg(g)) as unknown as DtcgValue;
  }
  if (value instanceof Dimension) {
    return { value: value.value, unit: value.unit } as DtcgDimensionValue;
  }
  if (value instanceof Duration) {
    return { value: value.value, unit: value.unit } as DtcgDurationValue;
  }
  return null;
};

export type DtcgRefMap = Map<unknown, string>;

const dtcgAlias = (name: string): string => `{${name}}`;

const durationToDtcg = (d: Duration): DtcgDurationValue => ({ value: d.value, unit: d.unit });

const transitionToDtcg = (t: Transition, refMap?: DtcgRefMap): Record<string, unknown> => {
  const ref = (v: unknown) => refMap?.get(v);
  const durRef = ref(t.duration);
  const tfRef = ref(t.timingFunction);
  const result: Record<string, unknown> = {
    duration: durRef ? dtcgAlias(durRef) : durationToDtcg(t.duration),
    timingFunction: tfRef ? dtcgAlias(tfRef) : cubicBezierToDtcg(t.timingFunction),
  };
  if (t.delay.value !== 0) {
    const delayRef = ref(t.delay);
    result.delay = delayRef ? dtcgAlias(delayRef) : durationToDtcg(t.delay);
  }
  if (t.property && t.property !== "all") {
    result.property = t.property;
  }
  return result;
};

const shadowToDtcgWithRefs = (shadow: BoxShadow, refMap?: DtcgRefMap): DtcgShadowValue => {
  const colorRef = refMap?.get(shadow.color);
  return {
    color: colorRef
      ? (dtcgAlias(colorRef) as unknown as DtcgColorValue)
      : colorToDtcg(shadow.color),
    offsetX: { value: shadow.offsetX, unit: "px" },
    offsetY: { value: shadow.offsetY, unit: "px" },
    blur: { value: shadow.blur, unit: "px" },
    spread: { value: shadow.spread, unit: "px" },
  };
};

export const teiknValueToDtcg = (value: any, type: string, refMap?: DtcgRefMap): DtcgValue => {
  if (isAlias(value)) {
    return value;
  }

  const single = convertSingleValue(value, refMap);
  if (single !== null) {
    return single;
  }

  if (value instanceof TransitionList) {
    return value.layers.map((t) => transitionToDtcg(t, refMap)) as unknown as DtcgValue;
  }

  if (value instanceof Transition) {
    return transitionToDtcg(value, refMap) as DtcgValue;
  }

  if (typeof value === "number") {
    return value;
  }

  const dtcgType = teiknTypeToDtcg(type);

  if (typeof value === "string") {
    if (dtcgType === DtcgTypes.color) {
      try {
        return colorToDtcg(new Color(value));
      } catch {
        return value;
      }
    }
    if (dtcgType === DtcgTypes.dimension) {
      return stringDimensionToDtcg(value);
    }
    if (dtcgType === DtcgTypes.duration) {
      return stringDurationToDtcg(value);
    }
    return value;
  }

  // Composite objects — convert nested Color/CubicBezier/BoxShadow/dimensions
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      const converted = convertSingleValue(val);
      if (converted !== null) {
        result[key] = converted;
      } else if (typeof val === "string") {
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
    return result as DtcgValue;
  }

  return value;
};

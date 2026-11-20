import { Border } from '../TokenTypes/Border.js';
import { BoxShadow, BoxShadowList } from '../TokenTypes/BoxShadow.js';
import { Color } from '../TokenTypes/Color/index.js';
import { CubicBezier } from '../TokenTypes/CubicBezier.js';
import { Dimension, isDimensionUnit } from '../TokenTypes/Dimension.js';
import type { DimensionUnit } from '../TokenTypes/Dimension.js';
import { Duration, isDurationUnit } from '../TokenTypes/Duration.js';
import type { GradientStop, StopInput } from '../TokenTypes/Gradient.js';
import { GradientList, LinearGradient, RadialGradient } from '../TokenTypes/Gradient.js';
import { Transition, TransitionList } from '../TokenTypes/Transition.js';
import type { TransitionInput } from '../TokenTypes/Transition.js';
import { Typography } from '../TokenTypes/Typography.js';
import { isFirstClassValue } from '../type-classifiers.js';
import type {
  DtcgColorValue,
  DtcgCubicBezierValue,
  DtcgDimensionValue,
  DtcgDurationValue,
  DtcgValue,
} from './types.js';
import { DtcgTypes } from './types.js';

// ─── Helpers ─────────────────────────────────────────────────

// Numeric prefix + unit suffix. The unit is validated against teikn's full set
// of dimension units (not just px/rem) so em, %, vh, etc. serialize to a
// structured `{value, unit}` DTCG dimension instead of an unparseable string.
const numberSrc = String.raw`[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?`;
const dimensionRe = new RegExp(`^(${numberSrc})([a-z%]+)$`, 'i');
const durationRe = new RegExp(`^(${numberSrc})(ms|s)$`, 'i');
const bareNumberRe = new RegExp(`^${numberSrc}$`, 'i');

const parseDimension = (str: string): { value: number; unit: DimensionUnit } | null => {
  const m = str.trim().match(dimensionRe);

  if (!m || !isDimensionUnit(m[2]!)) {
    return null;
  }

  return { value: parseFloat(m[1]!), unit: m[2]! as DimensionUnit };
};

const parseDuration = (str: string): { value: number; unit: 'ms' | 's' } | null => {
  const m = str.trim().match(durationRe);

  if (!m) {
    return null;
  }

  return { value: parseFloat(m[1]!), unit: m[2]!.toLowerCase() as 'ms' | 's' };
};

// Deliberately not a type guard: a non-alias string must stay a `string`.
const isAlias = (value: unknown): boolean =>
  typeof value === 'string' && value.startsWith('{') && value.endsWith('}');

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const tryMake = <T>(make: () => T): T | null => {
  try {
    return make();
  } catch {
    return null;
  }
};

// Trims float noise from unit conversions (×100, ÷100) so values round-trip.
const trim = (n: number, digits: number): number => Number(n.toFixed(digits));

/**
 * Rewrite every `{alias}` string in a DTCG value (top-level, composite fields,
 * array elements). `Object.fromEntries` keeps a `__proto__` key an own property.
 */
export const mapAliases = (value: unknown, rewrite: (alias: string) => string): unknown => {
  if (typeof value === 'string') {
    return isAlias(value) ? rewrite(value) : value;
  }

  if (Array.isArray(value)) {
    return value.map(item => mapAliases(item, rewrite));
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [key, mapAliases(val, rewrite)]),
    );
  }

  return value;
};

// ─── Dtcg → teikn type mapping ──────────────────────────────

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
  // Unitless ratio, not a length — DTCG has no line-height type, so `number`
  // is the faithful (and spec-valid) mapping. A `dimension` type here would
  // emit a bare number that the parser cannot reconstruct into a Dimension.
  'line-height': 'number',
  opacity: 'number',
  'z-layer': 'number',
  'z-index': 'number',
  'font-family': 'fontFamily',
  'font-weight': 'fontWeight',
  timing: 'cubicBezier',
  easing: 'cubicBezier',
  'font-style': 'fontStyle',
};

// Own-property lookups: a `$type` of `constructor` is just an unknown name.
export const dtcgTypeToTeikn = (type: string): string =>
  Object.hasOwn(dtcgToTeiknMap, type) ? dtcgToTeiknMap[type]! : type;

export const teiknTypeToDtcg = (type: string): string =>
  Object.hasOwn(teiknToDtcgMap, type) ? teiknToDtcgMap[type]! : type;

const dtcgTypeNames: ReadonlySet<string> = new Set(Object.values(DtcgTypes));

// The DTCG type a teikn type *name* implies, or undefined when it has none.
export const namedDtcgType = (type: string): string | undefined => {
  const mapped = teiknTypeToDtcg(type);

  return dtcgTypeNames.has(mapped) ? mapped : undefined;
};

// ─── CSS string → first-class value ─────────────────────────
// Shared by both directions: serializing a CSS string authored under a
// structured type, and parsing older-draft DTCG that used strings.

// Leading-dot numbers (`.2s`, `.5px`) trip the shorthand parsers.
const padLeadingDots = (str: string): string => str.replace(/(^|[\s,(])([+-]?)\.(\d)/g, '$1$20.$3');

const single = <L extends { length: number; at(index: number): unknown }>(list: L): unknown =>
  list.length === 1 ? list.at(0) : list;

const timeRe = /(?:^|[\s,])[+-]?(?:\d+\.?\d*|\.\d+)(?:ms|s)(?=$|[\s,])/i;

const stringParsers: Record<string, (str: string) => unknown> = {
  [DtcgTypes.color]: str => new Color(str),
  [DtcgTypes.cubicBezier]: str => new CubicBezier(str),
  [DtcgTypes.border]: str => new Border(str),
  [DtcgTypes.shadow]: str => single(new BoxShadowList(padLeadingDots(str))),
  [DtcgTypes.gradient]: str => single(new GradientList(str)),
  // The transition shorthand parser accepts any word as a property name, so
  // require an actual time value before trusting it.
  [DtcgTypes.transition]: str =>
    timeRe.test(str) ? single(new TransitionList(padLeadingDots(str))) : null,
  [DtcgTypes.dimension]: str => {
    const dim = parseDimension(str);

    return dim && new Dimension(dim.value, dim.unit);
  },
  [DtcgTypes.duration]: str => {
    const dur = parseDuration(str);

    return dur && new Duration(dur.value, dur.unit);
  },
};

const parseCssString = (str: string, dtcgType: string | undefined): unknown => {
  const parser =
    dtcgType !== undefined && Object.hasOwn(stringParsers, dtcgType)
      ? stringParsers[dtcgType]
      : undefined;

  if (!parser || str.trim() === '') {
    return null;
  }

  return tryMake(() => parser(str)) ?? null;
};

// ─── Dtcg → teikn value converters ──────────────────────────

// The DTCG object a Color was parsed from, re-emitted verbatim so `hex`,
// `"none"` components and exact floats survive. Colors are immutable, so any
// transformed color is a new instance and falls back to its computed form.
const colorSources = new WeakMap<Color, DtcgColorValue>();

// Color's sRGB channels are 8-bit, so a float component is rounded to the
// nearest byte. An untransformed parsed color still re-emits its exact floats
// through `colorSources`.
const toChannel = (unit: number): number => Math.round(unit * 255);

type ColorFactory = (a: number, b: number, c: number, alpha: number) => Color;

const colorFactories: Record<string, ColorFactory> = {
  srgb: (r, g, b, alpha) => Color.fromRGB([toChannel(r), toChannel(g), toChannel(b)], alpha),
  hsl: (h, s, l, alpha) => Color.fromHSL(h, s / 100, l / 100, alpha),
  lab: (l, a, b, alpha) => Color.fromLAB(l, a, b, alpha),
  lch: (l, c, h, alpha) => Color.fromLCH(l, c, h, alpha),
  oklab: (l, a, b, alpha) => Color.fromOklab(l, a, b, alpha),
  oklch: (l, c, h, alpha) => Color.fromOklch(l, c, h, alpha),
  'xyz-d65': (x, y, z, alpha) => Color.fromXYZ(x, y, z, alpha),
};

const isDtcgColor = (val: unknown): val is DtcgColorValue =>
  val != null && typeof val === 'object' && 'colorSpace' in val;

// A color space `Color` cannot represent (display-p3, hwb, …) is returned as
// the untouched DTCG object rather than being relabelled as sRGB.
const colorToTeikn = (value: unknown): unknown => {
  if (typeof value === 'string') {
    return parseCssString(value, DtcgTypes.color) ?? value;
  }

  if (!isDtcgColor(value) || !Array.isArray(value.components)) {
    return value;
  }

  const make = Object.hasOwn(colorFactories, value.colorSpace)
    ? colorFactories[value.colorSpace]
    : undefined;

  if (!make) {
    return value;
  }

  // `"none"` converts as 0.
  const [a, b, c] = (value.components as unknown[]).map(n => (typeof n === 'number' ? n : 0));
  const alpha = typeof value.alpha === 'number' ? value.alpha : 1;
  const color = make(a ?? 0, b ?? 0, c ?? 0, alpha);
  colorSources.set(color, value);

  return color;
};

const isDtcgDimension = (val: unknown): val is DtcgDimensionValue =>
  val != null && typeof val === 'object' && 'value' in val && 'unit' in val;

const dimensionToTeikn = (value: unknown): unknown => {
  if (typeof value === 'string') {
    return parseCssString(value, DtcgTypes.dimension) ?? value;
  }

  return isDtcgDimension(value) && typeof value.value === 'number' && isDimensionUnit(value.unit)
    ? new Dimension(value.value, value.unit)
    : value;
};

const durationToTeikn = (value: unknown): unknown => {
  if (typeof value === 'string') {
    return parseCssString(value, DtcgTypes.duration) ?? value;
  }

  return isDtcgDimension(value) && typeof value.value === 'number' && isDurationUnit(value.unit)
    ? new Duration(value.value, value.unit)
    : value;
};

const isDtcgCubicBezier = (val: unknown): val is DtcgCubicBezierValue =>
  Array.isArray(val) && val.length === 4 && val.every(v => typeof v === 'number');

const cubicBezierToTeikn = (value: unknown): unknown => {
  if (typeof value === 'string') {
    return parseCssString(value, DtcgTypes.cubicBezier) ?? value;
  }

  return isDtcgCubicBezier(value)
    ? (tryMake(() => new CubicBezier(value[0], value[1], value[2], value[3])) ?? value)
    : value;
};

type ShadowLength = { value: number; unit: string | null };

// A shadow length BoxShadow can hold: a number with a unit. Anything else (an
// alias, a malformed value) yields null.
const shadowLength = (d: unknown): ShadowLength | null => {
  if (d === undefined) {
    return { value: 0, unit: null };
  }

  if (isDtcgDimension(d) && typeof d.value === 'number' && typeof d.unit === 'string') {
    return { value: d.value, unit: d.unit };
  }

  if (typeof d !== 'string' || isAlias(d)) {
    return null;
  }

  const parsed = parseDimension(d);

  if (parsed) {
    return parsed;
  }

  return bareNumberRe.test(d.trim()) ? { value: parseFloat(d), unit: null } : null;
};

// An aliased color (a shared color token) comes back as a `{ref}` string and
// is kept as-is — BoxShadow holds it via the RefFields protocol.
const fieldColorToTeikn = (c: unknown): Color | string | null => {
  if (typeof c === 'string' && isAlias(c)) {
    return c;
  }

  const color = colorToTeikn(c);

  return color instanceof Color ? color : null;
};

// BoxShadow offsets are plain numbers sharing one unit, so a layer with an
// aliased length, an aliased layer, or an unrepresentable color yields null and
// the caller keeps the raw DTCG value instead of corrupting it.
const shadowToTeikn = (value: unknown): BoxShadow | null => {
  if (!isPlainObject(value) || (value.inset !== undefined && typeof value.inset !== 'boolean')) {
    return null;
  }

  const lengths = [value.offsetX, value.offsetY, value.blur, value.spread].map(shadowLength);
  const color = fieldColorToTeikn(value.color);

  if (color === null || lengths.includes(null)) {
    return null;
  }

  const [offsetX, offsetY, blur, spread] = lengths as ShadowLength[];
  // Zero is unit-agnostic; only non-zero lengths have to agree.
  const units = new Set(
    (lengths as ShadowLength[]).filter(l => l.value !== 0 && l.unit !== null).map(l => l.unit),
  );

  if (units.size > 1) {
    throw new Error(
      `DTCG parse: a shadow mixes length units (${[...units].join(', ')}). teikn's BoxShadow ` +
        `holds one unit for its offsets, blur and spread — use a single unit per shadow.`,
    );
  }

  const unit = [...units][0] ?? (lengths as ShadowLength[]).find(l => l.unit !== null)?.unit;

  return new BoxShadow({
    offsetX: offsetX!.value,
    offsetY: offsetY!.value,
    blur: blur!.value,
    spread: spread!.value,
    color,
    inset: value.inset === true,
    unit: unit ?? 'px',
  });
};

const shadowsToTeikn = (value: unknown): unknown => {
  if (typeof value === 'string') {
    return parseCssString(value, DtcgTypes.shadow) ?? value;
  }

  // DTCG allows a shadow `$value` to be an array of layers — reconstruct a
  // BoxShadowList in that case, mirroring how the list is serialized.
  if (Array.isArray(value)) {
    const layers = value.map(shadowToTeikn);

    return layers.includes(null) ? value : new BoxShadowList(layers as BoxShadow[]);
  }

  return shadowToTeikn(value) ?? value;
};

// A stop teikn can hold: a concrete or aliased color, and a numeric (or
// absent) position. An aliased position or whole-stop alias yields null.
const stopToTeikn = (stop: unknown): StopInput | null => {
  if (!isPlainObject(stop)) {
    return null;
  }

  const color = fieldColorToTeikn(stop.color);

  if (color === null) {
    return null;
  }

  if (stop.position === undefined) {
    return { color };
  }

  return typeof stop.position === 'number'
    ? { color, position: `${trim(stop.position * 100, 10)}%` }
    : null;
};

const gradientToTeikn = (stops: unknown): LinearGradient | null => {
  if (!Array.isArray(stops)) {
    return null;
  }

  const gradientStops = stops.map(stopToTeikn);

  return gradientStops.includes(null)
    ? null
    : new LinearGradient(180, gradientStops as StopInput[]);
};

const gradientsToTeikn = (value: unknown): unknown => {
  if (typeof value === 'string') {
    return parseCssString(value, DtcgTypes.gradient) ?? value;
  }

  // A GradientList serializes to an array of gradients (each itself an
  // array of stops); a single gradient is a flat array of stops. A nested
  // array therefore marks the list form.
  if (Array.isArray(value) && Array.isArray(value[0])) {
    const layers = value.map(gradientToTeikn);

    return layers.includes(null) ? value : new GradientList(layers as LinearGradient[]);
  }

  return gradientToTeikn(value) ?? value;
};

const fontFamilyToTeikn = (value: string | string[]): string =>
  Array.isArray(value) ? value.join(', ') : value;

// ─── Composite field converter ───────────────────────────────

// The DTCG shapes that mean one thing whatever the `$type` says: `{value,
// unit}` and `{colorSpace, components}`, at any depth, and four numbers in a
// field. This is what recovers the values of a token serialized with no
// `$type`. Strings are never touched.
const shapeToTeikn = (val: unknown): unknown => {
  if (Array.isArray(val)) {
    return val.map(shapeToTeikn);
  }

  if (!isPlainObject(val)) {
    return val;
  }

  if (isDtcgDimension(val) && Object.keys(val).length === 2) {
    return isDurationUnit(String(val.unit)) ? durationToTeikn(val) : dimensionToTeikn(val);
  }

  if (isDtcgColor(val)) {
    return colorToTeikn(val);
  }

  return Object.fromEntries(
    Object.entries(val).map(([key, field]) => [
      key,
      isDtcgCubicBezier(field) ? cubicBezierToTeikn(field) : shapeToTeikn(field),
    ]),
  );
};

const convertCompositeField = (val: unknown): unknown =>
  isDtcgCubicBezier(val) ? cubicBezierToTeikn(val) : shapeToTeikn(val);

// Only ever runs on an object: a string here (older-draft or hand-written
// input) is parsed when a constructor accepts it and otherwise left untouched.
const compositeToTeikn = (value: unknown, type: string): unknown => {
  if (typeof value === 'string') {
    return parseCssString(value, type) ?? value;
  }

  if (!isPlainObject(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, val]) => [key, convertCompositeField(val)]),
  );
};

const transitionsToTeikn = (value: unknown): unknown => {
  if (!Array.isArray(value)) {
    return compositeToTeikn(value, DtcgTypes.transition);
  }

  if (!value.every(isPlainObject)) {
    return value;
  }

  // A TransitionList serializes to an array of transition composites;
  // rebuild each layer into a Transition, mirroring the serialized form.
  return (
    tryMake(
      () =>
        new TransitionList(
          value.map(
            layer =>
              new Transition(
                compositeToTeikn(layer, DtcgTypes.transition) as unknown as TransitionInput,
              ),
          ),
        ),
    ) ?? value
  );
};

const typedValueToTeikn = (value: DtcgValue, type: string): any => {
  switch (type) {
    case DtcgTypes.color:
      return colorToTeikn(value);
    case DtcgTypes.dimension:
      // Structured `{value, unit}` rebuilds a Dimension; anything else (a bare
      // unitless string like "0", a legacy raw form) passes through untouched
      // rather than crashing the Dimension constructor.
      return dimensionToTeikn(value);
    case DtcgTypes.duration:
      return durationToTeikn(value);
    case DtcgTypes.cubicBezier:
      return cubicBezierToTeikn(value);
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
      return shadowsToTeikn(value);
    case DtcgTypes.gradient:
      return gradientsToTeikn(value);
    case DtcgTypes.border:
      return compositeToTeikn(value, DtcgTypes.border);
    case DtcgTypes.transition:
      return transitionsToTeikn(value);
    case DtcgTypes.typography:
      return compositeToTeikn(value, DtcgTypes.typography);
    default:
      return value;
  }
};

// ─── teikn → Dtcg value converters ──────────────────────────

/** A serialized value plus the DTCG `$type` it has, if any. */
export type DtcgConverted = { value: DtcgValue; type?: string };

export type DtcgRefMap = Map<unknown, string>;

const dtcgAlias = (name: string): string => `{${name}}`;

// Components in the color's own space — no forced conversion to sRGB.
const colorComponents = (color: Color): [string, [number, number, number]] => {
  switch (color.space) {
    case 'hsl': {
      const [h, s, l] = color.asHSL();

      return ['hsl', [h, trim(s * 100, 10), trim(l * 100, 10)]];
    }
    case 'lab':
      return ['lab', [...color.asLAB()]];
    case 'lch':
      return ['lch', [...color.asLCH()]];
    case 'oklab':
      return ['oklab', [...color.asOklab()]];
    case 'oklch':
      return ['oklch', [...color.asOklch()]];
    case 'xyz':
      return ['xyz-d65', [...color.asXYZ()]];
    default:
      return ['srgb', [color.red / 255, color.green / 255, color.blue / 255]];
  }
};

const colorToDtcg = (color: Color): DtcgColorValue => {
  const source = colorSources.get(color);

  if (source) {
    return { ...source, components: [...source.components] };
  }

  const [colorSpace, components] = colorComponents(color);
  const result: DtcgColorValue = { colorSpace, components };

  if (color.alpha !== 1) {
    result.alpha = color.alpha;
  }

  return result;
};

const cubicBezierToDtcg = (cb: CubicBezier): DtcgCubicBezierValue => [cb.x1, cb.y1, cb.x2, cb.y2];

const durationToDtcg = (d: Duration): DtcgDurationValue => ({ value: d.value, unit: d.unit });

// A wrapper field is a concrete value, OR — when it shares an instance with
// another token — an identity ref (emitted as a `{alias}`), OR a leftover
// `{ref}` string (already a valid DTCG alias, passed through verbatim).
const dimFieldToDtcg = (value: Dimension | string, refMap?: DtcgRefMap): unknown => {
  const refName = refMap?.get(value);

  if (refName) {
    return dtcgAlias(refName);
  }

  return value instanceof Dimension ? { value: value.value, unit: value.unit } : value;
};

const colorFieldToDtcg = (value: Color | string, refMap?: DtcgRefMap): unknown => {
  const refName = refMap?.get(value);

  if (refName) {
    return dtcgAlias(refName);
  }

  return value instanceof Color ? colorToDtcg(value) : value;
};

const percentRe = /^([+-]?(?:\d+\.?\d*|\.\d+))%$/;

// A stop's position as a DTCG 0–1 fraction; null when the stop has none.
const stopFraction = (position: string | undefined): number | string | null => {
  if (position === undefined) {
    return null;
  }

  if (isAlias(position)) {
    return position;
  }

  const m = position.trim().match(percentRe);

  if (!m) {
    throw new Error(
      `DTCG serialization: gradient stop position "${position}" cannot be expressed. DTCG stop ` +
        `positions are unitless fractions of the gradient axis, so only percentages convert; ` +
        `use a percentage position or drop the DTCG generator for this token.`,
    );
  }

  return trim(parseFloat(m[1]!) / 100, 12);
};

// CSS's rule for unpositioned stops: the first is 0, the last is 1, and the
// rest are spread evenly between their nearest positioned neighbours.
const stopPositions = (stops: readonly GradientStop[]): (number | string)[] => {
  const ends = new Map([
    [stops.length - 1, 1],
    [0, 0],
  ]);
  const anchored = stops.map((stop, i) => stopFraction(stop.position) ?? ends.get(i) ?? null);

  return anchored.map((p, i) => {
    if (p !== null) {
      return p;
    }

    const prev = anchored.findLastIndex((q, k) => k < i && q !== null);
    const next = anchored.findIndex((q, k) => k > i && q !== null);
    const from = anchored[prev];
    const to = anchored[next];

    if (typeof from !== 'number' || typeof to !== 'number') {
      throw new Error(
        `DTCG serialization: cannot place an unpositioned gradient stop next to an aliased ` +
          `position (${String(from)} … ${String(to)}); give the stop an explicit position.`,
      );
    }

    return trim(from + ((to - from) * (i - prev)) / (next - prev), 12);
  });
};

const gradientToDtcg = (
  gradient: LinearGradient | RadialGradient,
  refMap?: DtcgRefMap,
): unknown[] => {
  const positions = stopPositions(gradient.stops);

  // Handles an identity ref (shared Color → `{alias}`), a leftover `{ref}`
  // string, or a concrete color — same as shadow/border colors.
  return gradient.stops.map((stop, i) => ({
    color: colorFieldToDtcg(stop.color, refMap),
    position: positions[i],
  }));
};

const transitionToDtcg = (t: Transition, refMap?: DtcgRefMap): Record<string, unknown> => {
  // A shared instance → `{alias}`; an already-`{ref}` field (from a parsed
  // document) passes through verbatim; otherwise the concrete conversion.
  const field = <T>(value: T | string, toDtcg: (value: T) => unknown): unknown => {
    const refName = refMap?.get(value);

    if (refName) {
      return dtcgAlias(refName);
    }

    return isAlias(value) ? value : toDtcg(value as T);
  };

  const result: Record<string, unknown> = {
    duration: field(t.duration, durationToDtcg),
    timingFunction: field(t.timingFunction, cubicBezierToDtcg),
  };

  const delayHasValue = t.delay instanceof Duration && t.delay.value !== 0;

  if (isAlias(t.delay) || delayHasValue) {
    result.delay = field(t.delay, durationToDtcg);
  }

  if (t.property && t.property !== 'all') {
    result.property = t.property;
  }

  return result;
};

const shadowToDtcgWithRefs = (shadow: BoxShadow, refMap?: DtcgRefMap): Record<string, unknown> => {
  const { unit } = shadow;

  // DTCG `dimension` only permits px/rem. Relabelling an em shadow as px would
  // silently change its size, so refuse instead.
  if (unit !== 'px' && unit !== 'rem') {
    throw new Error(
      `DTCG serialization: a box-shadow in "${unit}" (${shadow.toString()}) cannot be expressed. ` +
        `DTCG shadow lengths are dimensions, which allow only px and rem; author the shadow in ` +
        `px or rem, or drop the DTCG generator for this token.`,
    );
  }

  return {
    // Handles an identity ref (shared Color → `{alias}`), a leftover `{ref}`
    // string, or a concrete color — mirroring how borders serialize their color.
    color: colorFieldToDtcg(shadow.color, refMap),
    offsetX: { value: shadow.offsetX, unit },
    offsetY: { value: shadow.offsetY, unit },
    blur: { value: shadow.blur, unit },
    spread: { value: shadow.spread, unit },
    ...(shadow.inset ? { inset: true } : {}),
  };
};

const typographyToDtcg = (t: Typography, refMap?: DtcgRefMap): Record<string, unknown> => {
  const result: Record<string, unknown> = {
    fontFamily: t.fontFamily,
    fontSize: dimFieldToDtcg(t.fontSize, refMap),
  };

  if (t.fontWeight !== null) {
    result.fontWeight = t.fontWeight;
  }

  if (t.lineHeight !== null) {
    result.lineHeight = t.lineHeight;
  }

  if (t.letterSpacing !== null) {
    result.letterSpacing = dimFieldToDtcg(t.letterSpacing, refMap);
  }

  return result;
};

const borderToDtcg = (b: Border, refMap?: DtcgRefMap): Record<string, unknown> => ({
  width: dimFieldToDtcg(b.width, refMap),
  style: b.style,
  color: colorFieldToDtcg(b.color, refMap),
});

const as = (type: string, converted: unknown): DtcgConverted => ({
  value: converted as DtcgValue,
  type,
});

// Convert a first-class teikn value (instanceof-based) to its Dtcg
// representation; the `$type` follows from the value, whatever the token's
// type is called. Returns null when the value is not a first-class type.
const convertInstance = (value: unknown, refMap?: DtcgRefMap): DtcgConverted | null => {
  if (value instanceof Color) {
    return as(DtcgTypes.color, colorToDtcg(value));
  }

  if (value instanceof CubicBezier) {
    return as(DtcgTypes.cubicBezier, cubicBezierToDtcg(value));
  }

  if (value instanceof BoxShadow) {
    return as(DtcgTypes.shadow, shadowToDtcgWithRefs(value, refMap));
  }

  if (value instanceof BoxShadowList) {
    return as(
      DtcgTypes.shadow,
      value.layers.map(s => shadowToDtcgWithRefs(s, refMap)),
    );
  }

  if (value instanceof LinearGradient || value instanceof RadialGradient) {
    return as(DtcgTypes.gradient, gradientToDtcg(value, refMap));
  }

  if (value instanceof GradientList) {
    return as(
      DtcgTypes.gradient,
      value.layers.map(g => gradientToDtcg(g, refMap)),
    );
  }

  if (value instanceof Dimension) {
    return as(DtcgTypes.dimension, { value: value.value, unit: value.unit });
  }

  if (value instanceof Duration) {
    return as(DtcgTypes.duration, durationToDtcg(value));
  }

  if (value instanceof TransitionList) {
    return as(
      DtcgTypes.transition,
      value.layers.map(t => transitionToDtcg(t, refMap)),
    );
  }

  if (value instanceof Transition) {
    return as(DtcgTypes.transition, transitionToDtcg(value, refMap));
  }

  if (value instanceof Typography) {
    return as(DtcgTypes.typography, typographyToDtcg(value, refMap));
  }

  if (value instanceof Border) {
    return as(DtcgTypes.border, borderToDtcg(value, refMap));
  }

  return null;
};

const untyped = (value: unknown): DtcgConverted => ({ value: value as DtcgValue });

// First-class values nested in arrays and objects (a list of dimensions, a
// border's `style.dashArray`), which have no DTCG type of their own.
const convertNested = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(convertNested);
  }

  const instance = convertInstance(value);

  if (instance !== null) {
    return instance.value;
  }

  return isPlainObject(value)
    ? Object.fromEntries(Object.entries(value).map(([key, val]) => [key, convertNested(val)]))
    : value;
};

// A string or number authored under a DTCG type. When the value cannot be
// expressed as that type (`currentColor`, `calc(…)`), it is emitted as-is with
// no `$type` rather than as an invalid structured token.
const convertScalar = (value: string | number, dtcgType: string | undefined): DtcgConverted => {
  if (isAlias(value)) {
    return dtcgType ? { value, type: dtcgType } : { value };
  }

  if (typeof value === 'number') {
    if (dtcgType === DtcgTypes.number || dtcgType === DtcgTypes.fontWeight) {
      return { value, type: dtcgType };
    }

    // A bare number in a length slot is read as px.
    return dtcgType === DtcgTypes.dimension && Number.isFinite(value)
      ? { value: { value, unit: 'px' }, type: dtcgType }
      : { value };
  }

  switch (dtcgType) {
    case DtcgTypes.fontFamily:
    case DtcgTypes.fontWeight:
    case DtcgTypes.fontStyle:
    case DtcgTypes.strokeStyle:
      return { value, type: dtcgType };
    case DtcgTypes.dimension: {
      const dim = parseDimension(value);

      if (dim) {
        return { value: dim, type: dtcgType };
      }

      return bareNumberRe.test(value.trim())
        ? { value: { value: parseFloat(value), unit: 'px' }, type: dtcgType }
        : { value };
    }
    case DtcgTypes.duration: {
      const dur = parseDuration(value);

      return dur ? { value: dur, type: dtcgType } : { value };
    }
    case DtcgTypes.number: {
      // A length under a unitless type name (`line-height: 24px`) is a dimension.
      const dim = parseDimension(value);

      if (dim) {
        return { value: dim, type: DtcgTypes.dimension };
      }

      return bareNumberRe.test(value.trim())
        ? { value: parseFloat(value), type: dtcgType }
        : { value };
    }
    default: {
      const parsed = parseCssString(value, dtcgType);

      return (parsed === null ? null : convertInstance(parsed)) ?? { value };
    }
  }
};

// String fields of the DTCG composite types that hold a typed sub-value.
const compositeFieldTypes: Record<string, Record<string, string>> = {
  [DtcgTypes.border]: { color: DtcgTypes.color, width: DtcgTypes.dimension },
  [DtcgTypes.shadow]: {
    color: DtcgTypes.color,
    offsetX: DtcgTypes.dimension,
    offsetY: DtcgTypes.dimension,
    blur: DtcgTypes.dimension,
    spread: DtcgTypes.dimension,
  },
  [DtcgTypes.transition]: {
    duration: DtcgTypes.duration,
    delay: DtcgTypes.duration,
    timingFunction: DtcgTypes.cubicBezier,
  },
  [DtcgTypes.typography]: { fontSize: DtcgTypes.dimension, letterSpacing: DtcgTypes.dimension },
};

// Composite objects — convert nested Color/CubicBezier/BoxShadow/dimensions
const convertComposite = (
  value: Record<string, unknown>,
  dtcgType: string | undefined,
): DtcgConverted => {
  const fieldTypes = dtcgType === undefined ? undefined : compositeFieldTypes[dtcgType];
  let expressible = true;

  const fields = Object.entries(value).map(([key, val]): [string, unknown] => {
    const converted = convertInstance(val);

    if (converted !== null) {
      return [key, converted.value];
    }

    if (typeof val !== 'string' && typeof val !== 'number') {
      return [key, convertNested(val)];
    }

    const fieldType = fieldTypes && Object.hasOwn(fieldTypes, key) ? fieldTypes[key] : undefined;

    // `normal` letter-spacing is kept verbatim, as the Typography class emits it.
    if (key === 'letterSpacing' && val === 'normal') {
      return [key, val];
    }

    if (fieldType !== undefined) {
      const field = convertScalar(val, fieldType);
      expressible &&= field.type !== undefined;

      return [key, field.value];
    }

    if (typeof val === 'number') {
      return [key, val];
    }

    // Under a type teikn does not own, a string is left as the string it is.
    return [key, dtcgType === undefined ? val : (parseDimension(val) ?? parseDuration(val) ?? val)];
  });

  const result = Object.fromEntries(fields) as DtcgValue;

  return dtcgType !== undefined && expressible
    ? { value: result, type: dtcgType }
    : untyped(result);
};

/**
 * Convert a teikn value to DTCG. The `$type` is derived from the value first
 * and the token's type name second; it is absent when neither yields a real
 * DTCG type, so the caller must omit `$type` rather than invent one.
 */
export const teiknToDtcg = (value: unknown, type: string, refMap?: DtcgRefMap): DtcgConverted => {
  const instance = convertInstance(value, refMap);

  if (instance !== null) {
    return instance;
  }

  const dtcgType = namedDtcgType(type);

  if (typeof value === 'string' || typeof value === 'number') {
    return convertScalar(value, dtcgType);
  }

  // A raw DTCG value kept by the parser (an unrepresentable color space, a
  // shadow or gradient holding aliases) goes back out untouched.
  if (isDtcgColor(value)) {
    return dtcgType ? { value: value as DtcgValue, type: dtcgType } : untyped(value);
  }

  // A list of first-class values is not a value of the token's type.
  if (Array.isArray(value)) {
    return dtcgType && !value.some(isFirstClassValue)
      ? { value: convertNested(value) as DtcgValue, type: dtcgType }
      : untyped(convertNested(value));
  }

  return isPlainObject(value) ? convertComposite(value, dtcgType) : untyped(value);
};

export const teiknValueToDtcg = (value: any, type: string, refMap?: DtcgRefMap): DtcgValue =>
  teiknToDtcg(value, type, refMap).value;

// ─── Dtcg → teikn, whole value ──────────────────────────────

const sameDtcg = (a: unknown, b: unknown): boolean => {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, i) => sameDtcg(item, b[i]));
  }

  if (!isPlainObject(a) || !isPlainObject(b)) {
    return a === b;
  }

  const keys = Object.keys(a);

  return (
    keys.length === Object.keys(b).length &&
    keys.every(key => Object.hasOwn(b, key) && sameDtcg(a[key], b[key]))
  );
};

// The classes of the DTCG composites that have one.
const wrappers: Record<string, (fields: any) => unknown> = {
  [DtcgTypes.border]: fields => new Border(fields),
  [DtcgTypes.typography]: fields => new Typography(fields),
  [DtcgTypes.transition]: fields => new Transition(fields),
};

// A composite becomes its class only when that loses nothing: the instance has
// to serialize back to the very value it was read from.
const wrapComposite = (fields: unknown, type: string, value: DtcgValue): unknown => {
  const wrap = isPlainObject(fields) && Object.hasOwn(wrappers, type) ? wrappers[type] : undefined;
  const wrapped = wrap ? tryMake(() => wrap(fields)) : null;

  return wrapped !== null && sameDtcg(convertInstance(wrapped)?.value, value) ? wrapped : fields;
};

export const dtcgValueToTeikn = (value: DtcgValue, type: string): any => {
  if (isAlias(value)) {
    return value;
  }

  const converted = typedValueToTeikn(value, type);

  // Whatever the type had no use for (a mode of another type, a value with no
  // type at all) is still read by shape.
  return converted === value ? shapeToTeikn(value) : wrapComposite(converted, type, value);
};

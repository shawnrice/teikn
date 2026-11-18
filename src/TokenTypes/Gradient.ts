import { splitTopLevel } from '../string-utils.js';
import { Color } from './Color/index.js';
import { formatNumber } from './parse-utils.js';
import type { RefFields } from './ref-guard.js';
import { assertNotRef, isRefString } from './ref-guard.js';

// ─── Shared types ─────────────────────────────────────────────

// A stop color may be a `{ref}` string (resolved per-field by resolve.ts) as
// well as a concrete Color.
export type GradientStop = { color: Color | string; position?: string };

export type StopInput = GradientStop | Color | string | [color: Color | string, position: string];

// Coerce a stop color: a `{ref}` passes through untouched, everything else is
// parsed into a Color.
const toStopColor = (value: Color | string): Color | string =>
  value instanceof Color || isRefString(value) ? value : new Color(value);

// ─── Helpers ──────────────────────────────────────────────────

// Stops are frozen so a gradient instance can't be mutated through `stops`.
const makeStop = (color: Color | string, position?: string): GradientStop =>
  Object.freeze(
    position === undefined || position === ''
      ? { color: toStopColor(color) }
      : { color: toStopColor(color), position },
  );

const normalizeStop = (input: StopInput): GradientStop => {
  if (typeof input === 'string' || input instanceof Color) {
    return makeStop(input);
  }

  if (Array.isArray(input)) {
    return makeStop(input[0], input[1]);
  }

  return makeStop(input.color, input.position);
};

const freezeStops = (inputs: readonly StopInput[]): readonly GradientStop[] =>
  Object.freeze(inputs.map(normalizeStop));

// Split on top-level whitespace (any run of it), respecting parentheses.
const splitWords = (str: string): string[] =>
  splitTopLevel(str.trim().replace(/\s+/g, ' '), ' ').filter(Boolean);

const numberSrc = '[+-]?(?:\\d+\\.?\\d*|\\.\\d+)';

// A stop position: a length/percentage, or a unitless zero.
const positionRe = new RegExp(`^(?:${numberSrc}(?:[a-z]+|%)|[+-]?0*\\.?0+)$`, 'i');
const percentRe = new RegExp(`^(${numberSrc})%$`);
const mathFnRe = /^(calc|min|max|clamp)\(/i;

// Drop float noise such as `100 - 66.6 = 33.400000000000006`.
const round = (n: number): number => Number(n.toFixed(10));

// Parse "red 50%", "rgba(0,0,0,0.5) 25%" or "red 10% 30%" from a CSS gradient stop string
const parseStop = (str: string): GradientStop => {
  const words = splitWords(str);

  if (words.some(w => mathFnRe.test(w))) {
    throw new Error(
      `Unsupported gradient stop "${str.trim()}": calc() positions are not supported`,
    );
  }

  if (words.length > 0 && words.every(w => positionRe.test(w))) {
    throw new Error(`Unsupported gradient stop "${str.trim()}": color hints are not supported`);
  }

  // Up to two trailing positions; at least one word is left for the color.
  const isPos = (i: number): boolean => i > 0 && positionRe.test(words[i]!);
  const last = words.length - 1;
  const count = isPos(last) ? 1 + Number(isPos(last - 1)) : 0;
  const cut = words.length - count;

  return makeStop(words.slice(0, cut).join(' '), words.slice(cut).join(' '));
};

// Render one stop, delegating color rendering so ref-aware serializers can
// substitute `var(--…)` while `toString()` uses the plain string form.
const renderStop = (stop: GradientStop, renderColor: (color: Color | string) => string): string => {
  const c = renderColor(stop.color);

  return stop.position ? `${c} ${stop.position}` : c;
};

// Mirror a position around 50%. Only percentages (and a unitless zero) can be
// mirrored; a two-position stop swaps its ends.
const flipPosition = (pos: string): string =>
  pos
    .trim()
    .split(/\s+/)
    .map(p => {
      const val = parseFloat(p) === 0 ? 0 : Number(p.match(percentRe)?.[1] ?? NaN);

      if (isNaN(val)) {
        throw new Error(
          `Cannot reverse a gradient with the non-percentage stop position "${pos}": ` +
            `only percentage positions can be mirrored`,
        );
      }

      return `${round(100 - val)}%`;
    })
    .toReversed()
    .join(' ');

const reverseStops = (stops: readonly GradientStop[]): GradientStop[] =>
  stops
    .toReversed()
    .map(stop => (stop.position ? { ...stop, position: flipPosition(stop.position) } : stop));

// ─── Direction mapping ────────────────────────────────────────

// Side keywords are exact angles on any box.
const sideAngles: Record<string, number> = {
  'to top': 0,
  'to right': 90,
  'to bottom': 180,
  'to left': 270,
};

// Corner keywords only equal these angles on a square box, so a corner is
// stored as a corner and a diagonal angle is emitted as `Ndeg`.
const cornerAngles: Record<string, number> = {
  'to top right': 45,
  'to bottom right': 135,
  'to bottom left': 225,
  'to top left': 315,
};

const invert = (map: Record<string, number>): Record<number, string> =>
  Object.fromEntries(Object.entries(map).map(([k, v]) => [v, k]));

const sideKeywords = invert(sideAngles);
const cornerKeywords = invert(cornerAngles);

const degRe = new RegExp(`^(${numberSrc})(deg|turn|rad|grad)?$`, 'i');

const parseDegrees = (str: string): number | null => {
  const m = str.match(degRe);

  if (!m) {
    return null;
  }

  const val = parseFloat(m[1]!);
  const unit = (m[2] || 'deg').toLowerCase();

  switch (unit) {
    case 'turn':
      return round(val * 360);
    case 'rad':
      return round(val * (180 / Math.PI));
    case 'grad':
      return round(val * 0.9);
    default:
      return val;
  }
};

// Into `[0, 360)`. The modulo adds float noise (`33.3` → `33.30000000000001`),
// which `round` drops; a non-finite or missing angle is rejected.
const normalizeAngle = (deg: number): number => {
  if (typeof deg !== 'number' || !Number.isFinite(deg)) {
    throw new Error(`Invalid linear-gradient angle: ${deg} — expected a finite number of degrees`);
  }

  return round(((deg % 360) + 360) % 360) % 360;
};

type Direction = { angle: number; corner?: string };

// Parse the leading direction of a linear-gradient; null when `part` is a stop.
const parseDirection = (part: string): Direction | null => {
  const words = part.toLowerCase().split(/\s+/);

  if (words[0] !== 'to') {
    const deg = parseDegrees(part);

    return deg === null ? null : { angle: normalizeAngle(deg) };
  }

  const sides = words.slice(1);
  const vertical = sides.find(s => s === 'top' || s === 'bottom');
  const horizontal = sides.find(s => s === 'left' || s === 'right');
  const key = ['to', vertical, horizontal].filter(Boolean).join(' ');
  const side = sideAngles[key];
  const corner = cornerAngles[key];

  if (sides.length !== key.split(' ').length - 1 || (side === undefined && corner === undefined)) {
    throw new Error(`Invalid linear-gradient direction: "${part}"`);
  }

  return side === undefined ? { angle: corner!, corner: key } : { angle: side };
};

// ─── LinearGradient ───────────────────────────────────────────

const linearRe = /^\s*linear-gradient\(([\s\S]+)\)\s*$/i;

export type LinearGradientInput = { angle: number; stops: StopInput[] };

export class LinearGradient implements RefFields {
  /** @internal brand — do not use directly; see `isFirstClassValue()` */
  readonly __teikn_fcv__: true = true;
  readonly #angle: number;
  // Set only at construction (string parse, copy, or `#build`).
  #corner: string | undefined;
  readonly #stops: readonly GradientStop[];

  constructor(angle: number, stops: StopInput[]);
  constructor(input: LinearGradientInput | LinearGradient | string);
  constructor(first: number | string | LinearGradient | LinearGradientInput, stops?: StopInput[]) {
    if (first instanceof LinearGradient) {
      this.#angle = first.#angle;
      this.#corner = first.#corner;
      this.#stops = first.#stops;

      return;
    }

    if (typeof first === 'string') {
      assertNotRef(first, 'LinearGradient');
      const m = first.match(linearRe);

      if (!m) {
        throw new Error(`Invalid linear-gradient: "${first}"`);
      }

      const parts = splitTopLevel(m[1]!);

      // Check for a keyword direction or an angle value
      const direction = parseDirection(parts[0]!.trim());

      if (direction) {
        this.#angle = direction.angle;
        this.#corner = direction.corner;
        this.#stops = Object.freeze(parts.slice(1).map(parseStop));

        return;
      }

      // No direction specified — default to bottom (180deg), all parts are stops
      this.#angle = 180;
      this.#stops = Object.freeze(parts.map(parseStop));

      return;
    }

    if (typeof first === 'object') {
      const opts = first as LinearGradientInput;
      this.#angle = normalizeAngle(opts.angle);
      this.#stops = freezeStops(opts.stops);

      return;
    }

    this.#angle = normalizeAngle(first as number);
    this.#stops = freezeStops(stops ?? []);
  }

  static #build(angle: number, stops: readonly StopInput[], corner?: string): LinearGradient {
    const g = new LinearGradient(angle, [...stops]);
    g.#corner = corner;

    return g;
  }

  /**
   * The gradient angle in degrees, `[0, 360)`. A gradient parsed from a corner
   * keyword (`to top right`) reports the nominal diagonal (45, 135, 225, 315),
   * which CSS only renders at that angle on a square box; it still serializes
   * as the corner keyword.
   */
  get angle(): number {
    return this.#angle;
  }
  get stops(): readonly GradientStop[] {
    return this.#stops;
  }

  /** Rotates by `degrees`. The result is a plain angle, so a corner keyword is dropped. */
  rotate(degrees: number): LinearGradient {
    return new LinearGradient(this.#angle + degrees, [...this.#stops]);
  }

  /**
   * Flips the direction by 180deg and mirrors the stops. Throws when a stop
   * position is not a percentage, since it cannot be mirrored.
   */
  reverse(): LinearGradient {
    const angle = normalizeAngle(this.#angle + 180);

    return LinearGradient.#build(
      angle,
      reverseStops(this.#stops),
      this.#corner ? cornerKeywords[angle] : undefined,
    );
  }

  addStop(color: Color | string, position?: string): LinearGradient {
    return LinearGradient.#build(
      this.#angle,
      [...this.#stops, makeStop(color, position)],
      this.#corner,
    );
  }

  // ─── Per-field reference protocol ────────────────────────────
  // Lets a stop hold a `{ref}` color (resolved per-field by resolve.ts) instead
  // of erroring, mirroring Border / BoxShadow.

  /** @internal */
  __teikn_fields__(): Record<string, unknown> {
    const fields = { angle: this.#angle, stops: [...this.#stops] };

    return this.#corner ? { ...fields, corner: this.#corner } : fields;
  }

  /** @internal */
  // oxlint-disable-next-line class-methods-use-this -- protocol method, detected per-instance
  __teikn_fromFields__(fields: Record<string, unknown>): LinearGradient {
    const corner = typeof fields.corner === 'string' ? fields.corner : undefined;

    return LinearGradient.#build(fields.angle as number, fields.stops as StopInput[], corner);
  }

  toJSON(): string {
    return this.toString();
  }

  toString(): string {
    return this.toCSSWith(String);
  }

  /**
   * Serialize with a custom color renderer, so ref-aware generators can emit
   * `var(--…)` for stop colors that reference a token. `toString()` passes
   * `String`, which renders concrete colors and inlines any `{ref}` verbatim.
   */
  toCSSWith(renderColor: (color: Color | string) => string): string {
    if (this.#stops.length === 0) {
      throw new Error('LinearGradient requires at least one color stop');
    }

    const stopsStr = this.#stops.map(s => renderStop(s, renderColor)).join(', ');
    const dir = this.#corner ?? sideKeywords[this.#angle] ?? `${formatNumber(this.#angle)}deg`;

    return `linear-gradient(${dir}, ${stopsStr})`;
  }

  static from(value: LinearGradient | LinearGradientInput | string): LinearGradient {
    if (typeof value === 'object' && !(value instanceof LinearGradient)) {
      return new LinearGradient(value);
    }

    return new LinearGradient(value);
  }
}

// ─── RadialGradient ───────────────────────────────────────────

type RadialShape = 'circle' | 'ellipse';
type RadialSize = 'closest-side' | 'closest-corner' | 'farthest-side' | 'farthest-corner' | string;

export type RadialGradientOptions = { shape?: RadialShape; size?: RadialSize; position?: string };

const radialRe = /^\s*radial-gradient\(([\s\S]+)\)\s*$/i;

const extentRe = /^(closest|farthest)-(side|corner)$/;

type RadialPrelude = { shape: RadialShape; size: RadialSize; position: string };

// A single explicit length is a circle radius; anything else is an ellipse.
const impliedShape = (size: RadialSize): RadialShape =>
  !extentRe.test(size) && !/\s/.test(size.trim()) ? 'circle' : 'ellipse';

// Parse `[shape] [size] [at position]`; null when `part` is a color stop.
const parseRadialPrelude = (part: string): RadialPrelude | null => {
  const words = splitWords(part);
  const lower = words.map(w => w.toLowerCase());
  const atIdx = lower.indexOf('at');
  const spec = atIdx >= 0 ? lower.slice(0, atIdx) : lower;
  const shapes = spec.filter(w => w === 'circle' || w === 'ellipse');
  const sizes = spec.filter(w => extentRe.test(w) || positionRe.test(w));

  if (shapes.length + sizes.length !== spec.length || (atIdx < 0 && spec.length === 0)) {
    return null;
  }

  if (shapes.length > 1 || (atIdx >= 0 && atIdx === words.length - 1)) {
    throw new Error(`Invalid radial-gradient shape: "${part}"`);
  }

  const size = sizes.join(' ') || 'farthest-corner';

  return {
    shape: (shapes[0] as RadialShape | undefined) ?? impliedShape(size),
    size,
    position: atIdx >= 0 ? words.slice(atIdx + 1).join(' ') : 'center',
  };
};

const assertRadial = ({ shape, size, position }: RadialPrelude): void => {
  if (shape !== 'circle' && shape !== 'ellipse') {
    throw new Error(`Invalid radial-gradient shape: "${shape}"`);
  }

  if (typeof size !== 'string' || size.trim() === '') {
    throw new Error(`Invalid radial-gradient size: "${size}"`);
  }

  if (shape === 'circle' && /\s/.test(size.trim())) {
    throw new Error(`Invalid radial-gradient size: "${size}" — a circle takes a single radius`);
  }

  if (typeof position !== 'string' || position.trim() === '') {
    throw new Error(`Invalid radial-gradient position: "${position}"`);
  }
};

export class RadialGradient implements RefFields {
  /** @internal brand — do not use directly; see `isFirstClassValue()` */
  readonly __teikn_fcv__: true = true;
  readonly #shape: RadialShape;
  readonly #size: RadialSize;
  readonly #position: string;
  readonly #stops: readonly GradientStop[];

  constructor(options: RadialGradientOptions, stops: StopInput[]);
  constructor(value: RadialGradient | string);
  constructor(first: RadialGradientOptions | string | RadialGradient, stops?: StopInput[]) {
    if (first instanceof RadialGradient) {
      this.#shape = first.#shape;
      this.#size = first.#size;
      this.#position = first.#position;
      this.#stops = first.#stops;

      return;
    }

    if (typeof first === 'string') {
      assertNotRef(first, 'RadialGradient');
      const m = first.match(radialRe);

      if (!m) {
        throw new Error(`Invalid radial-gradient: "${first}"`);
      }

      const parts = splitTopLevel(m[1]!);
      const prelude = parseRadialPrelude(parts[0]!);

      if (prelude) {
        this.#shape = prelude.shape;
        this.#size = prelude.size;
        this.#position = prelude.position;
        this.#stops = Object.freeze(parts.slice(1).map(parseStop));
        assertRadial(prelude);

        return;
      }

      // No shape spec — all parts are color stops
      this.#shape = 'ellipse';
      this.#size = 'farthest-corner';
      this.#position = 'center';
      this.#stops = Object.freeze(parts.map(parseStop));

      return;
    }

    this.#shape = first.shape ?? 'ellipse';
    this.#size = first.size ?? 'farthest-corner';
    this.#position = first.position ?? 'center';
    this.#stops = freezeStops(stops ?? []);
    assertRadial({ shape: this.#shape, size: this.#size, position: this.#position });
  }

  get shape(): RadialShape {
    return this.#shape;
  }
  get size(): RadialSize {
    return this.#size;
  }
  get position(): string {
    return this.#position;
  }
  get stops(): readonly GradientStop[] {
    return this.#stops;
  }

  setShape(shape: RadialShape): RadialGradient {
    return new RadialGradient({ shape, size: this.#size, position: this.#position }, [
      ...this.#stops,
    ]);
  }

  setPosition(position: string): RadialGradient {
    return new RadialGradient({ shape: this.#shape, size: this.#size, position }, [...this.#stops]);
  }

  addStop(color: Color | string, position?: string): RadialGradient {
    return new RadialGradient({ shape: this.#shape, size: this.#size, position: this.#position }, [
      ...this.#stops,
      makeStop(color, position),
    ]);
  }

  /**
   * Reverses the stop order and mirrors their positions. Throws when a stop
   * position is not a percentage, since it cannot be mirrored.
   */
  reverse(): RadialGradient {
    return new RadialGradient(
      { shape: this.#shape, size: this.#size, position: this.#position },
      reverseStops(this.#stops),
    );
  }

  // ─── Per-field reference protocol ────────────────────────────

  /** @internal */
  __teikn_fields__(): Record<string, unknown> {
    return {
      shape: this.#shape,
      size: this.#size,
      position: this.#position,
      stops: [...this.#stops],
    };
  }

  /** @internal */
  // oxlint-disable-next-line class-methods-use-this -- protocol method, detected per-instance
  __teikn_fromFields__(fields: Record<string, unknown>): RadialGradient {
    return new RadialGradient(
      {
        shape: fields.shape as RadialShape,
        size: fields.size as RadialSize,
        position: fields.position as string,
      },
      fields.stops as StopInput[],
    );
  }

  toJSON(): string {
    return this.toString();
  }

  toString(): string {
    return this.toCSSWith(String);
  }

  /** See {@link LinearGradient.toCSSWith}. */
  toCSSWith(renderColor: (color: Color | string) => string): string {
    const stopsStr = this.#stops.map(s => renderStop(s, renderColor)).join(', ');
    const shapeParts: string[] = [];

    // `ellipse` is only spelled out when the size alone would imply a circle.
    const showShape = this.#shape !== 'ellipse' || impliedShape(this.#size) !== 'ellipse';
    const spec = [showShape ? this.#shape : '', this.#size !== 'farthest-corner' ? this.#size : '']
      .filter(Boolean)
      .join(' ');

    if (spec) {
      shapeParts.push(spec);
    }

    if (this.#position !== 'center') {
      const last = shapeParts.pop();
      shapeParts.push(last ? `${last} at ${this.#position}` : `at ${this.#position}`);
    }

    if (this.#stops.length === 0) {
      throw new Error('RadialGradient requires at least one color stop');
    }

    if (shapeParts.length > 0) {
      return `radial-gradient(${shapeParts.join(' ')}, ${stopsStr})`;
    }

    return `radial-gradient(${stopsStr})`;
  }

  static from(value: RadialGradient | string): RadialGradient {
    return new RadialGradient(value);
  }
}

// ─── GradientList ────────────────────────────────────────────

type AnyGradient = LinearGradient | RadialGradient;

const parseGradient = (str: string): AnyGradient => {
  const s = str.trim();

  if (/^linear-gradient\(/i.test(s)) {
    return new LinearGradient(s);
  }

  if (/^radial-gradient\(/i.test(s)) {
    return new RadialGradient(s);
  }

  throw new Error(`Unknown gradient type: "${s}"`);
};

export class GradientList implements RefFields {
  /** @internal brand — do not use directly; see `isFirstClassValue()` */
  readonly __teikn_fcv__: true = true;
  readonly #layers: readonly AnyGradient[];

  constructor(value: GradientList | string | AnyGradient[]);
  constructor(first: AnyGradient[] | string | GradientList) {
    if (first instanceof GradientList) {
      this.#layers = first.#layers;

      return;
    }

    if (typeof first === 'string') {
      assertNotRef(first, 'GradientList');
      this.#layers = Object.freeze(splitTopLevel(first).map(parseGradient));

      return;
    }

    this.#layers = Object.freeze([...first]);
  }

  get layers(): readonly AnyGradient[] {
    return this.#layers;
  }
  get length(): number {
    return this.#layers.length;
  }

  at(index: number): AnyGradient | undefined {
    return this.#layers[index];
  }

  map(fn: (gradient: AnyGradient, index: number) => AnyGradient): GradientList {
    return new GradientList(this.#layers.map(fn));
  }

  // ─── Per-field reference protocol ────────────────────────────
  // Each layer is itself a RefFields gradient, so exposing the layers lets
  // resolve.ts descend and resolve per-stop `{ref}` colors.

  /** @internal */
  __teikn_fields__(): Record<string, unknown> {
    return { layers: [...this.#layers] };
  }

  /** @internal */
  // oxlint-disable-next-line class-methods-use-this -- protocol method, detected per-instance
  __teikn_fromFields__(fields: Record<string, unknown>): GradientList {
    return new GradientList(fields.layers as AnyGradient[]);
  }

  toJSON(): string {
    return this.toString();
  }

  toString(): string {
    return this.#layers.map(g => g.toString()).join(', ');
  }

  /** See {@link LinearGradient.toCSSWith}. */
  toCSSWith(renderColor: (color: Color | string) => string): string {
    return this.#layers.map(g => g.toCSSWith(renderColor)).join(', ');
  }

  static from(value: GradientList | string | (LinearGradient | RadialGradient)[]): GradientList {
    return new GradientList(value);
  }
}

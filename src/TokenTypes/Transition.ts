import { splitTopLevel, splitTopLevelWhitespace } from '../string-utils.js';
import { CubicBezier } from './CubicBezier.js';
import { Duration } from './Duration.js';
import { CSS_NUMBER, assertNotPaddedRef } from './parse-utils.js';
import type { RefFields } from './ref-guard.js';
import { assertNotRef, isRefString } from './ref-guard.js';

// Leading `-?` so a negative `transition-delay` (valid CSS) parses as a time
// rather than falling through to `property`.
const timeRe = new RegExp(`^${CSS_NUMBER}(?:ms|s)$`, 'i');

const timingKeywords = new Set(['ease', 'ease-in', 'ease-out', 'ease-in-out', 'linear']);

// Valid CSS easings that a CubicBezier cannot represent.
const unsupportedTimingRe = /^(?:step-start$|step-end$|steps\(|linear\()/i;

const propertyRe = /^(?:--|-?[a-z_])[\w-]*$/i;

const isTimeValue = (s: string): boolean => timeRe.test(s);

const invalid = (css: string, reason: string): Error =>
  new Error(`Invalid transition: "${css}" — ${reason}`);

type Shorthand = {
  duration: Duration;
  timingFunction: CubicBezier;
  delay: Duration;
  property: string;
};

// The fields of a CSS shorthand, or the reason it is not one.
const parseShorthand = (css: string): Shorthand | string => {
  const parts = splitTopLevelWhitespace(css.trim());

  if (parts.length === 0) {
    return 'expected a duration, timing function or property';
  }

  const times: string[] = [];
  let timing: string | null = null;
  let property: string | null = null;

  for (const part of parts) {
    if (isTimeValue(part)) {
      times.push(part);
    } else if (
      timingKeywords.has(part.toLowerCase()) ||
      part.toLowerCase().startsWith('cubic-bezier(')
    ) {
      if (timing !== null) {
        return `more than one timing function ("${timing}", "${part}")`;
      }

      timing = part;
    } else if (unsupportedTimingRe.test(part)) {
      return (
        `unsupported timing function "${part}" (only cubic-bezier() and the ` +
        `ease/linear keywords can be represented)`
      );
    } else if (property !== null || !propertyRe.test(part)) {
      return `unexpected "${part}"`;
    } else {
      property = part;
    }
  }

  if (times.length > 2) {
    return `expected at most 2 times, got ${times.length}`;
  }

  const duration = Duration.tryParse(times[0] ?? '0s');
  const delay = Duration.tryParse(times[1] ?? '0s');
  const timingFunction = CubicBezier.tryParse(timing ?? 'ease');

  if (!duration || !delay) {
    return 'a time is not a finite number';
  }

  if (!timingFunction) {
    return `invalid timing function "${timing}"`;
  }

  return { duration, timingFunction, delay, property: property ?? 'all' };
};

// Field coercion. A `{tokenName}` reference string passes through untouched —
// `resolve.ts` resolves it per-field (RefFields protocol) and feeds the
// concrete value back through these helpers. A non-ref string is parsed.
const toDuration = (value: Duration | string): Duration | string => {
  if (value instanceof Duration || isRefString(value)) {
    return value;
  }

  return new Duration(value);
};

const toTiming = (value: CubicBezier | string): CubicBezier | string => {
  if (value instanceof CubicBezier || isRefString(value)) {
    return value;
  }

  return new CubicBezier(value);
};

// The property must be one the shorthand parser would read back as a property
// (a single identifier that is not a time or timing function), or a `{ref}`.
const toProperty = (value: string | undefined): string => {
  const property = value ?? 'all';
  const name = String(property);
  assertNotPaddedRef(property, 'Transition property');

  if (
    isRefString(property) ||
    (propertyRe.test(name) &&
      !timingKeywords.has(name.toLowerCase()) &&
      !unsupportedTimingRe.test(name))
  ) {
    return property;
  }

  throw new Error(
    `Invalid transition property ${JSON.stringify(property)} — expected a single CSS property name`,
  );
};

// Transforms (scale/shift/reverse) are only defined on resolved fields; a
// lingering reference means `resolve.ts` has not run yet.
const requireResolved = <T>(value: T | string, op: string): T => {
  if (isRefString(value)) {
    throw new Error(
      `Cannot ${op} a Transition holding an unresolved reference (${value}). ` +
        `Resolve references before applying transforms.`,
    );
  }

  return value as T;
};

export type TransitionInput = {
  duration: Duration | string;
  timingFunction: CubicBezier | string;
  delay?: Duration | string;
  property?: string;
};

export class Transition implements RefFields {
  /** @internal brand — do not use directly; see `isFirstClassValue()` */
  readonly __teikn_fcv__: true = true;
  readonly #duration: Duration | string;
  readonly #timingFunction: CubicBezier | string;
  readonly #delay: Duration | string;
  readonly #property: string;

  constructor(
    duration: Duration | string,
    timingFunction: CubicBezier | string,
    delay?: Duration | string,
    property?: string,
  );
  constructor(input: TransitionInput | Transition | string);
  constructor(
    first: Duration | string | Transition | TransitionInput,
    timingFunction?: CubicBezier | string,
    delay?: Duration | string,
    property?: string,
  ) {
    if (first instanceof Transition) {
      this.#duration = first.#duration;
      this.#timingFunction = first.#timingFunction;
      this.#delay = first.#delay;
      this.#property = first.#property;

      return;
    }

    if (
      typeof first === 'string' &&
      timingFunction === undefined &&
      delay === undefined &&
      property === undefined
    ) {
      assertNotRef(first, 'Transition');
      const parsed = parseShorthand(first);

      if (typeof parsed === 'string') {
        throw invalid(first, parsed);
      }

      this.#duration = parsed.duration;
      this.#timingFunction = parsed.timingFunction;
      this.#delay = parsed.delay;
      this.#property = parsed.property;

      return;
    }

    // Object input: { duration, timingFunction, delay?, property? }
    if (typeof first === 'object' && !(first instanceof Duration)) {
      const opts = first as TransitionInput;
      this.#duration = toDuration(opts.duration);
      this.#timingFunction = toTiming(opts.timingFunction);
      this.#delay = opts.delay !== undefined ? toDuration(opts.delay) : new Duration(0, 's');
      this.#property = toProperty(opts.property);

      return;
    }

    this.#duration = toDuration(first);
    this.#timingFunction = toTiming(timingFunction ?? 'ease');
    this.#delay = delay !== undefined ? toDuration(delay) : new Duration(0, 's');
    this.#property = toProperty(property);
  }

  get duration(): Duration | string {
    return this.#duration;
  }
  get timingFunction(): CubicBezier | string {
    return this.#timingFunction;
  }
  get delay(): Duration | string {
    return this.#delay;
  }
  get property(): string {
    return this.#property;
  }

  // ─── Immutable setters ──────────────────────────────────────

  setDuration(duration: Duration | string): Transition {
    return new Transition(duration, this.#timingFunction, this.#delay, this.#property);
  }

  setTimingFunction(tf: CubicBezier | string): Transition {
    return new Transition(this.#duration, tf, this.#delay, this.#property);
  }

  setDelay(delay: Duration | string): Transition {
    return new Transition(this.#duration, this.#timingFunction, delay, this.#property);
  }

  setProperty(property: string): Transition {
    return new Transition(this.#duration, this.#timingFunction, this.#delay, property);
  }

  // ─── Per-field reference protocol ────────────────────────────

  /** @internal */
  __teikn_fields__(): Record<string, unknown> {
    return {
      duration: this.#duration,
      timingFunction: this.#timingFunction,
      delay: this.#delay,
      property: this.#property,
    };
  }

  /** @internal */
  // oxlint-disable-next-line class-methods-use-this -- protocol method, detected per-instance
  __teikn_fromFields__(fields: Record<string, unknown>): Transition {
    return new Transition(fields as TransitionInput);
  }

  // ─── Math ───────────────────────────────────────────────────

  /** T.scale(k) → (d·k, f, δ·k, p) — uniform time dilation */
  scale(factor: number): Transition {
    return new Transition(
      requireResolved(this.#duration, 'scale').scale(factor),
      this.#timingFunction,
      requireResolved(this.#delay, 'scale').scale(factor),
      this.#property,
    );
  }

  /** T.shift(Δ) → (d, f, δ+Δ, p) — delay offset */
  shift(delta: Duration | string): Transition {
    return new Transition(
      this.#duration,
      this.#timingFunction,
      requireResolved(this.#delay, 'shift').add(requireResolved(toDuration(delta), 'shift')),
      this.#property,
    );
  }

  /** T.reverse() → (d, f.reverse(), δ, p) — reverse the easing curve */
  reverse(): Transition {
    return new Transition(
      this.#duration,
      requireResolved(this.#timingFunction, 'reverse').reverse(),
      this.#delay,
      this.#property,
    );
  }

  /** d + δ — total time before the transition completes */
  get totalTime(): Duration {
    return requireResolved(this.#duration, 'compute totalTime of').add(
      requireResolved(this.#delay, 'compute totalTime of'),
    );
  }

  // ─── Serialization ──────────────────────────────────────────

  toJSON(): string {
    return this.toString();
  }

  toString(): string {
    const parts: string[] = [];

    if (this.#property !== 'all') {
      parts.push(this.#property);
    }

    parts.push(String(this.#duration));
    // A resolved timing function prefers its keyword form; an unresolved
    // reference is emitted verbatim.
    parts.push(
      isRefString(this.#timingFunction)
        ? this.#timingFunction
        : (this.#timingFunction.keyword ?? this.#timingFunction.toString()),
    );

    const hasDelay = isRefString(this.#delay) ? true : this.#delay.value !== 0;

    if (hasDelay) {
      parts.push(String(this.#delay));
    }

    return parts.join(' ');
  }

  // ─── Static presets ──────────────────────────────────────────

  static from(value: Transition | TransitionInput | string): Transition {
    if (
      typeof value === 'object' &&
      !(value instanceof Transition) &&
      !(value instanceof Duration)
    ) {
      return new Transition(value as TransitionInput);
    }

    return new Transition(value as Transition | string);
  }

  /** The transition `value` holds — an instance or a CSS shorthand — or `null`. Never throws. */
  static tryParse(value: unknown): Transition | null {
    if (value instanceof Transition) {
      return value;
    }

    const parsed = typeof value === 'string' ? parseShorthand(value) : null;

    return parsed && typeof parsed !== 'string' ? new Transition(parsed) : null;
  }

  static readonly fade: Transition = new Transition('0.2s', 'ease');
  static readonly slide: Transition = new Transition('0.3s', CubicBezier.standard);
  static readonly quick: Transition = new Transition('0.1s', 'ease');
}

// ─── TransitionList ───────────────────────────────────────────

export class TransitionList implements RefFields {
  /** @internal brand — do not use directly; see `isFirstClassValue()` */
  readonly __teikn_fcv__: true = true;
  readonly #layers: readonly Transition[];

  constructor(value: TransitionList | string | Transition[]);
  constructor(first: Transition[] | string | TransitionList) {
    if (first instanceof TransitionList) {
      this.#layers = first.#layers;

      return;
    }

    if (typeof first === 'string') {
      assertNotRef(first, 'TransitionList');
      this.#layers = Object.freeze(splitTopLevel(first).map(s => new Transition(s)));

      return;
    }

    this.#layers = Object.freeze([...first]);
  }

  get layers(): readonly Transition[] {
    return this.#layers;
  }
  get length(): number {
    return this.#layers.length;
  }

  at(index: number): Transition | undefined {
    return this.#layers[index];
  }

  map(fn: (transition: Transition, index: number) => Transition): TransitionList {
    return new TransitionList(this.#layers.map(fn));
  }

  // ─── Per-field reference protocol ────────────────────────────
  // A list has no named fields; its "fields" are its layers. Exposing them
  // lets resolve.ts / validate.ts (both generic over RefFields) descend into
  // each layer — which, being a Transition, resolves its own field references.

  /** @internal */
  __teikn_fields__(): Record<string, unknown> {
    return { layers: [...this.#layers] };
  }

  /** @internal */
  // oxlint-disable-next-line class-methods-use-this -- protocol method, detected per-instance
  __teikn_fromFields__(fields: Record<string, unknown>): TransitionList {
    return new TransitionList(fields.layers as Transition[]);
  }

  toJSON(): string {
    return this.toString();
  }

  toString(): string {
    return this.#layers.map(t => t.toString()).join(', ');
  }

  /** The list `value` holds — an instance or comma-separated shorthands — or `null`. Never throws. */
  static tryParse(value: unknown): TransitionList | null {
    if (value instanceof TransitionList) {
      return value;
    }

    const layers = typeof value === 'string' ? splitTopLevel(value).map(Transition.tryParse) : null;

    return layers?.every(layer => layer !== null) ? new TransitionList(layers) : null;
  }

  static from(value: TransitionList | string | Transition[]): TransitionList {
    return new TransitionList(value);
  }
}

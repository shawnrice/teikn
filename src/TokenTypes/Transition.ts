import { splitTopLevel, splitTopLevelWhitespace } from '../string-utils.js';
import { CubicBezier } from './CubicBezier.js';
import { Duration } from './Duration.js';
import type { RefFields } from './ref-guard.js';
import { assertNotRef, isRefString } from './ref-guard.js';

// Leading `-?` so a negative `transition-delay` (valid CSS) parses as a time
// rather than falling through to `property`.
const timeRe = /^(-?\d+(?:\.\d+)?)(ms|s)$/;

const timingKeywords = new Set(['ease', 'ease-in', 'ease-out', 'ease-in-out', 'linear']);

const isTimeValue = (s: string): boolean => timeRe.test(s);

const parse = (
  css: string,
): { duration: string; timingFunction: CubicBezier; delay: string; property: string } => {
  const parts = splitTopLevelWhitespace(css.trim());
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
      timing = part;
    } else {
      property = part;
    }
  }

  return {
    duration: times[0] ?? '0s',
    timingFunction: new CubicBezier(timing ?? 'ease'),
    delay: times[1] ?? '0s',
    property: property ?? 'all',
  };
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

    if (typeof first === 'string' && timingFunction === undefined) {
      assertNotRef(first, 'Transition');
      const parsed = parse(first);
      this.#duration = new Duration(parsed.duration);
      this.#timingFunction = parsed.timingFunction;
      this.#delay = new Duration(parsed.delay);
      this.#property = parsed.property;

      return;
    }

    // Object input: { duration, timingFunction, delay?, property? }
    if (typeof first === 'object' && !(first instanceof Duration)) {
      const opts = first as TransitionInput;
      this.#duration = toDuration(opts.duration);
      this.#timingFunction = toTiming(opts.timingFunction);
      this.#delay = opts.delay !== undefined ? toDuration(opts.delay) : new Duration(0, 's');
      this.#property = opts.property ?? 'all';

      return;
    }

    this.#duration = toDuration(first);
    this.#timingFunction = toTiming(timingFunction ?? 'ease');
    this.#delay = delay !== undefined ? toDuration(delay) : new Duration(0, 's');
    this.#property = property ?? 'all';
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

  static readonly fade: Transition = new Transition('0.2s', 'ease');
  static readonly slide: Transition = new Transition('0.3s', CubicBezier.standard);
  static readonly quick: Transition = new Transition('0.1s', 'ease');
}

// ─── TransitionList ───────────────────────────────────────────

export class TransitionList {
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
      this.#layers = splitTopLevel(first).map(s => new Transition(s));

      return;
    }

    this.#layers = [...first];
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

  toJSON(): string {
    return this.toString();
  }

  toString(): string {
    return this.#layers.map(t => t.toString()).join(', ');
  }

  static from(value: TransitionList | string | Transition[]): TransitionList {
    return new TransitionList(value);
  }
}

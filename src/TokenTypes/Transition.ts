import { splitTopLevel } from "../string-utils.js";
import { CubicBezier } from "./CubicBezier.js";
import { Duration } from "./Duration.js";

const timeRe = /^(\d+(?:\.\d+)?)(ms|s)$/;

const timingKeywords = new Set(["ease", "ease-in", "ease-out", "ease-in-out", "linear"]);

const splitRespectingParens = (s: string): string[] => {
  const parts: string[] = [];
  let current = "";
  let depth = 0;
  for (const ch of s) {
    if (ch === "(") {
      depth++;
      current += ch;
    } else if (ch === ")") {
      depth--;
      current += ch;
    } else if (ch === " " && depth === 0) {
      if (current.length > 0) {
        parts.push(current);
        current = "";
      }
    } else {
      current += ch;
    }
  }
  if (current.length > 0) {
    parts.push(current);
  }
  return parts;
};

const isTimeValue = (s: string): boolean => timeRe.test(s);

const parse = (
  css: string,
): {
  duration: string;
  timingFunction: CubicBezier;
  delay: string;
  property: string;
} => {
  const parts = splitRespectingParens(css.trim());
  const times: string[] = [];
  let timing: string | null = null;
  let property: string | null = null;

  for (const part of parts) {
    if (isTimeValue(part)) {
      times.push(part);
    } else if (
      timingKeywords.has(part.toLowerCase()) ||
      part.toLowerCase().startsWith("cubic-bezier(")
    ) {
      timing = part;
    } else {
      property = part;
    }
  }

  return {
    duration: times[0] ?? "0s",
    timingFunction: new CubicBezier(timing ?? "ease"),
    delay: times[1] ?? "0s",
    property: property ?? "all",
  };
};

const toDuration = (value: Duration | string): Duration =>
  value instanceof Duration ? value : new Duration(value);

export type TransitionInput = {
  duration: Duration | string;
  timingFunction: CubicBezier | string;
  delay?: Duration | string;
  property?: string;
};

export class Transition {
  /** @internal brand — do not use directly; see `isFirstClassValue()` */
  readonly __teikn_fcv__: true = true;
  readonly #duration: Duration;
  readonly #timingFunction: CubicBezier;
  readonly #delay: Duration;
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

    if (typeof first === "string" && timingFunction === undefined) {
      const parsed = parse(first);
      this.#duration = new Duration(parsed.duration);
      this.#timingFunction = parsed.timingFunction;
      this.#delay = new Duration(parsed.delay);
      this.#property = parsed.property;
      return;
    }

    // Object input: { duration, timingFunction, delay?, property? }
    if (typeof first === "object" && !(first instanceof Duration)) {
      const opts = first as TransitionInput;
      this.#duration = toDuration(opts.duration);
      this.#timingFunction =
        opts.timingFunction instanceof CubicBezier
          ? opts.timingFunction
          : new CubicBezier(opts.timingFunction);
      this.#delay = opts.delay !== undefined ? toDuration(opts.delay) : new Duration(0, "s");
      this.#property = opts.property ?? "all";
      return;
    }

    this.#duration = toDuration(first);
    this.#timingFunction =
      timingFunction instanceof CubicBezier
        ? timingFunction
        : new CubicBezier(timingFunction ?? "ease");
    this.#delay = delay !== undefined ? toDuration(delay) : new Duration(0, "s");
    this.#property = property ?? "all";
  }

  get duration(): Duration {
    return this.#duration;
  }
  get timingFunction(): CubicBezier {
    return this.#timingFunction;
  }
  get delay(): Duration {
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

  // ─── Math ───────────────────────────────────────────────────

  /** T.scale(k) → (d·k, f, δ·k, p) — uniform time dilation */
  scale(factor: number): Transition {
    return new Transition(
      this.#duration.scale(factor),
      this.#timingFunction,
      this.#delay.scale(factor),
      this.#property,
    );
  }

  /** T.shift(Δ) → (d, f, δ+Δ, p) — delay offset */
  shift(delta: Duration | string): Transition {
    return new Transition(
      this.#duration,
      this.#timingFunction,
      this.#delay.add(toDuration(delta)),
      this.#property,
    );
  }

  /** T.reverse() → (d, f.reverse(), δ, p) — reverse the easing curve */
  reverse(): Transition {
    return new Transition(
      this.#duration,
      this.#timingFunction.reverse(),
      this.#delay,
      this.#property,
    );
  }

  /** d + δ — total time before the transition completes */
  get totalTime(): Duration {
    return this.#duration.add(this.#delay);
  }

  // ─── Serialization ──────────────────────────────────────────

  toJSON(): string {
    return this.toString();
  }

  toString(): string {
    const parts: string[] = [];
    if (this.#property !== "all") {
      parts.push(this.#property);
    }
    parts.push(this.#duration.toString());
    const { keyword } = this.#timingFunction;
    parts.push(keyword ?? this.#timingFunction.toString());
    if (this.#delay.value !== 0) {
      parts.push(this.#delay.toString());
    }
    return parts.join(" ");
  }

  // ─── Static presets ──────────────────────────────────────────

  static from(value: Transition | TransitionInput | string): Transition {
    if (
      typeof value === "object" &&
      !(value instanceof Transition) &&
      !(value instanceof Duration)
    ) {
      return new Transition(value as TransitionInput);
    }
    return new Transition(value as Transition | string);
  }

  static readonly fade: Transition = new Transition("0.2s", "ease");
  static readonly slide: Transition = new Transition("0.3s", CubicBezier.standard);
  static readonly quick: Transition = new Transition("0.1s", "ease");
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

    if (typeof first === "string") {
      this.#layers = splitTopLevel(first).map((s) => new Transition(s));
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
    return this.#layers.map((t) => t.toString()).join(", ");
  }

  static from(value: TransitionList | string | Transition[]): TransitionList {
    return new TransitionList(value);
  }
}

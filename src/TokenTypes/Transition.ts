import { splitTopLevel } from '../string-utils';
import { CubicBezier } from './CubicBezier';

const timeRe = /^(\d+(?:\.\d+)?)(ms|s)$/;

const timingKeywords = new Set(['ease', 'ease-in', 'ease-out', 'ease-in-out', 'linear']);

const splitRespectingParens = (s: string): string[] => {
  const parts: string[] = [];
  let current = '';
  let depth = 0;
  for (const ch of s) {
    if (ch === '(') {
      depth++;
      current += ch;
    } else if (ch === ')') {
      depth--;
      current += ch;
    } else if (ch === ' ' && depth === 0) {
      if (current.length > 0) {
        parts.push(current);
        current = '';
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

export class Transition {
  readonly #duration: string;
  readonly #timingFunction: CubicBezier;
  readonly #delay: string;
  readonly #property: string;

  constructor(
    duration: string,
    timingFunction: CubicBezier | string,
    delay?: string,
    property?: string,
  );
  constructor(css: Transition | string);
  constructor(
    first: string | Transition,
    timingFunction?: CubicBezier | string,
    delay?: string,
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
      const parsed = parse(first);
      this.#duration = parsed.duration;
      this.#timingFunction = parsed.timingFunction;
      this.#delay = parsed.delay;
      this.#property = parsed.property;
      return;
    }

    this.#duration = first as string;
    this.#timingFunction =
      timingFunction instanceof CubicBezier
        ? timingFunction
        : new CubicBezier(timingFunction ?? 'ease');
    this.#delay = delay ?? '0s';
    this.#property = property ?? 'all';
  }

  get duration(): string {
    return this.#duration;
  }
  get timingFunction(): CubicBezier {
    return this.#timingFunction;
  }
  get delay(): string {
    return this.#delay;
  }
  get property(): string {
    return this.#property;
  }

  setDuration(duration: string): Transition {
    return new Transition(duration, this.#timingFunction, this.#delay, this.#property);
  }

  setTimingFunction(tf: CubicBezier | string): Transition {
    return new Transition(this.#duration, tf, this.#delay, this.#property);
  }

  setDelay(delay: string): Transition {
    return new Transition(this.#duration, this.#timingFunction, delay, this.#property);
  }

  setProperty(property: string): Transition {
    return new Transition(this.#duration, this.#timingFunction, this.#delay, property);
  }

  toJSON(): string {
    return this.toString();
  }

  toString(): string {
    const parts: string[] = [];
    if (this.#property !== 'all') {
      parts.push(this.#property);
    }
    parts.push(this.#duration);
    const keyword = this.#timingFunction.keyword;
    parts.push(keyword ?? this.#timingFunction.toString());
    if (this.#delay !== '0s') {
      parts.push(this.#delay);
    }
    return parts.join(' ');
  }

  // ─── Static presets ──────────────────────────────────────────

  static readonly fade: Transition = new Transition('0.2s', 'ease');
  static readonly slide: Transition = new Transition('0.3s', CubicBezier.standard);
  static readonly quick: Transition = new Transition('0.1s', 'ease');
}

// ─── TransitionList ───────────────────────────────────────────

export class TransitionList {
  readonly #layers: readonly Transition[];

  constructor(value: TransitionList | string | Transition[]);
  constructor(first: Transition[] | string | TransitionList) {
    if (first instanceof TransitionList) {
      this.#layers = first.#layers;
      return;
    }

    if (typeof first === 'string') {
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
}

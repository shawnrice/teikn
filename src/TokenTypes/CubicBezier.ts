import { clamp } from "../utils.js";

const EPSILON = 1e-6;
const MAX_ITERATIONS = 8;

type ControlPoints = readonly [x1: number, y1: number, x2: number, y2: number];

// prettier-ignore
const cssTimings: Record<string, ControlPoints> = {
  ease:          [0.25, 0.1,   0.25, 1],
  'ease-in':     [0.42,   0,      1, 1],
  'ease-out':    [0,      0,   0.58, 1],
  'ease-in-out': [0.42,   0,   0.58, 1],
  linear:        [0,      0,      1, 1],
};

// prettier-ignore
const presets: Record<string, ControlPoints> = {
  ...cssTimings,
  standard:      [0.4,    0,    0.2, 1],
  accelerate:    [0.4,    0,      1, 1],
  decelerate:    [0,      0,    0.2, 1],
};

const RE =
  /cubic-bezier\(\s*([\d.e+-]+)\s*,\s*([\d.e+-]+)\s*,\s*([\d.e+-]+)\s*,\s*([\d.e+-]+)\s*\)/i;

const clampX = (v: number): number => clamp(0, 1, v);

// Parametric cubic bezier for one axis:
//   B(t) = 3(1-t)^2 * t * p1 + 3(1-t) * t^2 * p2 + t^3
const bezierAt = (p1: number, p2: number, t: number): number => {
  const mt = 1 - t;
  return 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t;
};

// Derivative: dB/dt
const bezierDeriv = (p1: number, p2: number, t: number): number => {
  const mt = 1 - t;
  return 3 * mt * mt * p1 + 6 * mt * t * (p2 - p1) + 3 * t * t * (1 - p2);
};

// Solve for parametric t given an x value, using Newton-Raphson with bisection fallback
const solveX = (x1: number, x2: number, x: number): number => {
  let t = x;
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const err = bezierAt(x1, x2, t) - x;
    if (Math.abs(err) < EPSILON) {
      return t;
    }
    const d = bezierDeriv(x1, x2, t);
    if (Math.abs(d) < EPSILON) {
      break;
    }
    t -= err / d;
  }

  let lo = 0;
  let hi = 1;
  t = x;
  for (let i = 0; i < 20; i++) {
    const v = bezierAt(x1, x2, t);
    if (Math.abs(v - x) < EPSILON) {
      return t;
    }
    if (v < x) {
      lo = t;
    } else {
      hi = t;
    }
    t = (lo + hi) / 2;
  }
  return t;
};

export class CubicBezier {
  /** @internal brand — do not use directly; see `isFirstClassValue()` */
  readonly __teikn_fcv__: true = true;
  readonly #x1: number;
  readonly #y1: number;
  readonly #x2: number;
  readonly #y2: number;

  constructor(x1: number, y1: number, x2: number, y2: number);
  constructor(input: { x1: number; y1: number; x2: number; y2: number } | CubicBezier | string);
  constructor(
    first: number | string | CubicBezier | { x1: number; y1: number; x2: number; y2: number },
    y1?: number,
    x2?: number,
    y2?: number,
  ) {
    if (first instanceof CubicBezier) {
      this.#x1 = first.#x1;
      this.#y1 = first.#y1;
      this.#x2 = first.#x2;
      this.#y2 = first.#y2;
      return;
    }

    if (typeof first === "string") {
      const named = presets[first.trim().toLowerCase()];
      if (named) {
        [this.#x1, this.#y1, this.#x2, this.#y2] = named;
        return;
      }
      const m = first.match(RE);
      if (!m) {
        throw new Error(`Invalid cubic-bezier: "${first}"`);
      }
      this.#x1 = clampX(parseFloat(m[1]!));
      this.#y1 = parseFloat(m[2]!);
      this.#x2 = clampX(parseFloat(m[3]!));
      this.#y2 = parseFloat(m[4]!);
      return;
    }

    if (typeof first === "object") {
      this.#x1 = clampX(first.x1);
      this.#y1 = first.y1;
      this.#x2 = clampX(first.x2);
      this.#y2 = first.y2;
      return;
    }

    this.#x1 = clampX(first);
    this.#y1 = y1!;
    this.#x2 = clampX(x2!);
    this.#y2 = y2!;
  }

  static from(
    value: CubicBezier | { x1: number; y1: number; x2: number; y2: number } | string,
  ): CubicBezier {
    if (typeof value === "object" && !(value instanceof CubicBezier)) {
      return new CubicBezier(value);
    }
    return new CubicBezier(value);
  }

  get x1(): number {
    return this.#x1;
  }

  get y1(): number {
    return this.#y1;
  }

  get x2(): number {
    return this.#x2;
  }

  get y2(): number {
    return this.#y2;
  }

  get controlPoints(): ControlPoints {
    return [this.#x1, this.#y1, this.#x2, this.#y2];
  }

  /** Evaluate the easing curve at a given time (0–1), returning progress (0–1) */
  at(t: number): number {
    if (t <= 0) {
      return 0;
    }
    if (t >= 1) {
      return 1;
    }
    return bezierAt(this.#y1, this.#y2, solveX(this.#x1, this.#x2, t));
  }

  /** Create the time-reversed curve (plays the animation backwards) */
  reverse(): CubicBezier {
    return new CubicBezier(1 - this.#x2, 1 - this.#y2, 1 - this.#x1, 1 - this.#y1);
  }

  /** Scale the progress-axis intensity of the curve */
  scaleY(factor: number): CubicBezier {
    return new CubicBezier(this.#x1, this.#y1 * factor, this.#x2, this.#y2 * factor);
  }

  /** The CSS keyword for this curve, or null if it doesn't match a named timing */
  get keyword(): string | null {
    for (const [name, pts] of Object.entries(cssTimings)) {
      if (
        this.#x1 === pts[0] &&
        this.#y1 === pts[1] &&
        this.#x2 === pts[2] &&
        this.#y2 === pts[3]
      ) {
        return name;
      }
    }
    return null;
  }

  toJSON(): string {
    return this.toString();
  }

  toString(): string {
    return `cubic-bezier(${this.#x1}, ${this.#y1}, ${this.#x2}, ${this.#y2})`;
  }

  // ─── Named presets ──────────────────────────────────────────

  static readonly ease: CubicBezier = new CubicBezier(...presets["ease"]!);
  static readonly easeIn: CubicBezier = new CubicBezier(...presets["ease-in"]!);
  static readonly easeOut: CubicBezier = new CubicBezier(...presets["ease-out"]!);
  static readonly easeInOut: CubicBezier = new CubicBezier(...presets["ease-in-out"]!);
  static readonly linear: CubicBezier = new CubicBezier(...presets["linear"]!);

  // Material Design standard curves
  static readonly standard: CubicBezier = new CubicBezier(...presets["standard"]!);
  static readonly accelerate: CubicBezier = new CubicBezier(...presets["accelerate"]!);
  static readonly decelerate: CubicBezier = new CubicBezier(...presets["decelerate"]!);
}

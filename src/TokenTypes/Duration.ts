// ─── Unit Type ──────────────────────────────────────────────

export type DurationUnit = 'ms' | 's';

export const durationUnits: ReadonlySet<DurationUnit> = new Set<DurationUnit>(['ms', 's']);

export const isDurationUnit = (unit: string): unit is DurationUnit => unit === 'ms' || unit === 's';

// ─── Conversion ─────────────────────────────────────────────
// ms is canonical (like px for Dimension, RGB for Color).

export const convertDuration = (value: number, from: DurationUnit, to: DurationUnit): number => {
  if (from === to) {
    return value;
  }
  return from === 'ms' ? value / 1000 : value * 1000;
};

// ─── Parsing ────────────────────────────────────────────────

const PARSE_RE = /^(-?\d+(?:\.\d+)?)(ms|s)$/;

const parseCss = (css: string): { value: number; unit: DurationUnit } => {
  const m = css.trim().match(PARSE_RE);
  if (!m) {
    throw new Error(`Invalid duration: "${css}"`);
  }
  return { value: parseFloat(m[1]!), unit: m[2]! as DurationUnit };
};

// ─── Duration ───────────────────────────────────────────────

export class Duration {
  readonly #value: number;
  readonly #unit: DurationUnit;

  constructor(value: number, unit: DurationUnit);
  constructor(css: Duration | string);
  constructor(first: number | string | Duration, unit?: DurationUnit) {
    if (first instanceof Duration) {
      this.#value = first.#value;
      this.#unit = first.#unit;
      return;
    }

    if (typeof first === 'string') {
      const parsed = parseCss(first);
      this.#value = parsed.value;
      this.#unit = parsed.unit;
      return;
    }

    this.#value = first;
    this.#unit = unit!;
  }

  get value(): number {
    return this.#value;
  }
  get unit(): DurationUnit {
    return this.#unit;
  }

  // ─── Conversion ─────────────────────────────────────────────

  to(targetUnit: DurationUnit): Duration {
    return new Duration(convertDuration(this.#value, this.#unit, targetUnit), targetUnit);
  }

  toMs(): Duration {
    return this.to('ms');
  }

  toS(): Duration {
    return this.to('s');
  }

  ms(): number {
    return this.#unit === 'ms' ? this.#value : this.#value * 1000;
  }

  // ─── Math ───────────────────────────────────────────────────

  scale(factor: number): Duration {
    return new Duration(this.#value * factor, this.#unit);
  }

  add(other: Duration): Duration {
    if (this.#unit === other.#unit) {
      return new Duration(this.#value + other.#value, this.#unit);
    }
    const converted = other.to(this.#unit);
    return new Duration(this.#value + converted.value, this.#unit);
  }

  subtract(other: Duration): Duration {
    if (this.#unit === other.#unit) {
      return new Duration(this.#value - other.#value, this.#unit);
    }
    const converted = other.to(this.#unit);
    return new Duration(this.#value - converted.value, this.#unit);
  }

  // ─── Comparison ─────────────────────────────────────────────

  equals(other: Duration): boolean {
    return this.#value === other.#value && this.#unit === other.#unit;
  }

  // ─── Serialization ─────────────────────────────────────────

  toJSON(): string {
    return this.toString();
  }

  toString(): string {
    return `${this.#value}${this.#unit}`;
  }

  // ─── Static helpers ──────────────────────────────────────────

  static zero(unit: DurationUnit = 'ms'): Duration {
    return new Duration(0, unit);
  }

  static parse(css: string): Duration {
    return new Duration(css);
  }

  static convert(value: number, from: DurationUnit, to: DurationUnit): number {
    return convertDuration(value, from, to);
  }
}

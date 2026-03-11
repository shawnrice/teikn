// ─── Unit Types ─────────────────────────────────────────────

export type AbsoluteUnit = 'px' | 'cm' | 'mm' | 'in' | 'pt' | 'pc' | 'Q';

export type ViewportUnit =
  | 'vw'
  | 'vh'
  | 'vmin'
  | 'vmax'
  | 'svw'
  | 'svh'
  | 'lvw'
  | 'lvh'
  | 'dvw'
  | 'dvh';

export type FontRelativeUnit = 'em' | 'rem' | 'ch' | 'ex' | 'lh' | 'rlh';
export type ContainerUnit = 'cqi' | 'cqb';
export type FlexUnit = 'fr';
export type PercentageUnit = '%';

export type DimensionUnit =
  | AbsoluteUnit
  | ViewportUnit
  | FontRelativeUnit
  | ContainerUnit
  | FlexUnit
  | PercentageUnit;

// ─── Unit Sets (runtime) ────────────────────────────────────

export const absoluteUnits: ReadonlySet<string> = new Set<AbsoluteUnit>([
  'px',
  'cm',
  'mm',
  'in',
  'pt',
  'pc',
  'Q',
]);

export const viewportUnits: ReadonlySet<string> = new Set<ViewportUnit>([
  'vw',
  'vh',
  'vmin',
  'vmax',
  'svw',
  'svh',
  'lvw',
  'lvh',
  'dvw',
  'dvh',
]);

export const fontRelativeUnits: ReadonlySet<string> = new Set<FontRelativeUnit>([
  'em',
  'rem',
  'ch',
  'ex',
  'lh',
  'rlh',
]);

export const containerUnits: ReadonlySet<string> = new Set<ContainerUnit>(['cqi', 'cqb']);

export const allUnits: ReadonlySet<string> = new Set([
  ...absoluteUnits,
  ...viewportUnits,
  ...fontRelativeUnits,
  ...containerUnits,
  'fr',
  '%',
] as const);

// ─── Conversion Factors ─────────────────────────────────────
// Absolute units: px is canonical. Value = how many px per 1 of this unit.
// Like Color's RGB being the canonical space all others convert through.

export const absoluteConversions: Readonly<Record<AbsoluteUnit, number>> = {
  px: 1,
  in: 96,
  cm: 96 / 2.54,
  mm: 96 / 25.4,
  pt: 96 / 72,
  pc: 16,
  Q: 96 / 101.6,
};

// ─── Unit Predicates ────────────────────────────────────────

export const isAbsoluteUnit = (unit: string): unit is AbsoluteUnit => absoluteUnits.has(unit);

export const isViewportUnit = (unit: string): unit is ViewportUnit => viewportUnits.has(unit);

export const isFontRelativeUnit = (unit: string): unit is FontRelativeUnit =>
  fontRelativeUnits.has(unit);

export const isContainerUnit = (unit: string): unit is ContainerUnit => containerUnits.has(unit);

export const isDimensionUnit = (unit: string): unit is DimensionUnit => allUnits.has(unit);

export const isConvertible = (from: string, to: string): boolean => {
  if (from === to) {
    return true;
  }
  // Absolute ↔ absolute
  if (isAbsoluteUnit(from) && isAbsoluteUnit(to)) {
    return true;
  }
  // px ↔ rem (with configurable base)
  if ((from === 'px' && to === 'rem') || (from === 'rem' && to === 'px')) {
    return true;
  }
  return false;
};

// ─── Static Conversion ──────────────────────────────────────

export const convertDimension = (
  value: number,
  from: string,
  to: string,
  { remBase = 16 }: { remBase?: number } = {},
): number => {
  if (from === to) {
    return value;
  }

  // px ↔ rem
  if (from === 'px' && to === 'rem') {
    return value / remBase;
  }
  if (from === 'rem' && to === 'px') {
    return value * remBase;
  }

  // Absolute ↔ absolute (through px)
  const fromFactor = absoluteConversions[from as AbsoluteUnit];
  const toFactor = absoluteConversions[to as AbsoluteUnit];
  if (fromFactor === undefined || toFactor === undefined) {
    throw new Error(`Cannot convert ${from} to ${to}`);
  }

  return (value * fromFactor) / toFactor;
};

// ─── Parsing ────────────────────────────────────────────────

const PARSE_RE =
  /^(-?\d+(?:\.\d+)?)(px|rem|em|%|cm|mm|in|pt|pc|Q|vw|vh|vmin|vmax|ch|ex|fr|svw|svh|lvw|lvh|dvw|dvh|lh|rlh|cqi|cqb)$/;

const parseCss = (css: string): { value: number; unit: DimensionUnit } => {
  const m = css.trim().match(PARSE_RE);
  if (!m) {
    throw new Error(`Invalid dimension: "${css}"`);
  }
  return { value: parseFloat(m[1]!), unit: m[2]! as DimensionUnit };
};

// ─── Dimension ──────────────────────────────────────────────

export class Dimension {
  readonly #value: number;
  readonly #unit: DimensionUnit;

  constructor(value: number, unit: DimensionUnit);
  constructor(css: Dimension | string);
  constructor(first: number | string | Dimension, unit?: DimensionUnit) {
    if (first instanceof Dimension) {
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
  get unit(): DimensionUnit {
    return this.#unit;
  }

  // ─── Unit classification ────────────────────────────────────

  get isAbsolute(): boolean {
    return isAbsoluteUnit(this.#unit);
  }
  get isRelative(): boolean {
    return !isAbsoluteUnit(this.#unit);
  }
  get isViewport(): boolean {
    return isViewportUnit(this.#unit);
  }
  get isFontRelative(): boolean {
    return isFontRelativeUnit(this.#unit);
  }
  get isContainer(): boolean {
    return isContainerUnit(this.#unit);
  }

  isConvertibleTo(target: DimensionUnit): boolean {
    return isConvertible(this.#unit, target);
  }

  // ─── Conversion ─────────────────────────────────────────────

  to(targetUnit: DimensionUnit, { remBase = 16 }: { remBase?: number } = {}): Dimension {
    return new Dimension(
      convertDimension(this.#value, this.#unit, targetUnit, { remBase }),
      targetUnit,
    );
  }

  toRem(base = 16): Dimension {
    return this.to('rem', { remBase: base });
  }

  toPx(base = 16): Dimension {
    return this.to('px', { remBase: base });
  }

  // ─── Math ───────────────────────────────────────────────────

  scale(factor: number): Dimension {
    return new Dimension(this.#value * factor, this.#unit);
  }

  add(other: Dimension): Dimension {
    if (this.#unit !== other.#unit) {
      throw new Error(`Cannot add ${this.#unit} and ${other.#unit} — convert first`);
    }
    return new Dimension(this.#value + other.#value, this.#unit);
  }

  subtract(other: Dimension): Dimension {
    if (this.#unit !== other.#unit) {
      throw new Error(`Cannot subtract ${this.#unit} and ${other.#unit} — convert first`);
    }
    return new Dimension(this.#value - other.#value, this.#unit);
  }

  negate(): Dimension {
    return new Dimension(-this.#value, this.#unit);
  }

  // ─── Comparison ─────────────────────────────────────────────

  equals(other: Dimension): boolean {
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

  static zero(unit: DimensionUnit = 'px'): Dimension {
    return new Dimension(0, unit);
  }

  static parse(css: string): Dimension {
    return new Dimension(css);
  }

  static convert(
    value: number,
    from: DimensionUnit,
    to: DimensionUnit,
    opts?: { remBase?: number },
  ): number {
    return convertDimension(value, from, to, opts);
  }
}

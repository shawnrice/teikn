import { splitTopLevel } from '../string-utils.js';
import { Color } from './Color/index.js';
import type { RefFields } from './ref-guard.js';
import { assertNotRef, isRefString } from './ref-guard.js';

// Coerce a color field. A `{ref}` string passes through untouched — references
// are resolved later by `resolve.ts` (which rebuilds the wrapper via the
// RefFields protocol), then the resolved concrete color flows back through here.
const toColor = (value: Color | string | undefined): Color | string => {
  if (value === undefined) {
    return new Color(0, 0, 0);
  }

  if (value instanceof Color || isRefString(value)) {
    return value;
  }

  return new Color(value);
};

const lengthRe = /^(-?\d+(?:\.\d+)?)(px|rem|em)?/;

const fmtLength = (v: number): string => (v === 0 ? '0' : `${v}px`);

// The leftover token after the numeric lengths is the color: a `{ref}` string
// (kept for per-field resolution), a parsed Color, or black when absent.
const parseShorthandColor = (s: string): Color | string => {
  if (s.length === 0) {
    return new Color(0, 0, 0);
  }

  return isRefString(s) ? s : new Color(s);
};

const stripKeyword = (str: string, keyword: string): string => {
  if (str.startsWith(`${keyword} `)) {
    return str.slice(keyword.length + 1).trim();
  }

  if (str.endsWith(` ${keyword}`)) {
    return str.slice(0, -keyword.length - 1).trim();
  }

  return str;
};

const parse = (
  str: string,
): {
  offsetX: number;
  offsetY: number;
  blur: number;
  spread: number;
  color: Color | string;
  inset: boolean;
} => {
  const trimmed = str.trim();

  const withoutInset = stripKeyword(trimmed, 'inset');
  const inset = withoutInset !== trimmed;

  const nums: number[] = [];
  let s = withoutInset;

  while (s.length > 0) {
    const m = s.match(lengthRe);

    if (!m) {
      break;
    }

    nums.push(parseFloat(m[1]!));
    s = s.slice(m[0].length).trim();
  }

  // A `{ref}` color in the shorthand (e.g. "0 2px 8px {color.ink}") is kept as a
  // reference string rather than erroring; it resolves per-field later.
  const color = parseShorthandColor(s);

  return {
    offsetX: nums[0] ?? 0,
    offsetY: nums[1] ?? 0,
    blur: nums[2] ?? 0,
    spread: nums[3] ?? 0,
    color,
    inset,
  };
};

export type BoxShadowOptions = {
  offsetX?: number;
  offsetY?: number;
  blur?: number;
  spread?: number;
  color?: Color | string;
  inset?: boolean;
};

export class BoxShadow implements RefFields {
  /** @internal brand — do not use directly; see `isFirstClassValue()` */
  readonly __teikn_fcv__: true = true;
  readonly #offsetX: number;
  readonly #offsetY: number;
  readonly #blur: number;
  readonly #spread: number;
  readonly #color: Color | string;
  readonly #inset: boolean;

  constructor(
    offsetX: number,
    offsetY: number,
    blur?: number,
    spread?: number,
    color?: Color | string,
    inset?: boolean,
  );
  constructor(input: BoxShadow | BoxShadowOptions | string);
  constructor(
    first: number | string | BoxShadow | BoxShadowOptions,
    offsetY?: number,
    blur?: number,
    spread?: number,
    color?: Color | string,
    inset?: boolean,
  ) {
    if (first instanceof BoxShadow) {
      this.#offsetX = first.#offsetX;
      this.#offsetY = first.#offsetY;
      this.#blur = first.#blur;
      this.#spread = first.#spread;
      this.#color = first.#color;
      this.#inset = first.#inset;

      return;
    }

    if (typeof first === 'string') {
      assertNotRef(first, 'BoxShadow');
      const parsed = parse(first);
      this.#offsetX = parsed.offsetX;
      this.#offsetY = parsed.offsetY;
      this.#blur = parsed.blur;
      this.#spread = parsed.spread;
      this.#color = parsed.color;
      this.#inset = parsed.inset;

      return;
    }

    if (typeof first === 'object') {
      this.#offsetX = first.offsetX ?? 0;
      this.#offsetY = first.offsetY ?? 0;
      this.#blur = first.blur ?? 0;
      this.#spread = first.spread ?? 0;
      this.#color = toColor(first.color);
      this.#inset = first.inset ?? false;

      return;
    }

    this.#offsetX = first;
    this.#offsetY = offsetY ?? 0;
    this.#blur = blur ?? 0;
    this.#spread = spread ?? 0;
    this.#color = toColor(color);
    this.#inset = inset ?? false;
  }

  get offsetX(): number {
    return this.#offsetX;
  }
  get offsetY(): number {
    return this.#offsetY;
  }
  get blur(): number {
    return this.#blur;
  }
  get spread(): number {
    return this.#spread;
  }
  get color(): Color | string {
    return this.#color;
  }
  get inset(): boolean {
    return this.#inset;
  }

  // ─── Per-field reference protocol ────────────────────────────
  // Lets a shadow hold `{ref}` strings in its fields (resolved per-field by
  // `resolve.ts`) instead of erroring, mirroring Border / Typography.

  /** @internal */
  __teikn_fields__(): Record<string, unknown> {
    return {
      offsetX: this.#offsetX,
      offsetY: this.#offsetY,
      blur: this.#blur,
      spread: this.#spread,
      color: this.#color,
      inset: this.#inset,
    };
  }

  /** @internal */
  // oxlint-disable-next-line class-methods-use-this -- protocol method, detected per-instance
  __teikn_fromFields__(fields: Record<string, unknown>): BoxShadow {
    return new BoxShadow(fields as BoxShadowOptions);
  }

  with(updates: BoxShadowOptions): BoxShadow {
    return new BoxShadow(
      updates.offsetX ?? this.#offsetX,
      updates.offsetY ?? this.#offsetY,
      updates.blur ?? this.#blur,
      updates.spread ?? this.#spread,
      updates.color ?? this.#color,
      updates.inset ?? this.#inset,
    );
  }

  /** Scale all numeric values (offsets, blur, spread) by a factor */
  scale(factor: number): BoxShadow {
    return new BoxShadow(
      this.#offsetX * factor,
      this.#offsetY * factor,
      this.#blur * factor,
      this.#spread * factor,
      this.#color,
      this.#inset,
    );
  }

  toJSON(): string {
    return this.toString();
  }

  toString(): string {
    const parts: string[] = [];

    if (this.#inset) {
      parts.push('inset');
    }

    parts.push(fmtLength(this.#offsetX));
    parts.push(fmtLength(this.#offsetY));

    if (this.#blur !== 0 || this.#spread !== 0) {
      parts.push(fmtLength(this.#blur));
    }

    if (this.#spread !== 0) {
      parts.push(fmtLength(this.#spread));
    }

    parts.push(String(this.#color));

    return parts.join(' ');
  }

  static from(value: BoxShadow | BoxShadowOptions | string): BoxShadow {
    if (typeof value === 'object' && !(value instanceof BoxShadow)) {
      return new BoxShadow(value);
    }

    return new BoxShadow(value);
  }

  /** Combine multiple shadows into a single CSS value */
  static combine(...shadows: BoxShadow[]): string {
    return shadows.map(s => s.toString()).join(', ');
  }
}

export class BoxShadowList implements RefFields {
  /** @internal brand — do not use directly; see `isFirstClassValue()` */
  readonly __teikn_fcv__: true = true;
  readonly #layers: readonly BoxShadow[];

  constructor(value: BoxShadow[] | string | BoxShadowList);
  constructor(first: BoxShadow[] | string | BoxShadowList) {
    if (first instanceof BoxShadowList) {
      this.#layers = first.#layers;

      return;
    }

    if (typeof first === 'string') {
      assertNotRef(first, 'BoxShadowList');
      this.#layers = splitTopLevel(first).map(s => new BoxShadow(s));

      return;
    }

    this.#layers = [...first];
  }

  get layers(): readonly BoxShadow[] {
    return this.#layers;
  }
  get length(): number {
    return this.#layers.length;
  }

  at(index: number): BoxShadow | undefined {
    return this.#layers[index];
  }

  map(fn: (shadow: BoxShadow, index: number) => BoxShadow): BoxShadowList {
    return new BoxShadowList(this.#layers.map(fn));
  }

  // ─── Per-field reference protocol ────────────────────────────
  // Each layer is itself a RefFields BoxShadow, so exposing the layers lets
  // resolve.ts descend and resolve a per-layer `{ref}` color.

  /** @internal */
  __teikn_fields__(): Record<string, unknown> {
    return { layers: [...this.#layers] };
  }

  /** @internal */
  // oxlint-disable-next-line class-methods-use-this -- protocol method, detected per-instance
  __teikn_fromFields__(fields: Record<string, unknown>): BoxShadowList {
    return new BoxShadowList(fields.layers as BoxShadow[]);
  }

  toJSON(): string {
    return this.toString();
  }

  toString(): string {
    return this.#layers.map(s => s.toString()).join(', ');
  }

  static from(value: BoxShadowList | string | BoxShadow[]): BoxShadowList {
    return new BoxShadowList(value);
  }
}

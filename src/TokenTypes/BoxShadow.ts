import { splitTopLevel } from "../string-utils";
import { Color } from "./Color";

const lengthRe = /^(-?\d+(?:\.\d+)?)(px|rem|em)?/;

const fmtLength = (v: number): string => (v === 0 ? "0" : `${v}px`);

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
  color: Color;
  inset: boolean;
} => {
  const trimmed = str.trim();

  const withoutInset = stripKeyword(trimmed, "inset");
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

  const color = s.length > 0 ? new Color(s) : new Color(0, 0, 0);

  return {
    offsetX: nums[0] ?? 0,
    offsetY: nums[1] ?? 0,
    blur: nums[2] ?? 0,
    spread: nums[3] ?? 0,
    color,
    inset,
  };
};

export class BoxShadow {
  readonly #offsetX: number;
  readonly #offsetY: number;
  readonly #blur: number;
  readonly #spread: number;
  readonly #color: Color;
  readonly #inset: boolean;

  constructor(
    offsetX: number,
    offsetY: number,
    blur?: number,
    spread?: number,
    color?: Color | string,
    inset?: boolean,
  );
  constructor(value: BoxShadow | string);
  constructor(
    first: number | string | BoxShadow,
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

    if (typeof first === "string") {
      const parsed = parse(first);
      this.#offsetX = parsed.offsetX;
      this.#offsetY = parsed.offsetY;
      this.#blur = parsed.blur;
      this.#spread = parsed.spread;
      this.#color = parsed.color;
      this.#inset = parsed.inset;
      return;
    }

    this.#offsetX = first;
    this.#offsetY = offsetY ?? 0;
    this.#blur = blur ?? 0;
    this.#spread = spread ?? 0;
    this.#color = typeof color === "string" ? new Color(color) : (color ?? new Color(0, 0, 0));
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
  get color(): Color {
    return this.#color;
  }
  get inset(): boolean {
    return this.#inset;
  }

  with(
    updates: Partial<{
      offsetX: number;
      offsetY: number;
      blur: number;
      spread: number;
      color: Color | string;
      inset: boolean;
    }>,
  ): BoxShadow {
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
      parts.push("inset");
    }
    parts.push(fmtLength(this.#offsetX));
    parts.push(fmtLength(this.#offsetY));
    if (this.#blur !== 0 || this.#spread !== 0) {
      parts.push(fmtLength(this.#blur));
    }
    if (this.#spread !== 0) {
      parts.push(fmtLength(this.#spread));
    }
    parts.push(this.#color.toString());
    return parts.join(" ");
  }

  /** Combine multiple shadows into a single CSS value */
  static combine(...shadows: BoxShadow[]): string {
    return shadows.map((s) => s.toString()).join(", ");
  }
}

export class BoxShadowList {
  readonly #layers: readonly BoxShadow[];

  constructor(value: BoxShadow[] | string | BoxShadowList);
  constructor(first: BoxShadow[] | string | BoxShadowList) {
    if (first instanceof BoxShadowList) {
      this.#layers = first.#layers;
      return;
    }

    if (typeof first === "string") {
      this.#layers = splitTopLevel(first).map((s) => new BoxShadow(s));
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

  toJSON(): string {
    return this.toString();
  }

  toString(): string {
    return this.#layers.map((s) => s.toString()).join(", ");
  }
}

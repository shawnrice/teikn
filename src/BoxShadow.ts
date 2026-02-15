import { Color } from './Color';

const lengthRe = /^(-?\d+(?:\.\d+)?)(px|rem|em)?/;

const fmtLength = (v: number): string => (v === 0 ? '0' : `${v}px`);

const parse = (str: string): {
  offsetX: number;
  offsetY: number;
  blur: number;
  spread: number;
  color: Color;
  inset: boolean;
} => {
  let s = str.trim();

  let inset = false;
  if (s.startsWith('inset ')) {
    inset = true;
    s = s.slice(6).trim();
  } else if (s.endsWith(' inset')) {
    inset = true;
    s = s.slice(0, -6).trim();
  }

  const nums: number[] = [];
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
  constructor(value: string);
  constructor(value: BoxShadow);
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

    if (typeof first === 'string') {
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
    this.#color = typeof color === 'string' ? new Color(color) : (color ?? new Color(0, 0, 0));
    this.#inset = inset ?? false;
  }

  get offsetX(): number { return this.#offsetX; }
  get offsetY(): number { return this.#offsetY; }
  get blur(): number { return this.#blur; }
  get spread(): number { return this.#spread; }
  get color(): Color { return this.#color; }
  get inset(): boolean { return this.#inset; }

  setOffsetX(x: number): BoxShadow {
    return new BoxShadow(x, this.#offsetY, this.#blur, this.#spread, this.#color, this.#inset);
  }

  setOffsetY(y: number): BoxShadow {
    return new BoxShadow(this.#offsetX, y, this.#blur, this.#spread, this.#color, this.#inset);
  }

  setBlur(blur: number): BoxShadow {
    return new BoxShadow(this.#offsetX, this.#offsetY, blur, this.#spread, this.#color, this.#inset);
  }

  setSpread(spread: number): BoxShadow {
    return new BoxShadow(this.#offsetX, this.#offsetY, this.#blur, spread, this.#color, this.#inset);
  }

  setColor(color: Color | string): BoxShadow {
    return new BoxShadow(this.#offsetX, this.#offsetY, this.#blur, this.#spread, color, this.#inset);
  }

  setInset(inset: boolean): BoxShadow {
    return new BoxShadow(this.#offsetX, this.#offsetY, this.#blur, this.#spread, this.#color, inset);
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
    parts.push(this.#color.toString());
    return parts.join(' ');
  }

  /** Combine multiple shadows into a single CSS value */
  static combine(...shadows: BoxShadow[]): string {
    return shadows.map(s => s.toString()).join(', ');
  }
}

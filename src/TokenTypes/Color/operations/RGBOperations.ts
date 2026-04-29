import type { Color, InternalCreate } from "../Color.js";
import type { RGB } from "../types.js";

export class RGBOperations {
  #color: Color;
  #new: InternalCreate;

  constructor(color: Color, createInternal: InternalCreate) {
    this.#color = color;
    this.#new = createInternal;
  }

  #rgb(): RGB {
    return this.#color.asRGB();
  }

  red(): number;
  red(value: number): Color;
  red(value?: number): number | Color {
    if (value === undefined) {
      return this.#rgb()[0];
    }
    const [, g, b] = this.#rgb();
    return this.#new("rgb", [value, g, b], this.#color.alpha);
  }

  green(): number;
  green(value: number): Color;
  green(value?: number): number | Color {
    if (value === undefined) {
      return this.#rgb()[1];
    }
    const [r, , b] = this.#rgb();
    return this.#new("rgb", [r, value, b], this.#color.alpha);
  }

  blue(): number;
  blue(value: number): Color;
  blue(value?: number): number | Color {
    if (value === undefined) {
      return this.#rgb()[2];
    }
    const [r, g] = this.#rgb();
    return this.#new("rgb", [r, g, value], this.#color.alpha);
  }

  mix(color: Color | string, amount = 0.5): Color {
    return this.#color.mix(color, amount);
  }

  invert(): Color {
    return this.#color.invert();
  }

  toString(): string {
    return this.#color.toString("rgb");
  }
}

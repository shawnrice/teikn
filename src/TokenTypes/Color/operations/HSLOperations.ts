import type { Color, InternalCreate } from "../Color";
import type { HSL } from "../types";
import { degreeRange, percentRange } from "../util";

export class HSLOperations {
  #color: Color;
  #new: InternalCreate;

  constructor(color: Color, createInternal: InternalCreate) {
    this.#color = color;
    this.#new = createInternal;
  }

  #hsl(): HSL {
    return this.#color.asHSL();
  }

  hue(): number;
  hue(value: number): Color;
  hue(value?: number): number | Color {
    if (value === undefined) {
      return this.#hsl()[0];
    }
    const [, s, l] = this.#hsl();
    return this.#new("hsl", [degreeRange(value), s, l], this.#color.alpha);
  }

  saturation(): number;
  saturation(value: number): Color;
  saturation(value?: number): number | Color {
    if (value === undefined) {
      return this.#hsl()[1];
    }
    const [h, , l] = this.#hsl();
    return this.#new("hsl", [h, percentRange(value), l], this.#color.alpha);
  }

  lightness(): number;
  lightness(value: number): Color;
  lightness(value?: number): number | Color {
    if (value === undefined) {
      return this.#hsl()[2];
    }
    const [h, s] = this.#hsl();
    return this.#new("hsl", [h, s, percentRange(value)], this.#color.alpha);
  }

  rotateHue(degrees: number): Color {
    const newHue = (this.hue() + degrees) % 360;
    return this.hue(newHue < 0 ? newHue + 360 : newHue);
  }

  complement(): Color {
    return this.rotateHue(180);
  }

  lighten(amount: number): Color {
    const l = this.lightness();
    return this.lightness(l + amount * l);
  }

  darken(amount: number): Color {
    return this.lighten(-amount);
  }

  toString(): string {
    return this.#color.toString("hsl");
  }
}

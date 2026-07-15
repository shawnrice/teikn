import type { Color, InternalCreate } from '../Color.js';
import type { LCH } from '../types.js';
import { normalizeDegrees } from '../util.js';

export class LCHOperations {
  #color: Color;
  #new: InternalCreate;

  constructor(color: Color, createInternal: InternalCreate) {
    this.#color = color;
    this.#new = createInternal;
  }

  #lch(): LCH {
    return this.#color.asLCH();
  }

  lightness(): number;
  lightness(value: number): Color;
  lightness(value?: number): number | Color {
    if (value === undefined) {
      return this.#lch()[0];
    }

    const [, c, h] = this.#lch();

    return this.#new('lch', [value, c, h], this.#color.alpha);
  }

  chroma(): number;
  chroma(value: number): Color;
  chroma(value?: number): number | Color {
    if (value === undefined) {
      return this.#lch()[1];
    }

    const [l, , h] = this.#lch();

    return this.#new('lch', [l, value, h], this.#color.alpha);
  }

  hue(): number;
  hue(value: number): Color;
  hue(value?: number): number | Color {
    if (value === undefined) {
      return this.#lch()[2];
    }

    const [l, c] = this.#lch();

    // Wrap the hue so an out-of-range value still serializes to a re-parseable
    // lch() string (the LCH parser only accepts 0–360).
    return this.#new('lch', [l, c, normalizeDegrees(value)], this.#color.alpha);
  }

  rotateHue(degrees: number): Color {
    const newHue = (this.hue() + degrees) % 360;

    return this.hue(newHue < 0 ? newHue + 360 : newHue);
  }

  complement(): Color {
    return this.rotateHue(180);
  }

  toString(): string {
    return this.#color.toString('lch');
  }
}

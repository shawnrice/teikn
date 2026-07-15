import type { Color, InternalCreate } from '../Color.js';
import type { Oklch } from '../types.js';
import { normalizeDegrees } from '../util.js';

/**
 * Oklch-space operations. Oklch is the authoring-friendly polar form of Oklab:
 * holding L constant while rotating hue keeps perceived lightness even, which is
 * exactly what makes it pleasant for generating balanced color palettes.
 */
export class OklchOperations {
  #color: Color;
  #new: InternalCreate;

  constructor(color: Color, createInternal: InternalCreate) {
    this.#color = color;
    this.#new = createInternal;
  }

  #oklch(): Oklch {
    return this.#color.asOklch();
  }

  lightness(): number;
  lightness(value: number): Color;
  lightness(value?: number): number | Color {
    if (value === undefined) {
      return this.#oklch()[0];
    }

    const [, c, h] = this.#oklch();

    return this.#new('oklch', [value, c, h], this.#color.alpha);
  }

  chroma(): number;
  chroma(value: number): Color;
  chroma(value?: number): number | Color {
    if (value === undefined) {
      return this.#oklch()[1];
    }

    const [l, , h] = this.#oklch();

    return this.#new('oklch', [l, value, h], this.#color.alpha);
  }

  hue(): number;
  hue(value: number): Color;
  hue(value?: number): number | Color {
    if (value === undefined) {
      return this.#oklch()[2];
    }

    const [l, c] = this.#oklch();

    // Wrap the hue for consistency with the other polar spaces (Oklch's parser
    // already normalizes any-degree hue, so this only affects the stored value).
    return this.#new('oklch', [l, c, normalizeDegrees(value)], this.#color.alpha);
  }

  rotateHue(degrees: number): Color {
    const newHue = (this.#oklch()[2] + degrees) % 360;

    return this.hue(newHue < 0 ? newHue + 360 : newHue);
  }

  complement(): Color {
    return this.rotateHue(180);
  }

  /** Lighten by adjusting L proportionally (holding chroma and hue) */
  lighten(amount: number): Color {
    const [L, c, h] = this.#oklch();

    return this.#new('oklch', [L + amount * L, c, h], this.#color.alpha);
  }

  darken(amount: number): Color {
    return this.lighten(-amount);
  }

  /** Increase chroma by an absolute amount (holding L and hue) */
  saturate(amount: number): Color {
    const [L, c, h] = this.#oklch();

    return this.#new('oklch', [L, Math.max(0, c + amount), h], this.#color.alpha);
  }

  desaturate(amount: number): Color {
    return this.saturate(-amount);
  }

  toString(): string {
    return this.#color.toString('oklch');
  }
}

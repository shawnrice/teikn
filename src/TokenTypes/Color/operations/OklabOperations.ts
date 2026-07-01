import type { Color, InternalCreate } from '../Color.js';
import type { Oklab } from '../types.js';
import { percentRange } from '../util.js';

export class OklabOperations {
  #color: Color;
  #new: InternalCreate;

  constructor(color: Color, createInternal: InternalCreate) {
    this.#color = color;
    this.#new = createInternal;
  }

  #oklab(): Oklab {
    return this.#color.asOklab();
  }

  lightness(): number;
  lightness(value: number): Color;
  lightness(value?: number): number | Color {
    if (value === undefined) {
      return this.#oklab()[0];
    }

    const [, a, b] = this.#oklab();

    return this.#new('oklab', [value, a, b], this.#color.alpha);
  }

  a(): number;
  a(value: number): Color;
  a(value?: number): number | Color {
    if (value === undefined) {
      return this.#oklab()[1];
    }

    const [L, , b] = this.#oklab();

    return this.#new('oklab', [L, value, b], this.#color.alpha);
  }

  b(): number;
  b(value: number): Color;
  b(value?: number): number | Color {
    if (value === undefined) {
      return this.#oklab()[2];
    }

    const [L, a] = this.#oklab();

    return this.#new('oklab', [L, a, value], this.#color.alpha);
  }

  /**
   * Interpolate L, a, b linearly — the CSS-accurate Oklab lerp, and the most
   * perceptually uniform mix available on a `Color`.
   */
  mix(other: Color, amount = 0.5): Color {
    const amt = percentRange(amount);
    const thisOklab = this.#oklab();
    const otherOklab = other.asOklab();
    const mixed: Oklab = [
      thisOklab[0] * (1 - amt) + otherOklab[0] * amt,
      thisOklab[1] * (1 - amt) + otherOklab[1] * amt,
      thisOklab[2] * (1 - amt) + otherOklab[2] * amt,
    ];
    const alpha = this.#color.alpha * (1 - amt) + other.alpha * amt;

    return this.#new('oklab', mixed, alpha);
  }

  lighten(amount: number): Color {
    const [L, a, b] = this.#oklab();

    return this.#new('oklab', [L + amount * L, a, b], this.#color.alpha);
  }

  darken(amount: number): Color {
    return this.lighten(-amount);
  }

  toString(): string {
    return this.#color.toString('oklab');
  }
}

import type { Color, InternalCreate } from '../Color';
import type { LAB } from '../types';
import { percentRange } from '../util';

export class LABOperations {
  #color: Color;
  #new: InternalCreate;

  constructor(color: Color, createInternal: InternalCreate) {
    this.#color = color;
    this.#new = createInternal;
  }

  #lab(): LAB {
    return this.#color.asLAB();
  }

  lightness(): number;
  lightness(value: number): Color;
  lightness(value?: number): number | Color {
    if (value === undefined) {
      return this.#lab()[0];
    }
    const [, a, b] = this.#lab();
    return this.#new('lab', [value, a, b], this.#color.alpha);
  }

  a(): number;
  a(value: number): Color;
  a(value?: number): number | Color {
    if (value === undefined) {
      return this.#lab()[1];
    }
    const [L, , b] = this.#lab();
    return this.#new('lab', [L, value, b], this.#color.alpha);
  }

  b(): number;
  b(value: number): Color;
  b(value?: number): number | Color {
    if (value === undefined) {
      return this.#lab()[2];
    }
    const [L, a] = this.#lab();
    return this.#new('lab', [L, a, value], this.#color.alpha);
  }

  mix(other: Color, amount = 0.5): Color {
    const amt = percentRange(amount);
    const thisLab = this.#lab();
    const otherLab = other.asLAB();
    const mixed: LAB = [
      thisLab[0] * (1 - amt) + otherLab[0] * amt,
      thisLab[1] * (1 - amt) + otherLab[1] * amt,
      thisLab[2] * (1 - amt) + otherLab[2] * amt,
    ];
    const alpha = this.#color.alpha * (1 - amt) + other.alpha * amt;
    return this.#new('lab', mixed, alpha);
  }

  lighten(amount: number): Color {
    const [L, a, b] = this.#lab();
    return this.#new('lab', [L + amount * L, a, b], this.#color.alpha);
  }

  darken(amount: number): Color {
    return this.lighten(-amount);
  }

  toString(): string {
    return this.#color.toString('lab');
  }
}

import type { Color, InternalCreate } from '../Color';
import type { XYZ } from '../types';

export class XYZOperations {
  #color: Color;
  #new: InternalCreate;

  constructor(color: Color, createInternal: InternalCreate) {
    this.#color = color;
    this.#new = createInternal;
  }

  #xyz(): XYZ {
    return this.#color.asXYZ();
  }

  x(): number;
  x(value: number): Color;
  x(value?: number): number | Color {
    if (value === undefined) {
      return this.#xyz()[0];
    }
    const [, y, z] = this.#xyz();
    return this.#new('xyz', [value, y, z], this.#color.alpha);
  }

  y(): number;
  y(value: number): Color;
  y(value?: number): number | Color {
    if (value === undefined) {
      return this.#xyz()[1];
    }
    const [x, , z] = this.#xyz();
    return this.#new('xyz', [x, value, z], this.#color.alpha);
  }

  z(): number;
  z(value: number): Color;
  z(value?: number): number | Color {
    if (value === undefined) {
      return this.#xyz()[2];
    }
    const [x, y] = this.#xyz();
    return this.#new('xyz', [x, y, value], this.#color.alpha);
  }

  toString(): string {
    return this.#color.toString('xyz');
  }
}

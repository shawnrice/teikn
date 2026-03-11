import { describe, expect, test } from "bun:test";

import { Matrix } from "./Matrix";

describe("Matrix", () => {
  test("2x2 dot product", () => {
    const a = new Matrix([
      [1, 2],
      [3, 4],
    ]);
    const b = new Matrix([
      [1, 1],
      [1, 1],
    ]);
    expect(a.dot(b).toArray()).toEqual([
      [3, 3],
      [7, 7],
    ]);
  });

  test("at() returns element by row and column", () => {
    const m = new Matrix([
      [1, 2],
      [3, 4],
    ]);
    expect(m.at(0, 0)).toBe(1);
    expect(m.at(0, 1)).toBe(2);
    expect(m.at(1, 0)).toBe(3);
    expect(m.at(1, 1)).toBe(4);
  });

  test("rows and cols are correct", () => {
    const m = new Matrix([
      [1, 2, 3],
      [4, 5, 6],
    ]);
    expect(m.rows).toBe(2);
    expect(m.cols).toBe(3);
  });

  test("incompatible dimensions throws", () => {
    const a = new Matrix([[1, 2]]);
    const b = new Matrix([[1, 2]]);
    expect(() => a.dot(b)).toThrow();
  });

  test("3x3 identity preserves matrix", () => {
    const identity = new Matrix([
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ]);
    const m = new Matrix([
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9],
    ]);
    expect(m.dot(identity).toArray()).toEqual([
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9],
    ]);
  });

  test("3x3 times 3x1 vector", () => {
    const m = new Matrix([
      [2, 0, 0],
      [0, 3, 0],
      [0, 0, 4],
    ]);
    const v = new Matrix([[10], [20], [30]]);
    expect(m.dot(v).toArray()).toEqual([[20], [60], [120]]);
  });

  test("non-square multiplication", () => {
    const a = new Matrix([
      [1, 2, 3],
      [4, 5, 6],
    ]);
    const b = new Matrix([
      [7, 8],
      [9, 10],
      [11, 12],
    ]);
    expect(a.dot(b).toArray()).toEqual([
      [58, 64],
      [139, 154],
    ]);
  });
});

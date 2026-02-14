/**
 * Flat-array matrix with O(1) element access.
 * Internal storage is a single `number[]` indexed as `row * cols + col`.
 */
export class Matrix {
  readonly rows: number;
  readonly cols: number;
  readonly #data: number[];

  constructor(arr: number[][]);
  /** @internal */
  constructor(rows: number, cols: number, data: number[]);
  constructor(first: number | number[][], second?: number, third?: number[]) {
    if (typeof first === 'number') {
      this.rows = first;
      this.cols = second!;
      this.#data = third!;
    } else {
      this.rows = first.length;
      this.cols = first[0]?.length ?? 0;
      this.#data = first.flat();
    }
  }

  /** Element at (row, col) */
  at(row: number, col: number): number {
    return this.#data[row * this.cols + col]!;
  }

  /** Matrix multiplication */
  dot(other: Matrix): Matrix {
    const aCols = this.cols;
    const bCols = other.cols;

    if (aCols !== other.rows) {
      throw new Error(`Cannot multiply ${this.rows}x${aCols} by ${other.rows}x${bCols}`);
    }

    const aRows = this.rows;
    const aData = this.#data;
    const bData = other.#data;
    const data = new Array<number>(aRows * bCols);

    for (let i = 0; i < aRows; i++) {
      const rowOffset = i * aCols;
      for (let j = 0; j < bCols; j++) {
        let sum = 0;
        for (let k = 0; k < aCols; k++) {
          sum += aData[rowOffset + k]! * bData[k * bCols + j]!;
        }
        data[i * bCols + j] = sum;
      }
    }

    return new Matrix(aRows, bCols, data);
  }

  /** Convert to 2D array */
  toArray(): number[][] {
    const result: number[][] = [];
    for (let i = 0; i < this.rows; i++) {
      result.push(this.#data.slice(i * this.cols, (i + 1) * this.cols));
    }
    return result;
  }
}

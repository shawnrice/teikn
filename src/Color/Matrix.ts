// This class represents a matrix, which is an array of arrays of numbers.
// It has a static method for creating a new matrix from another matrix.
// It has a getter for getting the value of the matrix.
// It has a method for performing the dot product of two matrices.
// The dot product of two matrices is a new matrix whose value is the dot product of the first matrix and the second matrix.
// The dot product of two matrices is the sum of the products of the corresponding elements of the two matrices.

export class Matrix {
  #value: number[][];

  constructor(arr: number[][]) {
    this.#value = arr;
  }

  static from(matrix: Matrix | number[][]) {
    if (matrix instanceof Matrix) {
      return new Matrix(matrix.value);
    }

    if (
      typeof matrix === 'object' &&
      Array.isArray(matrix) &&
      matrix.every(x => Array.isArray(x))
    ) {
      return new Matrix(matrix);
    }

    // Invalid input
    throw new RangeError('Invalid input');
  }

  get value() {
    return this.#value;
  }

  dot(matrix: Matrix): Matrix {
    const A = this.value;
    const B = matrix.value;
    const next = A.map((row, i) =>
      B[0].map((_, j) => row.reduce((acc, _, n) => acc + A[i][n] * B[n][j], 0)),
    );

    return new Matrix(next);
  }
}

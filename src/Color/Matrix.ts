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
    
    // Check dimensions for matrix multiplication
    if (A[0].length !== B.length) {
      throw new Error(
        `Matrix dimensions incompatible for multiplication: ${A.length}x${A[0].length} and ${B.length}x${B[0]?.length || 0}`
      );
    }
    
    // Handle empty matrices
    if (A.length === 0 || B.length === 0 || A[0].length === 0 || (B[0] && B[0].length === 0)) {
      return new Matrix([]);
    }
    
    // Matrix multiplication
    const result = A.map((row) =>
      Array.from({ length: B[0].length }, (_, j) => 
        row.reduce((acc, val, n) => acc + val * B[n][j], 0)
      )
    );
    
    return new Matrix(result);
  }
}

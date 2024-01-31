import { Matrix } from './Matrix';

describe('test teikn', function () {
  it('test teikn.Matrix.dot', function (done) {
    const matrix1 = new Matrix([
      [1, 2],
      [3, 4],
    ]);
    const matrix2 = new Matrix([
      [1, 1],
      [1, 1],
    ]);
    const result = matrix1.dot(matrix2);
    expect(result.value[0][0]).toEqual(3);
    expect(result.value[0][1]).toEqual(3);
    expect(result.value[1][0]).toEqual(7);
    expect(result.value[1][1]).toEqual(7);
    done();
  });
});

const { generator } = require('./generator-es');

describe('es6 generator tests', () => {
  const tokens = [{ name: 'test', type: 'color', value: '#CCCCCC' }];

  test('it generates things', () => {
    const output = `export const tokens = {
  /**
   *  Type: color
   */
  test: '#CCCCCC',
};

export default tokens;`;
    expect(generator(tokens)).toBe(output);
  });
});

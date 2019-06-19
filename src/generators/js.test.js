const { generator } = require('./generator-js');

describe('es5 generator tests', () => {
  const tokens = [{ name: 'test', type: 'color', value: '#CCCCCC' }];

  test('it generates things', () => {
    const output = `module.exports = {
  /**
   *  Type: color
   */
  test: '#CCCCCC'
}`;
    expect(generator(tokens)).toBe(output);
  });
});

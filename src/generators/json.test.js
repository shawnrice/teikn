const { generateToken } = require('./generator-json');

describe('JSON generator tests', () => {
  test('It lofts the name key from a token', () => {
    expect(generateToken({ name: 'test', value: true })).toEqual({ test: { value: true } });
  });
});

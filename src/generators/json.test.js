const { generateToken, combinator, generator } = require('./generator-json');
const Generator = require('./JSON');

describe('JSON generator tests', () => {
  test('It lofts the name key from a token', () => {
    expect(generateToken({ name: 'test', value: true })).toEqual({ test: { value: true } });
  });

  test('It combines tokens into a single json value', () => {
    expect(combinator([{ test: true }, { test2: false }])).toEqual(
      '{' + '\n' + '  "test": true,' + '\n' + '  "test2": false' + '\n' + '}',
    );
  });

  test('It generates the token set', () => {
    const tokens = [{ name: 'test', value: true }, { name: 'test2', value: '#CCC' }];
    const value = `{
  "test": {
    "value": true
  },
  "test2": {
    "value": "#CCC"
  }
}`;
    expect(generator(tokens)).toEqual(value);
  });
});

describe('JSONGenerator tests', () => {
  test('It generates the token set', () => {
    const tokens = [{ name: 'test', value: true }, { name: 'test2', value: '#CCC' }];
    const value = `{
  "test": {
    "value": true
  },
  "test2": {
    "value": "#CCC"
  }
}`;
    const generator = new Generator();
    const input = generator.generate(tokens);
    expect(generator.generate(tokens)).toBe(value);
  });
});

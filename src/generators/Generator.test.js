const Generator = require('./Generator');

describe('Generator base class tests', () => {
  test('It throws when the extension is set in options', () => {
    expect(() => {
      new Generator();
    }).toThrow();
  });

  test('It throws when the extension is the wrong type in options', () => {
    expect(() => {
      new Generator({ ext: true });
    }).toThrow();
  });

  test('It throws when you do not extend it for generate', () => {
    expect(() => {
      const g = new Generator({ ext: 'test' });
      g.generate([]);
    }).toThrow();
  });

  test('It create the correct filename', () => {
    expect(new Generator({ ext: 'test' }).file).toBe('tokens.test');
  });
});

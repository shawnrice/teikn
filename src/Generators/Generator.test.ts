import Generator from './Generator';

describe('Generator base class tests', () => {
  test('It throws when the extension is not set in options', () => {
    expect(() => {
      // @ts-ignore: this is an error test
      new Generator();
    }).toThrow();
  });

  test('It throws when the extension is the wrong type in options', () => {
    expect(() => {
      // @ts-ignore: this is an error test
      new Generator({ ext: true });
    }).toThrow();
  });

  test('It throws when you do not extend it for generate', () => {
    expect(() => {
      // @ts-ignore: this is an error test
      new Generator({ ext: 'test' }).generate([]);
    }).toThrow();
  });

  test('It create the correct filename', () => {
    // @ts-ignore: this is an error test
    expect(new Generator({ ext: 'test' }).file).toBe('tokens.test');
  });
});

const { transformValue } = require('./value-transforms');

describe('value transform tests', () => {
  test('it passes through non-color values', () => {
    expect(transformValue('15px', 'size', {})).toBe('15px');
  });

  test('it lowercases colors', () => {
    expect(transformValue('#FFFFFF', 'color', {})).toBe('#ffffff');
  });

  test('it can prefer rgb', () => {
    expect(transformValue('#FFFFFF', 'color', { preferRgb: true })).toBe('rgb(255, 255, 255)');
  });

  test('it can prefer rgba', () => {
    expect(transformValue('#FFFFFF', 'color', { preferRgba: true })).toBe('rgba(255, 255, 255, 1)');
  });

  test('it can prefer hsl', () => {
    expect(transformValue('#FFFFFF', 'color', { preferHsl: true })).toBe('hsl(0, 0%, 100%)');
  });

  test('it can prefer hex', () => {
    expect(transformValue('hsl(0, 0%, 100%)', 'color', { preferHex: true })).toBe('#ffffff');
  });

  test('it respects transparent despite hex preference', () => {
    expect(transformValue('transparent', 'color', { preferHex: true })).toBe('transparent');
  });

  test('it respects transparent', () => {
    expect(transformValue('transparent', 'color', {})).toBe('transparent');
  });
});

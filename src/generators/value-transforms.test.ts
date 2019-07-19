const { transformValue } = require('./value-transforms');

describe('value transform tests', () => {
  test('it passes through non-color values', () => {
    expect(transformValue({ value: '15px', type: 'size' }, {})).toBe('15px');
  });

  test('it lowercases colors', () => {
    expect(transformValue({ value: '#FFFFFF', type: 'color' }, {})).toBe('#ffffff');
  });

  test('it can prefer rgb', () => {
    expect(transformValue({ value: '#FFFFFF', type: 'color' }, { color: 'RGB' })).toBe('rgb(255, 255, 255)');
  });

  test('it can prefer rgba', () => {
    expect(transformValue({ value: '#FFFFFF', type: 'color' }, { color: 'RGBA' })).toBe('rgba(255, 255, 255, 1)');
  });

  test('it can prefer hsl', () => {
    expect(transformValue({ value: '#FFFFFF', type: 'color' }, { color: 'HSL' })).toBe('hsl(0, 0%, 100%)');
  });

  test('it can prefer hex', () => {
    expect(transformValue({ value: 'hsl(0, 0%, 100%)', type: 'color' }, { color: 'HEX6' })).toBe('#ffffff');
  });

  test('it respects transparent despite hex preference', () => {
    expect(transformValue({ value: 'transparent', type: 'color' }, { color: 'HEX6' })).toBe('transparent');
  });

  test('it respects transparent', () => {
    expect(transformValue({ value: 'transparent', type: 'color' }, {})).toBe('transparent');
  });
});

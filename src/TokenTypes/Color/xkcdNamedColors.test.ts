import { describe, expect, test } from 'bun:test';

import { closest } from './xkcdNamedColors';

describe('xkcdColors', () => {
  test('closest finds primary blue for #0000ff', () => {
    expect(closest('#0000ff')).toEqual({
      name: 'primary blue',
      hex: '#0804f9',
      d2: 116,
    });
  });

  test('closest finds exact match with d2=0', () => {
    expect(closest('#0804f9')).toEqual({
      name: 'primary blue',
      hex: '#0804f9',
      d2: 0,
    });
  });

  test('closest handles 3-digit hex', () => {
    const result = closest('#fff');
    expect(result).not.toBeNull();
    expect(result!.name).toBe('white');
  });

  test('closest handles hex without #', () => {
    const result = closest('ff0000');
    expect(result).not.toBeNull();
  });

  test('closest throws for non-hex input', () => {
    expect(() => closest('not a color')).toThrow('Invalid color, must be a hex');
  });
});

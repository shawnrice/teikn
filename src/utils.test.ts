import { pad0 } from './utils';

describe('utils tests', () => {
  test('pad0 does nothing with 2 digits', () => {
    expect(pad0(12)).toBe(12);
  });

  test('pad0 does something with 1 digit', () => {
    expect(pad0(2)).toBe('02');
  });

  test('pad0 works with a 2-digit string', () => {
    expect(pad0('12')).toBe('12');
  });

  test('pad0 works with a 1-digit string', () => {
    expect(pad0('2')).toBe('02');
  });

  test('pad0 throws an error with a non-string/number', () => {
    expect(
      // @ts-expect-error
      () => pad0(Symbol.for('I will throw')),
    ).toThrowError('pad0 can only work with numbers and strings');
  });
});

import { describe, expect, test } from 'bun:test';

import { getDate, matches, pad0 } from './utils';

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

describe('matches', () => {
  test('returns true for matching strings', () => {
    expect(matches('color', 'color')).toBe(true);
  });

  test('returns false for non-matching strings', () => {
    expect(matches('color', 'font')).toBe(false);
  });

  test('returns true for matching RegExp', () => {
    expect(matches(/^col/, 'color')).toBe(true);
  });

  test('returns false for non-matching RegExp', () => {
    expect(matches(/^font/, 'color')).toBe(false);
  });

  test('returns false for non-string/non-RegExp first arg', () => {
    expect(matches(42, 'color')).toBe(false);
  });
});

describe('getDate', () => {
  test('returns a date-like string with date and time', () => {
    const result = getDate();
    // Should contain a day of the week and time with colons
    expect(result).toMatch(/\w{3} \w{3} \d{2} \d{4} \d{1,2}:\d{2}:\d{2}/);
  });
});

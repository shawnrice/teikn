import { describe, expect, test } from 'bun:test';

import { camelCase, camelToKebabCase, deriveShortName, kebabCase } from './string-utils.js';

describe('camelCase', () => {
  test('converts kebab-case', () => {
    expect(camelCase('font-size')).toBe('fontSize');
  });

  test('converts snake_case', () => {
    expect(camelCase('font_size')).toBe('fontSize');
  });

  test('converts space-separated', () => {
    expect(camelCase('font size')).toBe('fontSize');
  });

  test('handles single word', () => {
    expect(camelCase('primary')).toBe('primary');
  });

  test('handles multiple segments', () => {
    expect(camelCase('border-top-left-radius')).toBe('borderTopLeftRadius');
  });

  test('preserves existing camelCase boundaries', () => {
    expect(camelCase('colorPrimary')).toBe('colorPrimary');
  });

  test('preserves multi-word camelCase', () => {
    expect(camelCase('borderTopLeftRadius')).toBe('borderTopLeftRadius');
  });

  test('keeps non-ASCII letters instead of dropping them', () => {
    // Regression: `\W`-based splitting used to drop accented letters,
    // corrupting `café` → `caf` and splitting `naïveCase` at the ï.
    expect(camelCase('café')).toBe('café');
    expect(camelCase('naïveCase')).toBe('naïveCase');
  });

  test('non-ASCII names that differ do not collide after transform', () => {
    // `aïb` and `aB` both collapsed to `a-b` under the old splitter.
    expect(kebabCase('aïb')).not.toBe(kebabCase('aB'));
    expect(kebabCase('café')).toBe('café');
  });
});

describe('camelToKebabCase', () => {
  test('converts camelCase to kebab-case', () => {
    expect(camelToKebabCase('fontSize')).toBe('font-size');
  });

  test('converts PascalCase to kebab-case', () => {
    expect(camelToKebabCase('FontSize')).toBe('font-size');
  });

  test('handles single lowercase word', () => {
    expect(camelToKebabCase('primary')).toBe('primary');
  });

  test('handles multiple uppercase letters', () => {
    expect(camelToKebabCase('borderTopLeftRadius')).toBe('border-top-left-radius');
  });

  test('does not produce $1 literals for uppercase letters', () => {
    const result = camelToKebabCase('fontSize');
    expect(result).not.toContain('$');
    expect(result).toBe('font-size');
  });
});

describe('kebabCase', () => {
  test('converts kebab-case (roundtrip)', () => {
    expect(kebabCase('font-size')).toBe('font-size');
  });

  test('converts snake_case', () => {
    expect(kebabCase('font_size')).toBe('font-size');
  });

  test('handles multi-word hyphenated', () => {
    expect(kebabCase('heading-size')).toBe('heading-size');
  });

  test('handles single word', () => {
    expect(kebabCase('primary')).toBe('primary');
  });

  test('handles multi-word hyphenated complex', () => {
    expect(kebabCase('border-top-left-radius')).toBe('border-top-left-radius');
  });

  test('converts camelCase to kebab-case', () => {
    expect(kebabCase('colorPrimary')).toBe('color-primary');
  });

  test('converts multi-word camelCase to kebab-case', () => {
    expect(kebabCase('borderTopLeftRadius')).toBe('border-top-left-radius');
  });

  // Established output that must not move.
  for (const [input, expected] of [
    ['t2', 't-2'],
    ['color-t2', 'color-t-2'],
    ['size-2xl', 'size-2xl'],
    ['gray-50', 'gray-50'],
    ['a1-b2', 'a-1-b-2'],
    ['spacing2', 'spacing-2'],
    ['Font Size', 'font-size'],
    ['XMLHttpRequest', 'xmlhttp-request'],
    ['café-au-lait', 'café-au-lait'],
    ['--leading', 'leading'],
    ['', ''],
  ] as const) {
    test(`keeps ${JSON.stringify(input)} → ${JSON.stringify(expected)}`, () => {
      expect(kebabCase(input)).toBe(expected);
    });
  }

  // A separator between two digits is the only thing keeping them apart.
  for (const [input, expected] of [
    ['t2-500', 't-2-500'],
    ['color-t2-900', 'color-t-2-900'],
    ['spacing-1-5', 'spacing-1-5'],
    ['spacing-1.5', 'spacing-1-5'],
    ['1_5', '1-5'],
    ['v1.2.3', 'v-1-2-3'],
    ['t2--500', 't-2-500'],
    ['a 1 2 b', 'a-1-2-b'],
  ] as const) {
    test(`keeps the digit boundary in ${JSON.stringify(input)}`, () => {
      expect(kebabCase(input)).toBe(expected);
    });
  }

  test('distinct numeric steps stay distinct', () => {
    expect(kebabCase('t2-500')).not.toBe(kebabCase('t-2500'));
    expect(kebabCase('1-5')).not.toBe(kebabCase('15'));
  });

  test('is idempotent', () => {
    for (const input of ['t2-500', 'spacing-1.5', 'colorPrimary', 'a1-b2', 'XMLHttpRequest']) {
      expect(kebabCase(kebabCase(input))).toBe(kebabCase(input));
    }
  });

  test('differs from camelCase → camelToKebabCase only at a digit|digit seam', () => {
    const alphabet = ['a', 'B', '2', '7', '-', '_', ' ', '.', 'é'];
    const grow = (words: string[]): string[] => words.flatMap(w => alphabet.map(ch => w + ch));
    const corpus = [1, 2, 3, 4, 5].reduce<string[][]>(
      (acc, _) => [...acc, grow(acc.at(-1)!)],
      [['']],
    );
    const seam = /\d[^a-zA-Z0-9é]+\d/;
    const unchanged = corpus.flat().filter(word => !seam.test(word));

    expect(unchanged.length).toBeGreaterThan(40000);

    for (const word of unchanged) {
      expect(kebabCase(word)).toBe(camelToKebabCase(camelCase(word)));
    }
  });
});

describe('deriveShortName', () => {
  test('strips single-word type prefix', () => {
    expect(deriveShortName('colorPrimary', 'color')).toBe('primary');
  });

  test('strips multi-word type prefix', () => {
    expect(deriveShortName('fontFamilyBody', 'font-family')).toBe('body');
  });

  test('strips multi-word type prefix (border-radius)', () => {
    expect(deriveShortName('borderRadiusSharp', 'border-radius')).toBe('sharp');
  });

  test('returns original name when no prefix match', () => {
    expect(deriveShortName('primary', 'color')).toBe('primary');
  });

  test('returns original name when name equals prefix exactly', () => {
    expect(deriveShortName('color', 'color')).toBe('color');
  });

  test('handles multi-segment short name', () => {
    expect(deriveShortName('colorDarkMuted', 'color')).toBe('darkMuted');
  });

  test('strips hyphen-separated prefix', () => {
    expect(deriveShortName('color-primary', 'color')).toBe('primary');
  });

  test('strips hyphen-separated multi-word prefix', () => {
    expect(deriveShortName('font-family-body', 'font-family')).toBe('body');
  });

  test('does not false-positive on name extending type without uppercase boundary', () => {
    expect(deriveShortName('colors', 'color')).toBe('colors');
  });
});

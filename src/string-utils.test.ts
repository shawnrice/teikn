import { describe, expect, test } from 'bun:test';

import { camelCase, camelToKebabCase, deriveShortName, kebabCase } from './string-utils';

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
});

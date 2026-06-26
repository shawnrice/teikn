import { describe, expect, test } from 'bun:test';

import { Dimension } from './Dimension.js';
import { Typography } from './Typography.js';

describe('Typography', () => {
  describe('construction', () => {
    test('from a full object', () => {
      const t = new Typography({
        fontFamily: ['Inter', 'system-ui', 'sans-serif'],
        fontSize: new Dimension('1rem'),
        fontWeight: 400,
        lineHeight: 1.5,
        letterSpacing: '-0.01em',
      });
      expect(t.fontFamily).toBe('Inter, system-ui, sans-serif');
      expect(t.fontSize.toString()).toBe('1rem');
      expect(t.fontWeight).toBe(400);
      expect(t.lineHeight).toBe(1.5);
      expect((t.letterSpacing as Dimension).toString()).toBe('-0.01em');
    });

    test('single font family string is kept as-is', () => {
      const t = new Typography({ fontFamily: 'Georgia, serif', fontSize: '16px' });
      expect(t.fontFamily).toBe('Georgia, serif');
    });

    test('fontSize string coerces to Dimension', () => {
      const t = new Typography({ fontFamily: 'Inter', fontSize: '2.5rem' });
      expect(t.fontSize).toBeInstanceOf(Dimension);
      expect(t.fontSize.toString()).toBe('2.5rem');
    });

    test('optional fields default to null', () => {
      const t = new Typography({ fontFamily: 'Inter', fontSize: '1rem' });
      expect(t.fontWeight).toBeNull();
      expect(t.lineHeight).toBeNull();
      expect(t.letterSpacing).toBeNull();
    });

    test('letterSpacing "normal" is preserved as a keyword', () => {
      const t = new Typography({ fontFamily: 'Inter', fontSize: '1rem', letterSpacing: 'normal' });
      expect(t.letterSpacing).toBe('normal');
    });

    test('numeric strings for weight/lineHeight coerce to numbers', () => {
      const t = new Typography({
        fontFamily: 'Inter',
        fontSize: '1rem',
        fontWeight: '700',
        lineHeight: '1.2',
      });
      expect(t.fontWeight).toBe(700);
      expect(t.lineHeight).toBe(1.2);
    });

    test('copy constructor', () => {
      const original = new Typography({ fontFamily: 'Inter', fontSize: '1rem', fontWeight: 400 });
      const copy = new Typography(original);
      expect(copy.fontFamily).toBe('Inter');
      expect(copy.fontWeight).toBe(400);
    });
  });

  describe('validation', () => {
    test('bare-number fontSize is rejected (no unit)', () => {
      expect(() => new Typography({ fontFamily: 'Inter', fontSize: 16 as never })).toThrow(
        /must carry a unit/,
      );
    });

    test('non-finite fontWeight is rejected', () => {
      expect(
        () => new Typography({ fontFamily: 'Inter', fontSize: '1rem', fontWeight: 'heavy' }),
      ).toThrow(/finite number/);
    });

    test('string construction is rejected with guidance', () => {
      expect(() => new Typography('1rem Inter' as never)).toThrow(/no unambiguous single-string/);
    });

    test('a whole-value reference string is rejected', () => {
      expect(() => new Typography('{type.body}' as never)).toThrow(/reference/);
    });
  });

  describe('per-field references', () => {
    test('a `{ref}` string is accepted and stored verbatim in any field', () => {
      const t = new Typography({
        fontFamily: '{font.body}',
        fontSize: '{fontSize.md}',
        fontWeight: '{fontWeight.regular}',
      });
      expect(t.fontFamily).toBe('{font.body}');
      expect(t.fontSize).toBe('{fontSize.md}');
      expect(t.fontWeight).toBe('{fontWeight.regular}');
    });

    test('__teikn_fromFields__ rebuilds with resolved field values', () => {
      const withRef = new Typography({ fontFamily: 'Inter', fontSize: '{fontSize.md}' });
      const resolved = withRef.__teikn_fromFields__({
        ...withRef.__teikn_fields__(),
        fontSize: new Dimension('1.25rem'),
      });
      expect((resolved as Typography).fontSize.toString()).toBe('1.25rem');
    });
  });

  describe('serialization', () => {
    test('toString emits the CSS font shorthand', () => {
      const t = new Typography({
        fontFamily: 'Inter, sans-serif',
        fontSize: new Dimension('1rem'),
        fontWeight: 400,
        lineHeight: 1.5,
      });
      expect(t.toString()).toBe('400 1rem/1.5 Inter, sans-serif');
    });

    test('toString omits weight and line-height when absent', () => {
      const t = new Typography({ fontFamily: 'Inter', fontSize: '1rem' });
      expect(t.toString()).toBe('1rem Inter');
    });

    test('toString excludes letterSpacing (not part of font shorthand)', () => {
      const t = new Typography({
        fontFamily: 'Inter',
        fontSize: '1rem',
        fontWeight: 400,
        letterSpacing: '-0.02em',
      });
      expect(t.toString()).toBe('400 1rem Inter');
    });

    test('toJSON mirrors toString', () => {
      const t = new Typography({ fontFamily: 'Inter', fontSize: '1rem', fontWeight: 600 });
      expect(t.toJSON()).toBe(t.toString());
    });
  });

  describe('with', () => {
    test('returns a new instance with overrides applied', () => {
      const base = new Typography({ fontFamily: 'Inter', fontSize: '1rem', fontWeight: 400 });
      const bold = base.with({ fontWeight: 700 });
      expect(bold.fontWeight).toBe(700);
      expect(base.fontWeight).toBe(400);
      expect(bold.fontFamily).toBe('Inter');
    });
  });
});

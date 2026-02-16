import { describe, expect, test } from 'bun:test';

import { composite, dim, dp, dur, group, onColor, onColors, ref, scale, themed, tokens } from './builders';
import { Color } from './TokenTypes/Color';
import { Dimension } from './TokenTypes/Dimension';
import { Duration } from './TokenTypes/Duration';

describe('builders', () => {
  describe('group', () => {
    test('creates tokens from plain values', () => {
      const result = group('color', {
        primary: '#0066cc',
        secondary: '#cc6600',
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        name: 'primary',
        value: '#0066cc',
        type: 'color',
        group: 'color',
      });
      expect(result[1]).toEqual({
        name: 'secondary',
        value: '#cc6600',
        type: 'color',
        group: 'color',
      });
    });

    test('creates tokens from [value, usage] tuples', () => {
      const result = group('color', {
        primary: ['#0066cc', 'Main brand color'],
      });

      expect(result[0]).toEqual({
        name: 'primary',
        value: '#0066cc',
        usage: 'Main brand color',
        type: 'color',
        group: 'color',
      });
    });

    test('creates tokens from object inputs', () => {
      const result = group('color', {
        bg: { value: '#fff', usage: 'Background', modes: { dark: '#1a1a1a' } },
      });

      expect(result[0]).toEqual({
        name: 'bg',
        value: '#fff',
        usage: 'Background',
        modes: { dark: '#1a1a1a' },
        type: 'color',
        group: 'color',
      });
    });

    test('handles Color instances', () => {
      const c = new Color(255, 0, 0);
      const result = group('color', { red: c });

      expect(result[0]!.value).toBe(c);
    });

    test('handles numeric values', () => {
      const result = group('zLayer', { modal: 5000 });
      expect(result[0]!.value).toBe(5000);
    });
  });

  describe('scale', () => {
    test('creates tokens from an object', () => {
      const result = scale('spacing', { xs: '0.25rem', sm: '0.5rem' });
      expect(result).toHaveLength(2);
      expect(result[0]!.name).toBe('xs');
      expect(result[0]!.value).toBe('0.25rem');
      expect(result[0]!.type).toBe('spacing');
    });

    test('creates tokens from a numeric array', () => {
      const result = scale('fontSize', [10, 12, 14], {
        names: ['100', '200', '300'],
        transform: n => `${n * 0.0625}rem`,
      });

      expect(result).toHaveLength(3);
      expect(result[0]!.name).toBe('100');
      expect(result[0]!.value).toBe('0.625rem');
      expect(result[2]!.name).toBe('300');
      expect(result[2]!.value).toBe('0.875rem');
    });

    test('uses index as name when names not provided', () => {
      const result = scale('size', [10, 20]);
      expect(result[0]!.name).toBe('0');
      expect(result[1]!.name).toBe('1');
    });

    test('uses identity transform when not provided', () => {
      const result = scale('zLayer', [1000, 2000]);
      expect(result[0]!.value).toBe(1000);
    });
  });

  describe('composite', () => {
    test('creates composite tokens', () => {
      const result = composite('typography', {
        heading: {
          fontFamily: 'Rubik',
          fontSize: '2rem',
          fontWeight: 700,
          lineHeight: 1.2,
        },
      });

      expect(result).toHaveLength(1);
      expect(result[0]!.name).toBe('heading');
      expect(result[0]!.type).toBe('typography');
      expect(result[0]!.value).toEqual({
        fontFamily: 'Rubik',
        fontSize: '2rem',
        fontWeight: 700,
        lineHeight: 1.2,
      });
    });

    test('creates composite with usage', () => {
      const result = composite('border', {
        card: [{ width: '1px', style: 'solid', color: '#e0e0e0' }, 'Card border'],
      });

      expect(result[0]!.usage).toBe('Card border');
    });

    test('creates composite with object-style input (value, usage, modes)', () => {
      const result = composite('typography', {
        heading: {
          value: { fontFamily: 'Arial', fontSize: '2rem' },
          usage: 'Page heading',
          modes: { dark: { fontFamily: 'Helvetica' } },
        },
      });

      expect(result[0]!.value).toEqual({ fontFamily: 'Arial', fontSize: '2rem' });
      expect(result[0]!.usage).toBe('Page heading');
      expect(result[0]!.modes).toEqual({ dark: { fontFamily: 'Helvetica' } });
    });

    test('creates composite with object-style input without modes', () => {
      const result = composite('border', {
        card: {
          value: { width: '1px', style: 'solid' },
          usage: 'Card border',
        },
      });

      expect(result[0]!.value).toEqual({ width: '1px', style: 'solid' });
      expect(result[0]!.usage).toBe('Card border');
      expect(result[0]!.modes).toBeUndefined();
    });
  });

  describe('onColor', () => {
    test('returns light color for dark backgrounds', () => {
      const result = onColor(new Color(0, 0, 0));
      expect(result.red).toBe(255);
      expect(result.green).toBe(255);
      expect(result.blue).toBe(255);
    });

    test('returns dark color for light backgrounds', () => {
      const result = onColor(new Color(255, 255, 255));
      expect(result.red).toBe(40);
      expect(result.green).toBe(50);
      expect(result.blue).toBe(56);
    });

    test('accepts string input', () => {
      const result = onColor('#ffffff');
      expect(result.luminance()).toBeLessThan(0.5);
    });

    test('accepts custom dark/light colors', () => {
      const result = onColor('#000000', { dark: '#111', light: '#eee' });
      const hex = result.toString('hex');
      expect(hex).toBe('#eeeeee');
    });
  });

  describe('onColors', () => {
    test('generates on-color tokens', () => {
      const result = onColors('color', {
        primary: new Color(0, 0, 128),
        warning: new Color(255, 255, 0),
      });

      expect(result).toHaveLength(2);
      expect(result[0]!.name).toBe('onPrimary');
      expect(result[0]!.type).toBe('color');
      expect(result[1]!.name).toBe('onWarning');
    });
  });

  describe('dp', () => {
    test('converts px to rem Dimension', () => {
      const d = dp(16);
      expect(d).toBeInstanceOf(Dimension);
      expect(d.value).toBe(1);
      expect(d.unit).toBe('rem');
      expect(d.toString()).toBe('1rem');
    });

    test('converts various px values', () => {
      expect(dp(8).toString()).toBe('0.5rem');
      expect(dp(4).toString()).toBe('0.25rem');
      expect(dp(-16).toString()).toBe('-1rem');
    });
  });

  describe('dim', () => {
    test('creates a Dimension', () => {
      const d = dim(16, 'px');
      expect(d).toBeInstanceOf(Dimension);
      expect(d.value).toBe(16);
      expect(d.unit).toBe('px');
    });
  });

  describe('dur', () => {
    test('creates a Duration', () => {
      const d = dur(200, 'ms');
      expect(d).toBeInstanceOf(Duration);
      expect(d.value).toBe(200);
      expect(d.unit).toBe('ms');
    });
  });

  describe('tokens', () => {
    test('merges multiple groups', () => {
      const colors = group('color', { primary: '#000' });
      const spacing = group('spacing', { sm: '0.5rem' });
      const result = tokens(colors, spacing);

      expect(result).toHaveLength(2);
      expect(result[0]!.type).toBe('color');
      expect(result[1]!.type).toBe('spacing');
    });
  });

  describe('themed', () => {
    test('creates a themed token input', () => {
      const result = themed('#ffffff', { dark: '#1a1a1a' });
      expect(result.value).toBe('#ffffff');
      expect(result.modes).toEqual({ dark: '#1a1a1a' });
    });
  });

  describe('ref', () => {
    test('creates a reference token input', () => {
      const result = ref('primary');
      expect(result.value).toBe('{primary}');
    });

    test('creates a reference with usage', () => {
      const result = ref('primary', 'Link color');
      expect(result.value).toBe('{primary}');
      expect(result.usage).toBe('Link color');
    });
  });
});

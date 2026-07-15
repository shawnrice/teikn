import { describe, expect, test } from 'bun:test';

import { Color } from './index.js';

describe('named colors (regression)', () => {
  test('indigo and indianred parse (keys previously had a trailing space)', () => {
    expect(new Color('indigo').asHex()).toBe('#4b0082');
    expect(new Color('indianred').asHex()).toBe('#cd5c5c');
  });

  test('reverse lookup returns a re-parseable name', () => {
    const name = new Color('#4b0082').toString('named');
    expect(name).toBe('indigo');
    expect(() => new Color(name)).not.toThrow();
  });
});

describe('hue setters wrap instead of clamping', () => {
  test('Color.setHue wraps out-of-range degrees', () => {
    expect(new Color('red').setHue(-30).hue).toBeCloseTo(330, 5);
    expect(new Color('red').setHue(400).hue).toBeCloseTo(40, 5);
  });

  test('hsl.hue wraps', () => {
    expect((new Color('red').hsl.hue(370) as Color).hue).toBeCloseTo(10, 5);
  });

  test('lch.hue stays re-parseable for out-of-range input', () => {
    const s = (new Color('red').lch.hue(400) as Color).toString('lch');
    expect(() => new Color(s)).not.toThrow();
  });
});

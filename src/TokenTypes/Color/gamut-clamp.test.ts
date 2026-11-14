import { describe, expect, test } from 'bun:test';

import { convert } from './ColorSpace.js';
import { Color } from './index.js';

// Regression: out-of-sRGB lab()/lch()/xyz() colors (all legitimate CSS) used to
// leave XYZ→RGB unclamped, producing negative/over-range channels and an
// invalid, un-parseable hex string.
describe('sRGB gamut clamping', () => {
  const isValidHex = (hex: string) => /^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(hex);

  test('an out-of-gamut LAB color yields in-range channels and a valid hex', () => {
    const c = Color.fromLAB(50, 100, -100);
    const [r, g, b] = c.asRGB();

    for (const ch of [r, g, b]) {
      expect(ch).toBeGreaterThanOrEqual(0);
      expect(ch).toBeLessThanOrEqual(255);
    }

    expect(isValidHex(c.asHex())).toBe(true);
    // The clamped hex round-trips through the parser without throwing.
    expect(() => new Color(c.asHex())).not.toThrow();
  });

  test('out-of-gamut LCH and XYZ likewise produce valid hex', () => {
    expect(isValidHex(Color.fromLCH(50, 130, 20).asHex())).toBe(true);
    expect(isValidHex(Color.fromXYZ(0.9, 0, 0).asHex())).toBe(true);
  });

  test('out-of-gamut lab/lch/xyz colors are gamut-mapped, preserving OKLCH hue', () => {
    // CSS Color 4 reduces chroma in OKLCH, holding lightness and hue. A naive
    // per-channel clip (the old behavior) would shift hue by many degrees.
    const hueDiff = (a: number, b: number) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));

    for (const lch of [
      [50, 130, 20],
      [70, 100, 250],
      [80, 90, 140],
    ] as [number, number, number][]) {
      const inHue = (convert('lch', 'oklch', lch) as number[])[2]!;
      const outHue = (convert('rgb', 'oklch', Color.fromLCH(...lch).asRGB()) as number[])[2]!;

      expect(hueDiff(inHue, outHue)).toBeLessThan(1);
    }
  });

  test('out-of-range HSL saturation clamps instead of emitting invalid bytes', () => {
    const [r, g, b] = Color.fromHSL(0, 2, 0.5).asRGB();

    for (const ch of [r, g, b]) {
      expect(ch).toBeGreaterThanOrEqual(0);
      expect(ch).toBeLessThanOrEqual(255);
    }
  });

  test('in-gamut colors are unchanged by the clamp', () => {
    // LAB for pure sRGB red round-trips to #ff0000.
    expect(Color.fromLAB(53.24, 80.09, 67.2).asHex()).toBe('#ff0000');
  });

  test('non-finite numeric components are rejected', () => {
    expect(() => new Color(NaN, 0, 0)).toThrow(/finite/);
    expect(() => new Color(0, Infinity, 0)).toThrow(/finite/);
    expect(() => new Color(0, 0, 0, NaN)).toThrow(/finite/);
  });
});

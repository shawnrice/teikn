import { describe, expect, test } from 'bun:test';

import { Color } from './Color.js';
import { OklabToOklch, OklabToRGB, OklchToOklab, RGBToOklab } from './conversions.js';

// Reference values were checked against culori (@culori/core) — the de-facto
// reference JS implementation of Oklab/Oklch — to 4 decimal places.

describe('Oklab / Oklch conversions', () => {
  test('sRGB red matches the reference Oklab value', () => {
    const [L, a, b] = new Color('#ff0000').asOklab();
    expect(L).toBeCloseTo(0.627955, 5);
    expect(a).toBeCloseTo(0.224863, 5);
    expect(b).toBeCloseTo(0.125846, 5);
  });

  test('sRGB red matches the reference Oklch value', () => {
    const [L, C, h] = new Color('#ff0000').asOklch();
    expect(L).toBeCloseTo(0.627955, 5);
    expect(C).toBeCloseTo(0.257683, 5);
    expect(h).toBeCloseTo(29.234, 3);
  });

  test('sRGB green matches the reference Oklab value', () => {
    const [L, a, b] = new Color('#00ff00').asOklab();
    expect(L).toBeCloseTo(0.8664, 4);
    expect(a).toBeCloseTo(-0.2339, 4);
    expect(b).toBeCloseTo(0.1795, 4);
  });

  test('sRGB blue matches the reference Oklch value', () => {
    const [L, C, h] = new Color('#0000ff').asOklch();
    expect(L).toBeCloseTo(0.452, 3);
    expect(C).toBeCloseTo(0.3132, 4);
    expect(h).toBeCloseTo(264.052, 3);
  });

  test('white is L=1 with no chroma', () => {
    const [L, a, b] = new Color('#ffffff').asOklab();
    expect(L).toBeCloseTo(1, 4);
    expect(a).toBeCloseTo(0, 4);
    expect(b).toBeCloseTo(0, 4);
  });

  test('black is L=0 with no chroma', () => {
    expect(new Color('#000000').asOklab()).toEqual([0, 0, 0]);
  });

  test('achromatic colors report hue 0 in Oklch', () => {
    expect(new Color('#808080').asOklch()[2]).toBe(0);
  });
});

describe('Oklab / Oklch round-trips', () => {
  const hexes = [
    '#ff0000',
    '#00ff00',
    '#0000ff',
    '#1a2b3c',
    '#7f7f7f',
    '#123456',
    '#abcdef',
    '#010203',
  ];

  test.each(hexes)('hex -> oklab -> hex is exact for %s', hex => {
    expect(Color.fromOklab(new Color(hex).asOklab()).hex).toBe(hex);
  });

  test.each(hexes)('hex -> oklch -> hex is exact for %s', hex => {
    expect(Color.fromOklch(new Color(hex).asOklch()).hex).toBe(hex);
  });

  test('oklab <-> oklch is symmetric', () => {
    const oklab: [number, number, number] = [0.5325, -0.0225, -0.1663];
    const back = OklchToOklab(OklabToOklch(oklab));
    expect(back[0]).toBeCloseTo(oklab[0], 10);
    expect(back[1]).toBeCloseTo(oklab[1], 10);
    expect(back[2]).toBeCloseTo(oklab[2], 10);
  });

  test('RGBToOklab and OklabToRGB are inverse for in-gamut colors', () => {
    expect(OklabToRGB(RGBToOklab([55, 192, 122]))).toEqual([55, 192, 122]);
  });
});

describe('Oklab / Oklch string parsing & serialization', () => {
  test('parses oklab() with space separators', () => {
    const c = new Color('oklab(0.62795 0.22486 0.12585)');
    expect(c.asOklab()[0]).toBeCloseTo(0.62795, 5);
    expect(c.asOklab()[1]).toBeCloseTo(0.22486, 5);
    expect(c.asOklab()[2]).toBeCloseTo(0.12585, 5);
  });

  test('parses oklch() with a percentage lightness', () => {
    const c = new Color('oklch(62.8% 0.2577 29.23)');
    expect(c.asOklch()[0]).toBeCloseTo(0.628, 3);
    expect(c.asOklch()[1]).toBeCloseTo(0.2577, 4);
    expect(c.asOklch()[2]).toBeCloseTo(29.23, 2);
  });

  test('parses an alpha component after a slash', () => {
    const c = new Color('oklab(0.5 -0.1 0.1 / 0.5)');
    expect(c.alpha).toBe(0.5);
  });

  test('serializes oklab() with CSS space syntax (no commas)', () => {
    expect(new Color('#ff0000').toString('oklab')).toMatch(/^oklab\(0\.\d+ 0\.\d+ 0\.\d+\)$/);
  });

  test('serializes oklch() with alpha', () => {
    expect(new Color('oklch(0.5 0.1 120 / 0.5)').toString('oklcha')).toBe(
      'oklch(0.5 0.1 120 / 0.5)',
    );
  });

  test('string round-trips through parse and serialize', () => {
    const original = 'oklch(0.6279 0.2577 29.23)';
    expect(new Color(original).toString('oklch')).toBe(original);
  });
});

describe('Gamut mapping (CSS Color 4 chroma reduction)', () => {
  const outOfGamut = ['oklch(0.7 0.4 30)', 'oklch(0.5 0.4 150)', 'oklch(0.85 0.4 250)'];

  test.each(outOfGamut)('%s maps to a displayable sRGB color', spec => {
    const [r, g, b] = new Color(spec).asRGB();

    for (const channel of [r, g, b]) {
      expect(Number.isInteger(channel)).toBe(true);
      expect(channel).toBeGreaterThanOrEqual(0);
      expect(channel).toBeLessThanOrEqual(255);
    }
  });

  test('chroma reduction preserves lightness for out-of-gamut colors', () => {
    // oklch(0.7 0.4 30) is far outside sRGB. Naive per-channel clipping distorts
    // lightness; CSS chroma reduction holds L (and h) and only trims chroma, so
    // the displayable result should keep its intended lightness closely.
    const mapped = new Color('oklch(0.7 0.4 30)').asRGB();
    const mappedColor = new Color(mapped[0], mapped[1], mapped[2]);
    expect(mappedColor.asOklch()[0]).toBeCloseTo(0.7, 1);
  });

  test('a color on the sRGB gamut boundary round-trips exactly', () => {
    // This Oklch value is exactly sRGB red — it must not be altered.
    expect(new Color('oklch(0.62796 0.25768 29.234)').hex).toBe('#ff0000');
  });

  test('in-gamut Oklch colors are unaffected by gamut mapping', () => {
    const spec = 'oklch(0.6 0.1 200)';
    const c = new Color(spec);
    // Round-trip through sRGB and back; lightness/hue should be preserved.
    const back = new Color(c.hex).asOklch();
    expect(back[0]).toBeCloseTo(0.6, 2);
    expect(back[2]).toBeCloseTo(200, 0);
  });
});

describe('Oklab operations namespace', () => {
  test('lightness / a / b are readable and settable', () => {
    const c = new Color('#3366cc');
    expect(c.oklab.lightness()).toBeCloseTo(c.asOklab()[0], 10);
    expect(c.oklab.a(0.1).asOklab()[1]).toBeCloseTo(0.1, 10);
    expect(c.oklab.b(-0.1).asOklab()[2]).toBeCloseTo(-0.1, 10);
  });

  test('mix interpolates L, a, b linearly', () => {
    const red = new Color('#ff0000');
    const blue = new Color('#0000ff');
    const mid = red.oklab.mix(blue, 0.5).asOklab();
    const expected = red.asOklab().map((v, i) => (v + blue.asOklab()[i]!) / 2);
    expect(mid[0]).toBeCloseTo(expected[0]!, 10);
    expect(mid[1]).toBeCloseTo(expected[1]!, 10);
    expect(mid[2]).toBeCloseTo(expected[2]!, 10);
  });

  test('lighten increases lightness', () => {
    const c = new Color('oklch(0.5 0.1 30)');
    expect(c.oklab.lighten(0.2).asOklab()[0]).toBeGreaterThan(c.asOklab()[0]);
  });
});

describe('Oklch operations namespace', () => {
  test('rotateHue holds lightness and chroma', () => {
    const c = new Color('oklch(0.6 0.15 30)');
    const rotated = c.oklch.rotateHue(120);
    expect(rotated.asOklch()[0]).toBeCloseTo(0.6, 10);
    expect(rotated.asOklch()[1]).toBeCloseTo(0.15, 10);
    expect(rotated.asOklch()[2]).toBeCloseTo(150, 10);
  });

  test('rotateHue wraps around 360', () => {
    expect(new Color('oklch(0.6 0.15 300)').oklch.rotateHue(120).asOklch()[2]).toBeCloseTo(60, 10);
  });

  test('lighten / darken adjust L', () => {
    const c = new Color('oklch(0.5 0.1 30)');
    expect(c.oklch.lighten(0.2).asOklch()[0]).toBeCloseTo(0.6, 10);
    expect(c.oklch.darken(0.2).asOklch()[0]).toBeCloseTo(0.4, 10);
  });

  test('chroma is readable and settable', () => {
    const c = new Color('oklch(0.6 0.15 30)');
    expect(c.oklch.chroma()).toBeCloseTo(0.15, 10);
    expect(c.oklch.chroma(0.05).asOklch()[1]).toBeCloseTo(0.05, 10);
  });

  test('even-lightness palette: rotating hue keeps L constant', () => {
    const base = new Color('oklch(0.7 0.12 20)');
    const palette = [0, 72, 144, 216, 288].map(deg => base.oklch.rotateHue(deg));

    for (const swatch of palette) {
      expect(swatch.asOklch()[0]).toBeCloseTo(0.7, 10);
    }
  });
});

describe('Oklab / Oklch factories & immutability', () => {
  test('fromOklab accepts components and a tuple', () => {
    const fromArgs = Color.fromOklab(0.6279, 0.2249, 0.1258);
    const fromTuple = Color.fromOklab([0.6279, 0.2249, 0.1258]);
    expect(fromArgs.hex).toBe(fromTuple.hex);
  });

  test('fromOklch carries alpha', () => {
    expect(Color.fromOklch(0.6, 0.1, 120, 0.5).alpha).toBe(0.5);
  });

  test('asOklabA / asOklchA append alpha', () => {
    const c = Color.fromOklab([0.5, 0.1, -0.1], 0.25);
    expect(c.asOklabA()[3]).toBe(0.25);
    expect(c.asOklchA()[3]).toBe(0.25);
  });

  test('operations return new immutable Color instances', () => {
    const original = new Color('oklch(0.5 0.1 30)');
    const lightened = original.oklch.lighten(0.2);
    expect(original.toString('oklch')).toBe('oklch(0.5 0.1 30)');
    expect(lightened).not.toBe(original);
  });
});

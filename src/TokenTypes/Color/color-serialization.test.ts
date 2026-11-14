import { describe, expect, test } from 'bun:test';

import { Color } from './Color.js';

const red = new Color('red');
const clearBlue = new Color('rgba(0, 0, 255, 0)');

describe('Color serialization re-parses', () => {
  test.each([
    ['lab lighten past white', () => new Color('#ccc').lab.lighten(0.5), 'lab(100, 0, 0)'],
    ['lab darken past black', () => new Color('#ccc').lab.darken(1.5), 'lab(0, 0, 0)'],
    ['oklab lighten past white', () => new Color('#ccc').oklab.lighten(0.5), 'oklab(1 0 0)'],
    ['oklch darken past black', () => new Color('#ccc').oklch.darken(1.5), 'oklch(0 0 0)'],
    [
      'lch lightness above range',
      () => Color.fromLCH(50, 30, 40).lch.lightness(140),
      'lch(100, 30, 40)',
    ],
    ['out-of-gamut lab a', () => Color.fromLAB(50, 150, 0), 'lab(50, 150, 0)'],
    ['large lch chroma', () => Color.fromLCH(50, 30, 40).lch.chroma(160), 'lch(50, 160, 40)'],
    ['negative lch chroma', () => Color.fromLCH(50, -5, 40), 'lch(50, 0, 40)'],
    ['lch hue wraps', () => Color.fromLCH(50, 30, 400), 'lch(50, 30, 40)'],
    ['negative xyz', () => Color.fromXYZ(0.2, 0.3, 0.4).xyz.x(-0.1), 'xyz(-0.1, 0.3, 0.4)'],
    ['tiny hue', () => red.setHue(1e-10), 'hsl(0, 100%, 50%)'],
    ['tiny negative hue', () => red.setHue(-1e-10), 'hsl(0, 100%, 50%)'],
  ] as const)('%s', (_label, make, expected) => {
    const str = make().toString();

    expect(str).toBe(expected);
    expect(str).not.toMatch(/e[+-]?\d/i);
    expect(new Color(str).toString()).toBe(new Color(expected).toString());
  });
});

describe('RGB entry points clamp and round', () => {
  test.each([
    ['numeric constructor', () => new Color(127.5, 0, 0), '#800000'],
    ['numeric constructor out of range', () => new Color(300, -5, 0), '#ff0000'],
    ['setRed', () => new Color('#000').setRed(10.4), '#0a0000'],
    ['setGreen', () => new Color('#000').setGreen(300), '#00ff00'],
    ['setBlue', () => new Color('#000').setBlue(-3), '#000000'],
    ['fromRGB tuple', () => Color.fromRGB([300, -5, 0]), '#ff0000'],
    ['fromRGB args', () => Color.fromRGB(12.6, 0, 0), '#0d0000'],
    ['rgb.red', () => new Color('#000').rgb.red(300), '#ff0000'],
    ['rgb.green', () => new Color('#000').rgb.green(10.4), '#000a00'],
    ['rgb.blue', () => new Color('#000').rgb.blue(-1), '#000000'],
  ] as const)('%s', (_label, make, hex) => {
    const c = make();

    expect(c.hex).toBe(hex);
    expect(new Color(c.toString()).hex).toBe(hex);
  });

  test('rgb() strings round fractional channels', () => {
    expect(new Color('rgb(127.5, 0, 0)').red).toBe(128);
  });
});

describe("toString('named')", () => {
  test.each([
    ['#f00', 'red'],
    ['transparent', 'transparent'],
    ['rgba(255, 0, 0, 0.5)', 'rgba(255, 0, 0, 0.5)'],
    ['rgba(1, 2, 3, 0.5)', 'rgba(1, 2, 3, 0.5)'],
    ['rgba(0, 0, 0, 0.00001)', 'rgba(0, 0, 0, 0)'],
    ['rgba(255, 0, 0, 0)', 'rgba(255, 0, 0, 0)'],
    ['rgb(1, 2, 3)', 'rgb(1, 2, 3)'],
  ])('%p → %p', (input, expected) => {
    expect(new Color(input).toString('named')).toBe(expected);
  });
});

describe('HSL string output', () => {
  test('keeps fractional percentages', () => {
    expect(new Color('hsl(210, 33.3%, 50%)').toString()).toBe('hsl(210, 33.3%, 50%)');
    expect(new Color('#000d07').toString('hsl')).toBe('hsl(152.31, 100%, 2.55%)');
  });

  test('round-trips 8-bit sRGB colors through the hsl string', () => {
    // Deterministic LCG sample, plus the gray axis and channel extremes.
    const sample = Array.from(
      { length: 5000 },
      (_, i) => (Math.imul(i, 2654435761) >>> 8) & 0xffffff,
    );
    const grays = Array.from({ length: 256 }, (_, i) => i * 0x010101);
    const failures = [...sample, ...grays, 0x000d07, 0xff0000, 0x00ff00, 0x0000ff]
      .map(n => new Color(n >> 16, (n >> 8) & 255, n & 255))
      .filter(c => new Color(c.toString('hsl')).hex !== c.hex)
      .map(c => c.hex);

    expect(failures).toEqual([]);
  });
});

describe('non-finite and out-of-range numeric input', () => {
  test.each([
    ['fromLAB', () => Color.fromLAB(50, 0, 0, 2)],
    ['fromLAB tuple', () => Color.fromLAB([50, 0, 0], 2)],
    ['fromLCH', () => Color.fromLCH(50, 0, 0, 2)],
    ['fromXYZ', () => Color.fromXYZ(0.2, 0.2, 0.2, 2)],
    ['fromHSL', () => Color.fromHSL(0, 1, 0.5, 2)],
    ['fromRGB', () => Color.fromRGB(1, 2, 3, 2)],
    ['fromOklab', () => Color.fromOklab(0.5, 0, 0, 2)],
    ['fromOklch', () => Color.fromOklch(0.5, 0, 0, 2)],
    ['setAlpha', () => red.setAlpha(2)],
  ] as const)('%s clamps alpha', (_label, make) => {
    expect(make().alpha).toBe(1);
  });

  test.each([
    ['mix', () => red.mix('blue', NaN)],
    ['lab.mix', () => red.lab.mix(clearBlue, NaN)],
    ['oklab.mix', () => red.oklab.mix(clearBlue, Infinity)],
    ['setAlpha', () => red.setAlpha(NaN)],
    ['setLightness', () => red.setLightness(NaN)],
    ['setHue', () => red.setHue(Infinity)],
    ['setRed', () => red.setRed(NaN)],
    ['fromOklch', () => Color.fromOklch(NaN, 0.1, 30)],
    ['fromLAB tuple', () => Color.fromLAB([50, NaN, 0])],
    ['lab.lightness', () => red.lab.lightness(NaN)],
  ] as const)('%s throws on non-finite input', (_label, make) => {
    expect(make).toThrow('must be finite');
  });
});

describe('lab.mix / oklab.mix premultiply alpha', () => {
  test('a fully transparent color contributes no hue', () => {
    expect(red.lab.mix(clearBlue).toString('rgba')).toBe('rgba(255, 0, 0, 0.5)');
    expect(red.oklab.mix(clearBlue).toString('rgba')).toBe('rgba(255, 0, 0, 0.5)');
    expect(red.mix(clearBlue).toString('rgba')).toBe('rgba(255, 0, 0, 0.5)');
  });

  test('two transparent colors mix to transparent', () => {
    expect(red.setAlpha(0).lab.mix(clearBlue).alpha).toBe(0);
    expect(red.setAlpha(0).oklab.mix(clearBlue).toString('named')).toBe('transparent');
  });

  test('opaque mixes are unchanged', () => {
    const blue = new Color('blue');
    const [L, a, b] = red.asLAB();
    const [L2, a2, b2] = blue.asLAB();

    expect(red.lab.mix(blue, 0.25).asLAB()).toEqual([
      L * 0.75 + L2 * 0.25,
      a * 0.75 + a2 * 0.25,
      b * 0.75 + b2 * 0.25,
    ]);
  });
});

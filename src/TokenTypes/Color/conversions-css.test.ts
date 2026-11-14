import { describe, expect, test } from 'bun:test';

import type { Space, SpaceData } from './ColorSpace.js';
import { convert, convertWithIntermediates } from './ColorSpace.js';
import { HSLToRGB, LABToLCH, OklabToXYZ, XYZToOklab } from './conversions.js';
import { Color } from './index.js';

// Reference values are independent of teikn: the CSS Color 4 spec examples, or
// numbers computed from the spec's sample-code maths (conversions.js), using
// its XYZ→LMS→OKLab matrices rather than teikn's linear-sRGB route.

const expectClose = (actual: readonly number[], expected: readonly number[], digits: number) => {
  expected.forEach((v, i) => expect(actual[i]).toBeCloseTo(v, digits));
};

describe('lab()/lch() are D50, as CSS Color 4 defines them', () => {
  test('#008000 matches the spec example', () => {
    // Spec text: lab(46.2775 -47.5621 48.5837) / lch(46.2775 67.9892 134.3912).
    // Its current sample code yields (46.2777, -47.5524, 48.5863); both are
    // within this tolerance, the old D65 result (46.23, -51.7, 49.9) is not.
    expectClose(convert('rgb', 'lab', [0, 128, 0]), [46.2775, -47.5621, 48.5837], 1);
    expectClose(convert('rgb', 'lch', [0, 128, 0]), [46.2775, 67.9892, 134.3912], 1);
  });

  test('sRGB → lab matches the spec sample-code maths', () => {
    expectClose(convert('rgb', 'lab', [0, 128, 0]), [46.27771, -47.5524, 48.58628], 4);
    expectClose(convert('rgb', 'lab', [255, 0, 0]), [54.29054, 80.80493, 69.89096], 4);
    expectClose(convert('rgb', 'lab', [51, 102, 153]), [41.52082, -4.57309, -33.49419], 4);
    expectClose(convert('rgb', 'lab', [255, 255, 255]), [100, 0, 0], 8);
  });

  test('lab() → sRGB matches browsers', () => {
    expect(new Color('lab(70 20 -40)').asRGB()).toEqual([178, 160, 244]);
    expect(new Color('lab(50 0 50)').asRGB()).toEqual([136, 118, 22]);
    expect(new Color('lab(60 -30 40)').asRGB()).toEqual([106, 158, 69]);
  });

  test('xyz stays D65', () => {
    expectClose(convert('rgb', 'xyz', [255, 255, 255]), [0.3127 / 0.329, 1, 0.3583 / 0.329], 10);
    expectClose(convert('xyz', 'lab', [0.3, 0.4, 0.5]), [69.22132, -29.11579, -7.40647], 4);
  });
});

describe('xyz/lab/lch ↔ oklab/oklch do not pass through rgb', () => {
  const wide: Space[] = ['xyz', 'lab', 'lch', 'oklab', 'oklch'];

  test('no path between wide-gamut spaces visits rgb or hsl', () => {
    for (const from of wide) {
      for (const to of wide) {
        const visited = Object.keys(convertWithIntermediates(from, to, [0.5, 0.1, 0.1]));

        expect(visited).not.toContain('rgb');
        expect(visited).not.toContain('hsl');
      }
    }
  });

  test('out-of-gamut lab → oklch is not gamut-mapped', () => {
    expectClose(convert('lab', 'oklch', [50, 100, 0]), [0.603495, 0.3157, 359.170766], 3);
    expect(new Color('lab(50 100 0)').toString('oklch')).toBe('oklch(0.6035 0.3157 359.171)');
  });

  test('oklch → xyz/lab/lch matches the spec maths', () => {
    expectClose(convert('oklch', 'xyz', [0.7, 0.4, 150]), [0.091061, 0.405163, -0.009192], 3);
    expectClose(convert('oklch', 'lab', [0.7, 0.4, 150]), [69.76354, -130.7701, 123.4027], 1);
    expectClose(convert('oklch', 'lch', [0.05, 0.01, 100]), [0.115501, 0.167153, 93.023235], 1);
    expectClose(convert('xyz', 'oklab', [0.3, 0.4, 0.5]), [0.726345, -0.085631, -0.019207], 3);
  });

  test('a no-op lch operation on a dark oklch color leaves it unchanged', () => {
    const c = new Color('oklch(0.05 0.01 100)');

    expect(c.lch.rotateHue(0).toString('oklch')).toBe('oklch(0.05 0.01 100)');
  });

  test('deltaE sees the difference between an out-of-gamut color and its sRGB fallback', () => {
    const c = new Color('oklch(0.7 0.4 150)');

    expect(c.deltaE(new Color(c.toString('rgb')))).toBeGreaterThan(5);
  });

  test('round trips are lossless, in and out of gamut', () => {
    const cases: { [S in Space]?: SpaceData[S][] } = {
      lab: [
        [50, 100, -100],
        [70, 20, -40],
        [5, 1, 1],
      ],
      oklch: [
        [0.7, 0.4, 150],
        [0.05, 0.01, 100],
      ],
      xyz: [
        [0.9, 0.1, 0.02],
        [0.3, 0.4, 0.5],
      ],
    };

    for (const [from, values] of Object.entries(cases) as [Space, SpaceData[Space][]][]) {
      for (const value of values) {
        for (const via of wide) {
          // Ottosson's published forward/inverse matrices agree to ~1e-7 relative.
          expectClose(convert(via, from, convert(from, via, value)), value, 4);
        }
      }
    }

    expectClose(XYZToOklab(OklabToXYZ([0.6, 0.3, -0.2])), [0.6, 0.3, -0.2], 6);
  });

  test('in-gamut sRGB round trips stay exact through every space', () => {
    const steps = [0, 1, 17, 64, 127, 128, 200, 254, 255];

    for (const r of steps) {
      for (const g of steps) {
        for (const b of steps) {
          for (const space of [...wide, 'hsl'] as Space[]) {
            expect(convert(space, 'rgb', convert('rgb', space, [r, g, b]))).toEqual([r, g, b]);
          }
        }
      }
    }
  });
});

describe('HSLToRGB hue normalisation', () => {
  test('negative hues wrap', () => {
    expect(HSLToRGB([-150, 1, 0.5])).toEqual([0, 128, 255]);
    expect(HSLToRGB([-150, 1, 0.5])).toEqual(HSLToRGB([210, 1, 0.5]));
    expect(HSLToRGB([-390, 1, 0.5])).toEqual([255, 0, 128]);
    expect(HSLToRGB([-90, 1, 0.5])).toEqual([128, 0, 255]);
    expect(Color.fromHSL(-150, 1, 0.5).toString('rgb')).toBe('rgb(0, 128, 255)');
  });

  test('hues of a full turn or more wrap', () => {
    expect(HSLToRGB([360, 1, 0.5])).toEqual([255, 0, 0]);
    expect(HSLToRGB([570, 1, 0.5])).toEqual([0, 128, 255]);
  });
});

describe('achromatic LCH hue', () => {
  test('greys get hue 0, not atan2 noise', () => {
    for (const v of [0, 1, 128, 200, 255]) {
      const [, C, h] = convert('rgb', 'lch', [v, v, v]);

      expect(C).toBeCloseTo(0, 6);
      expect(h).toBe(0);
    }

    expect(new Color('#808080').toString('lch')).toBe('lch(53.59, 0, 0)');
  });

  test('chromatic hues are untouched', () => {
    expect(LABToLCH([50, 0, -10])).toEqual([50, 10, 270]);
    expect(LABToLCH([50, 0.01, 0.01])[2]).toBeCloseTo(45, 10);
  });
});

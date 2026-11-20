import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

import { Color } from './index.js';
import type { ColorFormat } from './types.js';

// Every format whose output is meant to parse back ('xkcd' emits a bare name by design).
const reparseable: ColorFormat[] = [
  'rgb',
  'rgba',
  'hex',
  'hex3',
  'hsl',
  'hsla',
  'lab',
  'laba',
  'lch',
  'lcha',
  'oklab',
  'oklaba',
  'oklch',
  'oklcha',
  'xyz',
  'xyza',
  'named',
  'native',
];

const tupleMethods = Object.getOwnPropertyNames(Color.prototype).filter(name =>
  /^as[A-Z]/.test(name),
) as (keyof Color)[];

const readTuples = (c: Color): unknown[] =>
  tupleMethods.map(name => (c[name] as () => unknown).call(c));

// Everything observable about a color, as one comparable string.
const fingerprint = (c: Color): string =>
  JSON.stringify([c.alpha, c.space, readTuples(c), reparseable.map(f => c.toString(f))]);

const scribble = (arr: number[]): void => {
  try {
    arr[0] = 255;
    arr.fill(0.123);
    arr.reverse();
  } catch {
    // a frozen array throws in strict mode — that is the point
  }
};

const perSpace: [string, () => Color][] = [
  ['rgb', () => new Color(70, 130, 180, 0.5)],
  ['string', () => new Color('#4682b4')],
  ['hsl', () => Color.fromHSL(207, 0.44, 0.49)],
  ['lab', () => Color.fromLAB(52, -8.4, -32.8)],
  ['lch', () => Color.fromLCH(52, 33.9, 255.7)],
  ['oklab', () => Color.fromOklab(0.59, -0.04, -0.09)],
  ['oklch', () => Color.fromOklch(0.59, 0.1, 245.7)],
  ['xyz', () => Color.fromXYZ(0.19, 0.21, 0.46)],
];

describe('Color is immutable', () => {
  test('the tuple methods under test include every space', () => {
    expect(tupleMethods).toEqual(
      expect.arrayContaining(['asRGB', 'asHSL', 'asLAB', 'asLCH', 'asOklab', 'asOklch', 'asXYZ']),
    );
  });

  test.each(perSpace)('mutating any returned tuple of a %s color changes nothing', (_l, make) => {
    const c = make();
    const copy = new Color(c);
    const expected = fingerprint(make());

    // Twice: once while the caches fill, once against the cached arrays.
    readTuples(c).forEach(t => scribble(t as number[]));
    readTuples(c).forEach(t => scribble(t as number[]));
    readTuples(copy).forEach(t => scribble(t as number[]));

    expect(fingerprint(c)).toBe(expected);
    expect(fingerprint(copy)).toBe(expected);
    expect(fingerprint(new Color(c))).toBe(expected);
    expect(fingerprint(c.setAlpha(c.alpha))).toBe(expected);
  });

  test.each([
    ['fromRGB', Color.fromRGB, [70, 130, 180]],
    ['fromHSL', Color.fromHSL, [207, 0.44, 0.49]],
    ['fromLAB', Color.fromLAB, [52, -8.4, -32.8]],
    ['fromLCH', Color.fromLCH, [52, 33.9, 255.7]],
    ['fromOklab', Color.fromOklab, [0.59, -0.04, -0.09]],
    ['fromOklch', Color.fromOklch, [0.59, 0.1, 245.7]],
    ['fromXYZ', Color.fromXYZ, [0.19, 0.21, 0.46]],
  ] as const)('%s does not keep the array it is given', (_label, factory, values) => {
    const input = [...values] as [number, number, number];
    const make = factory as (data: readonly [number, number, number], alpha?: number) => Color;
    const c = make(input, 0.5);
    const expected = fingerprint(make(values, 0.5));

    scribble(input);

    expect(fingerprint(c)).toBe(expected);
    expect(fingerprint(new Color(c))).toBe(expected);
  });

  test('a color reads the same after the survey reproductions', () => {
    const c = new Color('steelblue');
    scribble(c.asRGB() as unknown as number[]);
    expect(c.hex).toBe('#4682b4');

    const xyz = [0.19, 0.21, 0.46] as [number, number, number];
    const fromXyz = Color.fromXYZ(xyz);
    const before = fromXyz.hex;
    fromXyz.toString();
    xyz[0] = 0.9;
    expect(fromXyz.hex).toBe(before);
    expect(new Color(fromXyz.toString()).hex).toBe(before);
  });
});

// Deterministic LCG so the sample is identical on every run and runner.
const lcg = (seed: number) => {
  let state = seed;

  return (): number => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;

    return state / 2 ** 32;
  };
};

const hues = [0, 1e-7, 0.004, 0.005, 0.0004, 0.0005, 180, 359.994, 359.995, 359.9994, 359.9995];
const edgeHues = [...hues, 359.999, 359.99996, 360, 720, -0.001, -360];
const alphas = [0, 0.00004, 0.00005, 0.5, 0.99994, 0.99995, 1];
const units = [0, 0.000004, 0.000005, 0.00004, 0.00005, 0.5, 0.99994, 0.99995, 0.999996, 1];
const labLs = [0, 0.004, 0.005, 50, 99.994, 99.995, 100];
const chromas = [0, 0.004, 0.005, 0.1, 30, 150, 400];
const okChromas = [0, 0.000004, 0.000005, 0.1, 0.4, 5];
const bytes = [0, 0.4, 0.5, 127.5, 254.5, 255];
const signed = [-125, -0.005, -0.004, 0, 0.004, 125];
const okSigned = [-5, -0.4, -0.000005, 0, 0.000004, 0.4];

const cross = (as: number[], bs: number[], cs: number[]): [number, number, number][] =>
  as.flatMap(a => bs.flatMap(b => cs.map(c => [a, b, c] as [number, number, number])));

const boundaryColors = (): Color[] => [
  ...cross(bytes, bytes, bytes).flatMap(v => alphas.map(a => Color.fromRGB(v, a))),
  ...cross(edgeHues, units, units).map((v, i) => Color.fromHSL(v, alphas[i % alphas.length])),
  ...cross(labLs, signed, signed).map((v, i) => Color.fromLAB(v, alphas[i % alphas.length])),
  ...cross(labLs, chromas, edgeHues).map((v, i) => Color.fromLCH(v, alphas[i % alphas.length])),
  ...cross(units, okSigned, okSigned).map((v, i) => Color.fromOklab(v, alphas[i % alphas.length])),
  ...cross(units, okChromas, edgeHues).map((v, i) => Color.fromOklch(v, alphas[i % alphas.length])),
  ...cross([-1, 0, 0.000004, 0.5, 2], [0, 0.000005, 1], [-0.5, 0, 0.95, 1.5]).map((v, i) =>
    Color.fromXYZ(v, alphas[i % alphas.length]),
  ),
];

const randomColors = (count: number): Color[] => {
  const rand = lcg(20261117);
  const between = (min: number, max: number) => min + rand() * (max - min);
  const alpha = () => (rand() < 0.5 ? 1 : rand());
  const makers = [
    () => Color.fromRGB(between(0, 255), between(0, 255), between(0, 255), alpha()),
    () => Color.fromHSL(between(0, 360), rand(), rand(), alpha()),
    () => Color.fromLAB(between(0, 100), between(-130, 130), between(-130, 130), alpha()),
    () => Color.fromLCH(between(0, 100), between(0, 160), between(0, 360), alpha()),
    () => Color.fromOklab(rand(), between(-0.45, 0.45), between(-0.45, 0.45), alpha()),
    () => Color.fromOklch(rand(), between(0, 0.45), between(0, 360), alpha()),
    () => Color.fromXYZ(rand(), rand(), between(0, 1.1), alpha()),
  ];

  return Array.from({ length: count }, (_, i) => makers[i % makers.length]!());
};

const nonIdempotent = (colors: Color[]): string[] =>
  colors.flatMap(c =>
    reparseable.flatMap(format => {
      const s = c.toString(format);
      const again = new Color(s).toString(format);

      return again === s ? [] : [`${format}: ${s} -> ${again}`];
    }),
  );

describe('serialization is idempotent', () => {
  test('survey reproductions: a hue that rounds to 360 wraps to 0', () => {
    expect(Color.fromLCH(50, 30, 359.999).toString()).toBe('lch(50, 30, 0)');
    expect(Color.fromOklch(0.5, 0.1, 359.99996).toString()).toBe('oklch(0.5 0.1 0)');
    expect(Color.fromLCH(50, 30, 359.999, 0.5).toString()).toBe('lch(50, 30, 0 / 0.5)');
    expect(Color.fromOklch(0.5, 0.1, 359.99996, 0.5).toString()).toBe('oklch(0.5 0.1 0 / 0.5)');
  });

  test('every reparseable format survives a re-parse at the clamp and wrap boundaries', () => {
    expect(nonIdempotent(boundaryColors()).slice(0, 20)).toEqual([]);
  });

  test('every reparseable format survives a re-parse for a large random sample', () => {
    expect(nonIdempotent(randomColors(7000)).slice(0, 20)).toEqual([]);
  });
});

describe('invalid arguments fail loudly', () => {
  const c = new Color('#ff000080');

  test.each(['hex8', 'RGB', 'hsv', '', 'constructor'])('toString(%p) throws', format => {
    expect(() => c.toString(format as ColorFormat)).toThrow(
      /Unknown color format .*'hex'.*'native'/,
    );
  });

  test('every format the error lists is accepted', () => {
    const message = (() => {
      try {
        return c.toString('nope' as ColorFormat);
      } catch (e) {
        return (e as Error).message;
      }
    })();
    const listed = [...message.matchAll(/'([a-z0-9]+)'/g)]
      .map(m => m[1]!)
      .filter(f => f !== 'nope');

    expect(listed.toSorted()).toEqual([...reparseable, 'xkcd'].toSorted());
    listed.forEach(f => expect(typeof c.toString(f as ColorFormat)).toBe('string'));
  });

  test('toString() and toString(undefined) still serialize natively', () => {
    expect(c.toString()).toBe('rgba(255, 0, 0, 0.502)');
    expect(c.toString(undefined)).toBe(c.toString('native'));
  });

  test.each(['bogus', 'constructor', 'toString', '__proto__', ''])(
    'simulateColorBlindness(%p) throws naming the valid types',
    type => {
      expect(() => c.simulateColorBlindness(type as never)).toThrow(
        /Unknown color blindness type .*'protanopia'.*'tritanomaly'/,
      );
    },
  );
});

describe('finite input never produces NaN', () => {
  const steelblue = new Color('steelblue');
  const allFinite = (c: Color): boolean =>
    !/NaN|Infinity|null/.test(
      JSON.stringify([
        readTuples(c),
        reparseable.map(f => c.toString(f)),
        c.luminance(),
        c.deltaE(steelblue),
        steelblue.deltaE(c),
        c.deltaE(c.invert()),
      ]),
    );

  test('absurd magnitudes are rejected up front with a clear error', () => {
    expect(() => new Color('lab(50 1e120 0)')).toThrow(/lab components must be within/);
    expect(() => new Color('xyz(1e200 0 0)')).toThrow(/xyz components must be within/);
    expect(() => new Color('oklab(0.5 1e110 0)')).toThrow(/oklab components must be within/);
    expect(() => Color.fromOklab(0.5, 1e110, 0)).toThrow(/oklab components must be within/);
    expect(() => Color.fromLCH(50, 1e300, 0)).toThrow(/lch components must be within/);
    expect(() => Color.fromXYZ(0, -1.1e9, 0)).toThrow(/xyz components must be within/);
    expect(() => new Color('#fff').xyz.x(-1e300)).toThrow(/xyz components must be within/);
  });

  test('every magnitude that is accepted converts to finite values in every space', () => {
    const magnitudes = [1, 150, 1e3, 1e6, 1e9];
    const signs = [-1, 0, 1];
    const colors = magnitudes.flatMap(m =>
      cross(signs, signs, signs).flatMap(([a, b, c]) => [
        Color.fromLAB(50, a * m, b * m),
        Color.fromLAB(c * m, a * m, b * m),
        Color.fromLCH(50, m, a * m),
        Color.fromOklab(0.5, a * m, b * m),
        Color.fromOklab(c * m, a * m, b * m),
        Color.fromOklch(0.5, m, a * m),
        Color.fromXYZ(a * m, b * m, c * m),
        Color.fromHSL(a * m, b * m, c * m),
        Color.fromRGB(a * m, b * m, c * m),
      ]),
    );
    const failures = colors.filter(color => !allFinite(color)).map(color => color.toString());

    expect(failures).toEqual([]);
  });
});

// docs/api/values.md must show what the code returns. Each row is the code the
// page shows and the value it produces; the page has to contain exactly that line.
describe('docs/api/values.md Color examples', () => {
  const page = readFileSync(new URL('../../../docs/api/values.md', import.meta.url), 'utf8');
  const c = new Color('steelblue');
  const round3 = (n: number): number => Math.round(n * 1000) / 1000;
  const show = (v: unknown): string => {
    if (Array.isArray(v)) {
      return `[${v.map(show).join(', ')}]`;
    }

    return typeof v === 'number' ? String(round3(v)) : `'${String(v)}'`;
  };

  test.each([
    ["new Color('#F00').hex", new Color('#F00').hex],
    ["new Color('#F00A').alpha", new Color('#F00A').alpha],
    ["new Color('#FF0000AA').alpha", new Color('#FF0000AA').alpha],
    ["new Color('hsl(207, 44%, 49%)').hex", new Color('hsl(207, 44%, 49%)').hex],
    ["new Color('lab(52, -8.4, -32.8)').hex", new Color('lab(52, -8.4, -32.8)').hex],
    ['Color.fromHSL(210, 1, 0.4).hex', Color.fromHSL(210, 1, 0.4).hex],
    ['Color.fromHSL(210, 100, 40).hex', Color.fromHSL(210, 100, 40).hex],
    ['Color.fromLAB(44, -5, -45).hex', Color.fromLAB(44, -5, -45).hex],
    ['Color.fromLCH(44, 45, 265).hex', Color.fromLCH(44, 45, 265).hex],
    ['c.red', c.red],
    ['c.green', c.green],
    ['c.blue', c.blue],
    ['c.alpha', c.alpha],
    ['c.hue', c.hue],
    ['c.saturation', c.saturation],
    ['c.lightness', c.lightness],
    ['c.asRGB()', c.asRGB()],
    ['c.asHSL()', c.asHSL()],
    ['c.asLAB()', c.asLAB()],
    ['c.asLCH()', c.asLCH()],
    ['c.asXYZ()', c.asXYZ()],
    ["c.toString('hex')", c.toString('hex')],
    ["c.toString('rgb')", c.toString('rgb')],
    ["c.toString('rgba')", c.toString('rgba')],
    ["c.toString('hsl')", c.toString('hsl')],
    ["c.toString('lab')", c.toString('lab')],
    ["c.toString('lch')", c.toString('lch')],
    ["c.toString('oklch')", c.toString('oklch')],
    ["c.toString('named')", c.toString('named')],
    ["c.toString('xkcd')", c.toString('xkcd')],
    ["c.toString('native')", c.toString('native')],
    ["new Color('oklch(0.7 0.15 200)').toString()", new Color('oklch(0.7 0.15 200)').toString()],
    ["new Color('#4682b4').toString()", new Color('#4682b4').toString()],
  ] as [string, unknown][])('%s', (code, value) => {
    expect(page).toContain(`${code}; // ${show(value)}`);
  });
});

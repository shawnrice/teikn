import { describe, expect, test } from 'bun:test';

import { resolveReferences } from '../resolve.js';
import type { Token } from '../Token.js';
import { validate } from '../validate.js';
import { Border } from './Border.js';
import { BoxShadow, BoxShadowList } from './BoxShadow.js';
import { CubicBezier } from './CubicBezier.js';
import type { DimensionUnit } from './Dimension.js';
import { Dimension, absoluteUnits, convertDimension } from './Dimension.js';
import { Duration } from './Duration.js';
import { GradientList, LinearGradient, RadialGradient } from './Gradient.js';
import { hasRefFields } from './ref-guard.js';
import { Transition, TransitionList } from './Transition.js';
import { Typography } from './Typography.js';

// Field-level identity of a value: its RefFields record, or the scalar parts.
const fieldsOf = (value: unknown): string => {
  if (hasRefFields(value)) {
    return JSON.stringify(value.__teikn_fields__());
  }

  if (value instanceof CubicBezier) {
    return JSON.stringify(value.controlPoints);
  }

  const { value: n, unit } = value as Dimension | Duration;

  return JSON.stringify([n, unit]);
};

const expectSame = (a: unknown, b: unknown): void => {
  expect(String(a)).toBe(String(b));
  expect(fieldsOf(a)).toBe(fieldsOf(b));
};

// ─── Regressions and reported bugs ───────────────────────────

describe('R4: tidy only strips float noise', () => {
  test('exact round trips stay exact', () => {
    expect(String(new Dimension(1, 'pt').to('px').to('pt'))).toBe('1pt');
    expect(new Dimension(10, 'px').toRem(3).toPx(3).value).toBe(10);
    expect(new Dimension(1, 'pt').to('px').value).toBe(96 / 72);
  });

  test('integer digits are never altered', () => {
    const big = new Dimension(1234567890123.5, 'px');
    expect(big.add(new Dimension(0.25, 'px')).value).toBe(1234567890123.75);
    expect(big.subtract(new Dimension(0.25, 'px')).value).toBe(1234567890123.25);
    expect(big.scale(1).value).toBe(1234567890123.5);
    expect(new Duration(1700000000000.5, 'ms').scale(1).value).toBe(1700000000000.5);
    expect(String(new Duration(1700000000000.5, 'ms').add(new Duration(1, 'ms')))).toBe(
      '1700000000001.5ms',
    );
  });

  test('float noise is still stripped', () => {
    expect(new Dimension(0.1, 'rem').scale(3).value).toBe(0.3);
    expect(new Dimension(0.1, 'rem').add(new Dimension(0.2, 'rem')).value).toBe(0.3);
    expect(new Dimension(0.3, 'rem').subtract(new Dimension(0.1, 'rem')).value).toBe(0.2);
    expect(new Duration(0.07, 's').ms()).toBe(70);
    expect(new Duration(1.1, 's').toMs().value).toBe(1100);
    expect(new Duration(0.3, 's').scale(1 / 3).value).toBe(0.1);
    expect(CubicBezier.easeIn.reverse().x2).toBe(0.58);
    expect(new Dimension(0.1, 'in').to('px').to('in').value).toBe(0.1);
  });
});

describe('R5: BoxShadow zero lengths are unit-agnostic', () => {
  test('a zero with a unit does not count as a mixed unit', () => {
    const shadow = new BoxShadow('0px 0.25rem 0.5rem red');
    expect(shadow.unit).toBe('rem');
    expect(String(shadow)).toBe('0 0.25rem 0.5rem rgb(255, 0, 0)');
    expect(new BoxShadow('0rem 4px 8px 0em red').unit).toBe('px');
  });

  test('non-zero lengths in different units still throw', () => {
    expect(() => new BoxShadow('1px 0.25rem red')).toThrow('mixed length units');
  });

  test('an all-zero shadow keeps a non-default unit through a round trip', () => {
    const zeroRem = new BoxShadow({ unit: 'rem', color: 'red' });
    expect(String(zeroRem)).toBe('0rem 0rem rgb(255, 0, 0)');

    const reparsed = new BoxShadow(String(zeroRem));
    expect(reparsed.unit).toBe('rem');
    expect(String(reparsed.with({ blur: 1 }))).toBe(String(zeroRem.with({ blur: 1 })));
    expect(String(new BoxShadow({ color: 'red' }))).toBe('0 0 rgb(255, 0, 0)');
    expect(new BoxShadow('0 0 red').unit).toBe('px');
  });
});

describe('M8: LinearGradient angles carry no float noise', () => {
  test.each([0.1, 33.3, 0.7, 118.8, 200.2, 359.9])('%p stays as written', angle => {
    expect(new LinearGradient(angle, ['red', 'blue']).angle).toBe(angle);
  });

  test('normalises into [0, 360)', () => {
    expect(new LinearGradient(-33.3, ['red']).angle).toBe(326.7);
    expect(new LinearGradient(393.3, ['red']).angle).toBe(33.3);
    expect(new LinearGradient(720, ['red']).angle).toBe(0);
    expect(Object.is(new LinearGradient(-0, ['red']).angle, 0)).toBe(true);
    expect(new LinearGradient(-1e-20, ['red']).angle).toBe(0);
  });

  test('parsing, turn units and reverse() are clean', () => {
    const css = 'linear-gradient(33.3deg, rgb(255, 0, 0), rgb(0, 0, 255))';
    expect(String(new LinearGradient('linear-gradient(33.3deg, red, blue)'))).toBe(css);
    expect(String(new LinearGradient('linear-gradient(0.33turn, red, blue)'))).toMatch(
      /^linear-gradient\(118\.8deg,/,
    );
    expect(String(new LinearGradient(33.3, ['red', 'blue']).reverse().reverse())).toBe(css);
    expect(new LinearGradient(33.3, ['red']).rotate(0.1).angle).toBe(33.4);
  });

  test('a tiny angle prints without an exponent and re-parses', () => {
    const tiny = String(new LinearGradient(1e-7, ['red', 'blue']));
    expect(tiny).toMatch(/^linear-gradient\(0\.0000001deg,/);
    expect(new LinearGradient(tiny).angle).toBe(1e-7);
  });
});

describe('M9: gradients reject invalid options', () => {
  test.each([NaN, Infinity, -Infinity, undefined])('LinearGradient angle %p throws', angle => {
    const bad = angle as unknown as number;
    expect(() => new LinearGradient(bad, ['red', 'blue'])).toThrow('angle');
    expect(() => new LinearGradient({ angle: bad, stops: ['red', 'blue'] })).toThrow('angle');
    expect(() => LinearGradient.from({ angle: bad, stops: ['red', 'blue'] })).toThrow('angle');
  });

  test('rotate() rejects a non-finite amount', () => {
    expect(() => new LinearGradient(10, ['red']).rotate(NaN)).toThrow('angle');
    expect(() => new LinearGradient({ angle: '45' as never, stops: ['red'] })).toThrow('angle');
    expect(() => new LinearGradient({ angle: null as never, stops: ['red'] })).toThrow('angle');
  });

  test('RadialGradient rejects an empty position', () => {
    expect(() => new RadialGradient({ position: '' }, ['red', 'blue'])).toThrow('position');
    expect(() => new RadialGradient({ position: '  ' }, ['red', 'blue'])).toThrow('position');
    expect(() => new RadialGradient({}, ['red', 'blue']).setPosition('')).toThrow('position');
  });

  test('RadialGradient rejects a circle with two radii', () => {
    const ellipse = new RadialGradient({ size: '10px 20px' }, ['red', 'blue']);
    expect(() => ellipse.setShape('circle')).toThrow('circle');
    expect(() => new RadialGradient({ shape: 'circle', size: '10px 20px' }, ['red'])).toThrow(
      'circle',
    );
    expect(() => new RadialGradient('radial-gradient(circle 10px 20px, red, blue)')).toThrow(
      'circle',
    );
  });

  test('RadialGradient rejects an unknown shape or an empty size', () => {
    expect(() => new RadialGradient({ shape: 'square' as 'circle' }, ['red'])).toThrow('shape');
    expect(() => new RadialGradient({ size: '' }, ['red'])).toThrow('size');
  });
});

describe('M10: Transition validates property on every path', () => {
  const invalid = ['opacity, transform', '', ' ', 'opacity 5s', 'ease-in', 'linear', '1s', '5px'];

  test.each(invalid)('property %p throws in every form', property => {
    const input = { duration: '0.2s', timingFunction: 'ease', property };
    expect(() => new Transition(input)).toThrow('property');
    expect(() => Transition.from(input)).toThrow('property');
    expect(() => new Transition('0.2s', 'ease', '0s', property)).toThrow('property');
    expect(() => Transition.fade.setProperty(property)).toThrow('property');
    expect(() => Transition.fade.__teikn_fromFields__(input)).toThrow('property');
  });

  test('valid properties and references are kept', () => {
    expect(Transition.fade.setProperty('--my-var').property).toBe('--my-var');
    expect(Transition.fade.setProperty('background-color').property).toBe('background-color');
    expect(Transition.fade.setProperty('{motion.prop}').property).toBe('{motion.prop}');
  });

  test('positional form with an undefined timing keeps delay and property', () => {
    const make = Transition as unknown as new (...args: unknown[]) => Transition;
    expect(String(new make('0.2s', undefined, '1s', 'opacity'))).toBe('opacity 0.2s ease 1s');
    expect(String(new make('0.2s', undefined, undefined, 'opacity'))).toBe('opacity 0.2s ease');
    expect(String(new make(new Duration(200, 'ms'), undefined, '1s'))).toBe('200ms ease 1s');
  });
});

describe('M11: Typography fontFamily arrays resolve per element', () => {
  const tokens = (value: unknown): Token[] =>
    [
      { name: 'body', type: 'font-family', value: 'Inter' },
      { name: 't', type: 'typography', value },
    ] as Token[];

  test('a {ref} inside the array is resolved', () => {
    const typography = new Typography({ fontFamily: ['{body}', 'sans-serif'], fontSize: '16px' });
    expect(String(typography)).toBe('16px {body}, sans-serif');
    expect(String(resolveReferences(tokens(typography))[1]!.value)).toBe('16px Inter, sans-serif');
    expect(validate(tokens(typography)).issues).toEqual([]);
  });

  test('a missing reference inside the array is reported', () => {
    const typography = new Typography({ fontFamily: ['{nope}', 'serif'], fontSize: '16px' });
    expect(validate(tokens(typography)).valid).toBe(false);
    expect(() => resolveReferences(tokens(typography))).toThrow('nope');
  });

  test('a reference to a font stack is flattened', () => {
    const stack = [
      { name: 'body', type: 'font-family', value: ['Inter', 'Arial'] },
      {
        name: 't',
        type: 'typography',
        value: new Typography({ fontFamily: ['{body}', 'sans-serif'], fontSize: '16px' }),
      },
    ] as Token[];
    expect(String(resolveReferences(stack)[1]!.value)).toBe('16px Inter, Arial, sans-serif');
  });

  test('the array and string forms agree', () => {
    const fromArray = new Typography({ fontFamily: ['Inter', 'sans-serif'], fontSize: '16px' });
    const fromString = new Typography({ fontFamily: 'Inter, sans-serif', fontSize: '16px' });
    expect(fromArray.fontFamily).toBe('Inter, sans-serif');
    expect(String(fromArray)).toBe(String(fromString));
    expect(String(fromArray.with({ fontSize: '2rem' }))).toBe('2rem Inter, sans-serif');
    expect(String(new Typography(fromArray))).toBe(String(fromArray));
  });

  test.each([undefined, null, [], '', '  ', [''], ['Inter', ' '], [' {body} ']].map(v => [v]))(
    'fontFamily %p throws',
    fontFamily => {
      expect(
        () => new Typography({ fontFamily: fontFamily as unknown as string, fontSize: '16px' }),
      ).toThrow('fontFamily');
    },
  );
});

describe('M12: empty and incomplete strings throw', () => {
  test.each([
    ['Transition ""', () => new Transition('')],
    ['Transition "  "', () => new Transition('  ')],
    ['Transition.from("")', () => Transition.from('')],
    ['BoxShadow ""', () => new BoxShadow('')],
    ['BoxShadow "  "', () => new BoxShadow('  ')],
    ['BoxShadow "red"', () => new BoxShadow('red')],
    ['BoxShadow "inset"', () => new BoxShadow('inset')],
    ['BoxShadow "1px red"', () => new BoxShadow('1px red')],
    ['BoxShadow.from("")', () => BoxShadow.from('')],
    ['TransitionList "a,,b"', () => new TransitionList('opacity 1s,,transform 1s')],
    ['BoxShadowList "a,,b"', () => new BoxShadowList('1px 1px red,,2px 2px blue')],
    ['GradientList "a,,b"', () => new GradientList('linear-gradient(red, blue),,')],
    ['Border ""', () => new Border('')],
    ['Dimension ""', () => new Dimension('')],
    ['Duration ""', () => new Duration('')],
    ['CubicBezier ""', () => new CubicBezier('')],
    ['LinearGradient ""', () => new LinearGradient('')],
    ['RadialGradient ""', () => new RadialGradient('')],
  ])('%s', (_label, make) => {
    expect(make).toThrow();
  });

  test('a two-length shadow without a color is still valid', () => {
    expect(String(new BoxShadow('1px 2px'))).toBe('1px 2px rgb(0, 0, 0)');
    expect(String(new Transition('opacity'))).toBe('opacity 0s ease');
  });
});

describe('Border edges', () => {
  test('style keywords are case-insensitive and normalised', () => {
    expect(String(new Border('1PX SOLID RED'))).toBe('1px solid rgb(255, 0, 0)');
    expect(new Border({ width: '1px', style: 'Solid', color: 'red' }).style).toBe('solid');
    expect(new Border('1px solid red').with({ style: 'DASHED' }).style).toBe('dashed');
  });

  test.each(['-1px', '5%', '1fr'])('width %p throws in every form', width => {
    expect(() => new Border(`${width} solid red`)).toThrow();
    expect(() => new Border({ width, style: 'solid', color: 'red' })).toThrow('width');
    expect(() => new Border({ width: new Dimension(width), style: 'solid', color: 'red' })).toThrow(
      'width',
    );
    expect(() => Border.from({ width, style: 'solid', color: 'red' })).toThrow('width');
  });

  test('the string form keeps a {ref} color', () => {
    const border = new Border('1px solid {color.line}');
    expect(border.color).toBe('{color.line}');
    expect(String(border)).toBe('1px solid {color.line}');
    expect(String(new Border(String(border)))).toBe(String(border));
    expect(() => new Border('1px solid {a} {b}')).toThrow('Invalid border');
  });
});

describe('convertDimension rejects prototype keys', () => {
  test.each(['constructor', 'toString', '__proto__', 'hasOwnProperty', 'bogus'])('%p', key => {
    expect(() => convertDimension(1, key, 'px')).toThrow(`Cannot convert ${key} to px`);
    expect(() => convertDimension(1, 'px', key)).toThrow(`Cannot convert px to ${key}`);
    expect(() => Dimension.convert(1, key as DimensionUnit, 'px')).toThrow('Cannot convert');
    expect(() => new Dimension(1, 'px').to(key as DimensionUnit)).toThrow();
  });
});

// ─── Hole class 1: string round trip ─────────────────────────

type Ctor = new (input: never) => unknown;

const roundTrips: [name: string, ctor: Ctor, inputs: unknown[]][] = [
  [
    'Dimension',
    Dimension,
    ['0', '0px', '1px', '-1.5rem', '.5em', '+5vh', '1e3px', '1e-7px', '100%', '1fr', '2Q', '1PX'],
  ],
  ['Duration', Duration, ['0s', '0ms', '200ms', '0.2s', '-1s', '.5s', '1e3ms', '1e-7s', '2S']],
  [
    'CubicBezier',
    CubicBezier,
    [
      'ease',
      'ease-in-out',
      'linear',
      'standard',
      'cubic-bezier(0.1, 0.2, 0.3, 0.4)',
      'cubic-bezier(0, -1.5, 1, 2.5)',
      'cubic-bezier(.17,.67,.83,.67)',
      'cubic-bezier(1e-7, 0, 1, 1)',
    ],
  ],
  [
    'BoxShadow',
    BoxShadow,
    [
      '0 0',
      '0 0 red',
      '1px 2px',
      '1px 2px 3px red',
      '1px 2px 3px 4px rgba(0, 0, 0, 0.5)',
      '0 1px 0 4px blue',
      'inset 0 1px 2px red',
      '0.25rem 0.5rem 1rem rgb(0 0 0 / 50%)',
      '0px 0.25rem 0.5rem red',
      '0rem 0rem red',
      '-1px -2px 3px {color.ink}',
      '1e-7px 1px red',
      'red 1px 2px',
      { unit: 'rem', color: 'red' },
      { unit: 'em', inset: true, spread: 0 },
      { offsetX: 0, offsetY: 0, blur: 0, spread: 2, unit: 'rem' },
    ],
  ],
  [
    'BoxShadowList',
    BoxShadowList,
    ['1px 2px red', '0 1px 2px rgba(0, 0, 0, 0.2), inset 0 0 0 1px {line}', '0rem 0rem red, 0 0'],
  ],
  [
    'Transition',
    Transition,
    [
      '0s',
      'opacity',
      'ease',
      '0.2s ease',
      'opacity 200ms ease-in 1s',
      'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      '--my-var 1s linear -0.5s',
      'transform 1e3ms',
      { duration: '0.2s', timingFunction: 'ease', property: 'none' },
    ],
  ],
  ['TransitionList', TransitionList, ['opacity 1s', 'opacity 1s ease, transform 2s linear 0.5s']],
  [
    'Border',
    Border,
    [
      '1px solid red',
      '0 none transparent',
      '0.5rem dashed rgb(0 0 0 / 50%)',
      'red 2px dotted',
      '1px solid {color.line}',
      '1e-7px double blue',
    ],
  ],
  [
    'LinearGradient',
    LinearGradient,
    [
      'linear-gradient(red, blue)',
      'linear-gradient(to right, red, blue)',
      'linear-gradient(to top left, red 10%, blue 90%)',
      'linear-gradient(33.3deg, red, blue)',
      'linear-gradient(0.33turn, red, blue)',
      'linear-gradient(-45deg, red 0, {color.end} 50% 75%)',
      'linear-gradient(100grad, rgba(0, 0, 0, 0.5), blue)',
      { angle: 1e-7, stops: ['red', 'blue'] },
      { angle: 200.2, stops: [['red', '10%'], { color: 'blue' }] },
    ],
  ],
  [
    'RadialGradient',
    RadialGradient,
    [
      'radial-gradient(red, blue)',
      'radial-gradient(circle, red, blue)',
      'radial-gradient(circle 100px at top left, red, blue)',
      'radial-gradient(50% 30% at 20% 40%, red 10%, blue)',
      'radial-gradient(closest-side, red, {color.end})',
      'radial-gradient(100px, red, blue)',
    ],
  ],
  [
    'GradientList',
    GradientList,
    ['linear-gradient(33.3deg, red, blue), radial-gradient(circle at top, red, blue)'],
  ],
];

const typographies = (): Typography[] => [
  new Typography({ fontFamily: 'Inter', fontSize: '16px' }),
  new Typography({ fontFamily: ['Inter', 'sans-serif'], fontSize: '1rem', fontWeight: 400 }),
  new Typography({
    fontFamily: ['{font.body}', 'sans-serif'],
    fontSize: '{size.md}',
    fontWeight: '{weight.bold}',
    lineHeight: 1.5,
    letterSpacing: '0.01em',
  }),
  new Typography({ fontFamily: '"Helvetica Neue", Arial', fontSize: '1e-7px', lineHeight: '1.2' }),
];

const build = (ctor: Ctor, input: unknown): unknown => new ctor(input as never);

const label = (input: unknown): string =>
  typeof input === 'string' ? input : JSON.stringify(input);

// Built lazily so one broken input fails its own test, not the whole file.
const everyValue: [label: string, make: () => unknown][] = [
  ...roundTrips.flatMap(([name, ctor, inputs]) =>
    inputs.map(
      input => [`${name} ${label(input)}`, () => build(ctor, input)] as [string, () => unknown],
    ),
  ),
  [
    'Transition with refs',
    () => new Transition({ duration: '{d}', timingFunction: '{e}', delay: '{w}', property: '{p}' }),
  ],
  ['Border with refs', () => new Border({ width: '{w}', style: '{s}', color: '{c}' })],
  ...[0, 1, 2, 3].map(
    i => [`Typography #${i}`, () => typographies()[i]] as [string, () => unknown],
  ),
];

describe('string round trip', () => {
  describe.each(roundTrips)('%s', (_name, ctor, inputs) => {
    test.each(inputs.map(input => [label(input), input] as const))('%s', (_label, input) => {
      const value = build(ctor, input);
      const reparsed = build(ctor, String(value));
      expectSame(reparsed, value);
      expectSame(build(ctor, String(reparsed)), value);
      expectSame(build(ctor, value), value);
      expect(JSON.stringify(value)).toBe(JSON.stringify(String(value)));
    });
  });

  test.each(everyValue)('fields round trip: %s', (_label, make) => {
    const value = make();

    if (hasRefFields(value)) {
      expectSame(value.__teikn_fromFields__(value.__teikn_fields__()), value);
    }
  });
});

// ─── Hole class 2: constructor parity ────────────────────────

describe('constructor parity', () => {
  const red = 'rgb(255, 0, 0)';

  const equivalents: [name: string, forms: () => unknown[]][] = [
    [
      'Dimension',
      () => [
        new Dimension('1.5rem'),
        new Dimension(1.5, 'rem'),
        new Dimension({ value: 1.5, unit: 'rem' }),
        Dimension.from('1.5rem'),
        Dimension.from({ value: 1.5, unit: 'rem' }),
        Dimension.parse(' 1.5REM '),
      ],
    ],
    [
      'Dimension zero',
      () => [new Dimension('0'), new Dimension(0, 'px'), Dimension.zero(), Dimension.from('0px')],
    ],
    [
      'Duration',
      () => [
        new Duration('200ms'),
        new Duration(200, 'ms'),
        new Duration({ value: 200, unit: 'ms' }),
        Duration.from('200ms'),
        Duration.from({ value: 200, unit: 'ms' }),
        Duration.parse(' 200MS '),
      ],
    ],
    [
      'CubicBezier',
      () => [
        new CubicBezier('cubic-bezier(0.4, 0, 0.2, 1)'),
        new CubicBezier(0.4, 0, 0.2, 1),
        new CubicBezier({ x1: 0.4, y1: 0, x2: 0.2, y2: 1 }),
        CubicBezier.from('standard'),
        CubicBezier.from({ x1: 0.4, y1: 0, x2: 0.2, y2: 1 }),
        CubicBezier.standard,
      ],
    ],
    [
      'BoxShadow',
      () => [
        new BoxShadow('inset 1px 2px 3px 4px red'),
        new BoxShadow(1, 2, 3, 4, 'red', true),
        new BoxShadow({ offsetX: 1, offsetY: 2, blur: 3, spread: 4, color: 'red', inset: true }),
        BoxShadow.from(`1px 2px 3px 4px ${red} INSET`),
        BoxShadow.from({ offsetX: 1, offsetY: 2, blur: 3, spread: 4, color: red, inset: true }),
        new BoxShadow(1, 2).with({ blur: 3, spread: 4, color: 'red', inset: true }),
      ],
    ],
    [
      'BoxShadow default',
      () => [
        new BoxShadow('0 0'),
        new BoxShadow(0, 0),
        new BoxShadow({}),
        BoxShadow.from('0px 0px'),
      ],
    ],
    [
      'BoxShadowList',
      () => [
        new BoxShadowList('1px 2px red, 0 0 blue'),
        new BoxShadowList([new BoxShadow(1, 2, 0, 0, 'red'), new BoxShadow('0 0 blue')]),
        BoxShadowList.from('1px 2px red,0 0 blue'),
      ],
    ],
    [
      'Transition',
      () => [
        new Transition('opacity 0.2s ease-in 1s'),
        new Transition('0.2s', 'ease-in', '1s', 'opacity'),
        new Transition({
          duration: '0.2s',
          timingFunction: 'ease-in',
          delay: '1s',
          property: 'opacity',
        }),
        new Transition(new Duration(0.2, 's'), CubicBezier.easeIn, new Duration(1, 's'), 'opacity'),
        Transition.from({
          duration: new Duration(0.2, 's'),
          timingFunction: 'cubic-bezier(0.42, 0, 1, 1)',
          delay: '1s',
          property: 'opacity',
        }),
        Transition.fade
          .setDuration('0.2s')
          .setTimingFunction('ease-in')
          .setDelay('1s')
          .setProperty('opacity'),
      ],
    ],
    [
      'Transition default',
      () => [
        new Transition('0.2s'),
        new Transition('0.2s ease'),
        new Transition('0.2s', 'ease'),
        new Transition({ duration: '0.2s', timingFunction: 'ease' }),
        new Transition('0.2s', 'ease', '0s', 'all'),
        Transition.fade,
      ],
    ],
    [
      'TransitionList',
      () => [
        new TransitionList('opacity 1s ease, transform 2s linear'),
        new TransitionList([
          new Transition('1s', 'ease', '0s', 'opacity'),
          new Transition('2s', 'linear', '0s', 'transform'),
        ]),
        TransitionList.from('opacity 1s,transform 2s linear'),
      ],
    ],
    [
      'Border',
      () => [
        new Border('1px solid red'),
        new Border({ width: '1px', style: 'solid', color: 'red' }),
        new Border({ width: new Dimension(1, 'px'), style: 'SOLID', color: red }),
        Border.from('RED Solid 1PX'),
        Border.from({ width: '1px', style: 'solid', color: 'red' }),
        new Border('2px solid red').with({ width: '1px' }),
      ],
    ],
    [
      'LinearGradient',
      () => [
        new LinearGradient('linear-gradient(33.3deg, red 10%, blue)'),
        new LinearGradient(33.3, [['red', '10%'], 'blue']),
        new LinearGradient({ angle: 33.3, stops: [{ color: 'red', position: '10%' }, 'blue'] }),
        new LinearGradient(393.3, [['red', '10%']]).addStop('blue'),
        LinearGradient.from(`linear-gradient(33.3deg, ${red} 10%, blue)`),
        LinearGradient.from({ angle: -326.7, stops: [['red', '10%'], 'blue'] }),
        new LinearGradient(23.3, [['red', '10%'], 'blue']).rotate(10),
      ],
    ],
    [
      'LinearGradient default direction',
      () => [
        new LinearGradient('linear-gradient(red, blue)'),
        new LinearGradient('linear-gradient(to bottom, red, blue)'),
        new LinearGradient('linear-gradient(180deg, red, blue)'),
        new LinearGradient(180, ['red', 'blue']),
        new LinearGradient({ angle: 180, stops: ['red', 'blue'] }),
      ],
    ],
    [
      'RadialGradient',
      () => [
        new RadialGradient('radial-gradient(circle 100px at top, red, blue)'),
        new RadialGradient({ shape: 'circle', size: '100px', position: 'top' }, ['red', 'blue']),
        new RadialGradient({ size: '100px' }, ['red'])
          .setShape('circle')
          .setPosition('top')
          .addStop('blue'),
        RadialGradient.from('radial-gradient(100px circle at top, red, blue)'),
      ],
    ],
    [
      'GradientList',
      () => [
        new GradientList('linear-gradient(90deg, red, blue), radial-gradient(red, blue)'),
        new GradientList([
          new LinearGradient(90, ['red', 'blue']),
          new RadialGradient({}, ['red', 'blue']),
        ]),
        GradientList.from('linear-gradient(to right, red, blue),radial-gradient(red, blue)'),
      ],
    ],
    [
      'Typography',
      () => [
        new Typography({ fontFamily: ['Inter', 'serif'], fontSize: '16px', fontWeight: 400 }),
        new Typography({ fontFamily: 'Inter, serif', fontSize: '16px', fontWeight: '400' }).with({
          fontFamily: ['Inter', 'serif'],
        }),
        Typography.from({
          fontFamily: ['Inter', 'serif'],
          fontSize: new Dimension(16, 'px'),
          fontWeight: 400,
        }),
        new Typography({ fontFamily: ['Inter', 'serif'], fontSize: '1rem' }).with({
          fontSize: '16px',
          fontWeight: 400,
        }),
      ],
    ],
  ];

  test.each(equivalents)('%s: every form builds the same value', (_name, make) => {
    const forms = make();
    expect(forms.length).toBeGreaterThan(1);

    for (const form of forms.slice(1)) {
      expectSame(form, forms[0]);
    }
  });

  const u = undefined as never;
  const stops = ['red', 'blue'];

  const rejected: [name: string, makers: (() => unknown)[]][] = [
    [
      'Dimension',
      [
        () => new Dimension(''),
        () => new Dimension('  '),
        () => new Dimension('NaNpx'),
        () => new Dimension('Infinitypx'),
        () => new Dimension('1'),
        () => new Dimension('1 px'),
        () => new Dimension('{ref}'),
        () => new Dimension(NaN, 'px'),
        () => new Dimension(Infinity, 'px'),
        () => new Dimension(1, 'bogus' as never),
        () => new Dimension(1 as never),
        () => new Dimension({ value: NaN, unit: 'px' }),
        () => new Dimension({ value: -Infinity, unit: 'px' }),
        () => new Dimension({ value: 1, unit: 'bogus' as never }),
        () => new Dimension({ value: '1' as never, unit: 'px' }),
        () => Dimension.from(''),
        () => Dimension.from({ value: NaN, unit: 'px' }),
        () => Dimension.parse('px'),
        () => new Dimension(1, 'px').scale(NaN),
        () => new Dimension(1, 'px').scale(Infinity),
        () => new Dimension(1, 'px').to('rem', { remBase: 0 }),
        () => new Dimension(1, 'px').to('vw'),
      ],
    ],
    [
      'Duration',
      [
        () => new Duration(''),
        () => new Duration('  '),
        () => new Duration('NaNms'),
        () => new Duration('1'),
        () => new Duration('1min'),
        () => new Duration('{ref}'),
        () => new Duration(NaN, 'ms'),
        () => new Duration(Infinity, 's'),
        () => new Duration(1, 'min' as never),
        () => new Duration(1 as never),
        () => new Duration({ value: NaN, unit: 'ms' }),
        () => new Duration({ value: 1, unit: 'min' as never }),
        () => Duration.from(''),
        () => Duration.from({ value: Infinity, unit: 's' }),
        () => Duration.parse('ms'),
        () => new Duration(1, 's').scale(NaN),
      ],
    ],
    [
      'CubicBezier',
      [
        () => new CubicBezier(''),
        () => new CubicBezier('  '),
        () => new CubicBezier('bogus'),
        () => new CubicBezier('cubic-bezier(0, 0, 1)'),
        () => new CubicBezier('cubic-bezier(NaN, 0, 1, 1)'),
        () => new CubicBezier('cubic-bezier(2, 0, 1, 1)'),
        () => new CubicBezier('{ref}'),
        () => new CubicBezier(NaN, 0, 1, 1),
        () => new CubicBezier(0, Infinity, 1, 1),
        () => new CubicBezier(0, 0, u, u),
        () => new CubicBezier({ x1: NaN, y1: 0, x2: 1, y2: 1 }),
        () => new CubicBezier({ x1: 0, y1: 0, x2: 1, y2: Infinity }),
        () => new CubicBezier({ x1: 0, y1: 0 } as never),
        () => CubicBezier.from(''),
        () => CubicBezier.from({ x1: NaN, y1: 0, x2: 1, y2: 1 }),
        () => CubicBezier.ease.scaleY(NaN),
      ],
    ],
    [
      'BoxShadow',
      [
        () => new BoxShadow(''),
        () => new BoxShadow('  '),
        () => new BoxShadow('red'),
        () => new BoxShadow('1px'),
        () => new BoxShadow('NaNpx 1px red'),
        () => new BoxShadow('1px 2px bogus'),
        () => new BoxShadow('1px 2px 3px 4px 5px red'),
        () => new BoxShadow('1px 2% red'),
        () => new BoxShadow('{ref}'),
        () => new BoxShadow(NaN, 0),
        () => new BoxShadow(0, Infinity),
        () => new BoxShadow(0, 0, NaN),
        () => new BoxShadow(0, 0, 0, Infinity),
        () => new BoxShadow(0, 0, -1),
        () => new BoxShadow(0, 0, 0, 0, 'bogus'),
        () => new BoxShadow({ offsetX: NaN }),
        () => new BoxShadow({ offsetY: Infinity }),
        () => new BoxShadow({ blur: -1 }),
        () => new BoxShadow({ spread: '1' as never }),
        () => new BoxShadow({ color: 'bogus' }),
        () => new BoxShadow({ unit: '%' }),
        () => new BoxShadow({ unit: '' }),
        () => new BoxShadow({ unit: 'bogus' }),
        () => BoxShadow.from(''),
        () => BoxShadow.from({ offsetX: NaN }),
        () => new BoxShadow(1, 2).with({ blur: NaN }),
        () => new BoxShadow(1, 2).scale(NaN),
        () => new BoxShadow('1px 2px -3px red'),
      ],
    ],
    [
      'BoxShadowList',
      [
        () => new BoxShadowList('1px 1px red,,2px 2px blue'),
        () => new BoxShadowList('red'),
        () => new BoxShadowList('{ref}'),
        () => BoxShadowList.from('1px 2px, bogus'),
      ],
    ],
    [
      'Transition',
      [
        () => new Transition(''),
        () => new Transition('  '),
        () => new Transition('1s 2s 3s'),
        () => new Transition('opacity, transform 1s'),
        () => new Transition('1s steps(4)'),
        () => new Transition('{ref}'),
        () => new Transition('', 'ease'),
        () => new Transition('1', 'ease'),
        () => new Transition('1s', 'bogus'),
        () => new Transition('1s', 'ease', 'bogus'),
        () => new Transition('1s', 'ease', '0s', ''),
        () => new Transition({ duration: '', timingFunction: 'ease' }),
        () => new Transition({ duration: '1s', timingFunction: '' }),
        () => new Transition({ duration: '1s', timingFunction: 'ease', delay: '' }),
        () => new Transition({ duration: '1s', timingFunction: 'ease', property: '' }),
        () => new Transition({ duration: u, timingFunction: 'ease' }),
        () => new Transition({ duration: '1s', timingFunction: u }),
        () => new Transition({ duration: NaN as never, timingFunction: 'ease' }),
        () => Transition.from(''),
        () => Transition.from({ duration: '1s', timingFunction: 'ease', property: 'a, b' }),
        () => Transition.fade.setDuration(''),
        () => Transition.fade.setTimingFunction(''),
        () => Transition.fade.setDelay(''),
        () => Transition.fade.setProperty(''),
        () => Transition.fade.scale(NaN),
      ],
    ],
    [
      'TransitionList',
      [
        () => new TransitionList('opacity 1s,,transform 1s'),
        () => new TransitionList('1s 2s 3s'),
        () => new TransitionList('{ref}'),
        () => TransitionList.from('opacity 1s, a b'),
      ],
    ],
    [
      'Border',
      [
        () => new Border(''),
        () => new Border('  '),
        () => new Border('1px solid'),
        () => new Border('solid red'),
        () => new Border('NaNpx solid red'),
        () => new Border('1px bogus red'),
        () => new Border('1px solid solid red'),
        () => new Border('-1px solid red'),
        () => new Border('{ref}'),
        () => new Border({ width: '', style: 'solid', color: 'red' }),
        () => new Border({ width: 1 as never, style: 'solid', color: 'red' }),
        () => new Border({ width: '-1px', style: 'solid', color: 'red' }),
        () => new Border({ width: '1px', style: '', color: 'red' }),
        () => new Border({ width: '1px', style: 'bogus', color: 'red' }),
        () => new Border({ width: '1px', style: 'solid', color: '' }),
        () => new Border({ width: '1px', style: 'solid', color: 'bogus' }),
        () => new Border({ width: u, style: 'solid', color: 'red' }),
        () => new Border({ width: '1px', style: u, color: 'red' }),
        () => new Border({ width: '1px', style: 'solid', color: u }),
        () => Border.from(''),
        () => Border.from({ width: '1px', style: 'bogus', color: 'red' }),
        () => new Border('1px solid red').with({ width: '5%' }),
      ],
    ],
    [
      'LinearGradient',
      [
        () => new LinearGradient(''),
        () => new LinearGradient('  '),
        () => new LinearGradient('linear-gradient()'),
        () => new LinearGradient('linear-gradient(NaNdeg, red, blue)'),
        () => new LinearGradient('linear-gradient(to nowhere, red, blue)'),
        () => new LinearGradient('linear-gradient(45deg, bogus, blue)'),
        () => new LinearGradient('{ref}'),
        () => new LinearGradient(NaN, stops),
        () => new LinearGradient(Infinity, stops),
        () => new LinearGradient(45, ['bogus']),
        () => new LinearGradient(45, ['']),
        () => new LinearGradient({ angle: NaN, stops }),
        () => new LinearGradient({ angle: Infinity, stops }),
        () => new LinearGradient({ stops } as never),
        () => new LinearGradient({ angle: 45, stops: ['bogus'] }),
        () => LinearGradient.from(''),
        () => LinearGradient.from({ angle: NaN, stops }),
        () => new LinearGradient(45, stops).rotate(Infinity),
        () => new LinearGradient(45, stops).addStop('bogus'),
        () => String(new LinearGradient(45, [])),
      ],
    ],
    [
      'RadialGradient',
      [
        () => new RadialGradient(''),
        () => new RadialGradient('  '),
        () => new RadialGradient('radial-gradient()'),
        () => new RadialGradient('radial-gradient(circle at, red, blue)'),
        () => new RadialGradient('radial-gradient(circle 10px 20px, red, blue)'),
        () => new RadialGradient('radial-gradient(circle, bogus)'),
        () => new RadialGradient('{ref}'),
        () => new RadialGradient({ position: '' }, stops),
        () => new RadialGradient({ size: '' }, stops),
        () => new RadialGradient({ shape: '' as never }, stops),
        () => new RadialGradient({ shape: 'circle', size: '10px 20px' }, stops),
        () => new RadialGradient({}, ['bogus']),
        () => RadialGradient.from(''),
        () => new RadialGradient({}, stops).setPosition(' '),
        () => new RadialGradient({}, stops).addStop(''),
        () => String(new RadialGradient({}, [])),
      ],
    ],
    [
      'GradientList',
      [
        () => new GradientList('linear-gradient(red, blue),,radial-gradient(red, blue)'),
        () => new GradientList('bogus'),
        () => new GradientList('{ref}'),
        () => GradientList.from('linear-gradient(NaNdeg, red, blue)'),
      ],
    ],
    [
      'Typography',
      [
        () => new Typography('' as never),
        () => new Typography('16px Inter' as never),
        () => new Typography('{ref}' as never),
        () => new Typography({ fontFamily: '', fontSize: '16px' }),
        () => new Typography({ fontFamily: [], fontSize: '16px' }),
        () => new Typography({ fontSize: '16px' } as never),
        () => new Typography({ fontFamily: 'Inter' } as never),
        () => new Typography({ fontFamily: 'Inter', fontSize: '' }),
        () => new Typography({ fontFamily: 'Inter', fontSize: 16 as never }),
        () => new Typography({ fontFamily: 'Inter', fontSize: 'NaNpx' }),
        () => new Typography({ fontFamily: 'Inter', fontSize: '16px', fontWeight: NaN }),
        () => new Typography({ fontFamily: 'Inter', fontSize: '16px', fontWeight: '' }),
        () => new Typography({ fontFamily: 'Inter', fontSize: '16px', lineHeight: Infinity }),
        () => new Typography({ fontFamily: 'Inter', fontSize: '16px', letterSpacing: '' }),
        () => Typography.from({ fontFamily: [], fontSize: '16px' }),
        () => Typography.from({ fontFamily: 'Inter', fontSize: '16px', lineHeight: NaN }),
        () => typographies()[0]!.with({ fontFamily: [] }),
        () => typographies()[0]!.with({ fontWeight: NaN }),
      ],
    ],
  ];

  describe.each(rejected)('%s rejects invalid input', (_name, makers) => {
    test.each(makers.map(make => [String(make).replace(/^\(\) => /, ''), make] as const))(
      '%s',
      (_source, make) => {
        expect(make).toThrow();
      },
    );
  });
});

// ─── Hole class 3: unit round trips ──────────────────────────

describe('unit round trips', () => {
  const numbers = [0, 1, 2, 3, 4, 7, 8, 10, 12, 16, 24, 72, 96, 100, 1000, 0.5, 1.5, 0.25, 0.1, -4];
  const absolute = [...absoluteUnits] as DimensionUnit[];
  const pairs = absolute.flatMap(from => absolute.map(to => [from, to] as const));

  test.each(pairs)('%s → %s → back is exact', (from, to) => {
    for (const n of numbers) {
      const start = new Dimension(n, from);
      expect(String(start.to(to).to(from))).toBe(String(start));
      expect(start.to(to).to(from).equals(start)).toBe(true);
    }
  });

  test.each([16, 10, 3, 7, 18, 12.5])('px ↔ rem at base %p is exact', remBase => {
    for (const n of numbers) {
      const px = new Dimension(n, 'px');
      const rem = new Dimension(n, 'rem');
      expect(px.toRem(remBase).toPx(remBase).equals(px)).toBe(true);
      expect(rem.toPx(remBase).toRem(remBase).equals(rem)).toBe(true);
      expect(px.to('rem', { remBase }).to('px', { remBase }).value).toBe(n);
    }
  });

  test('ms ↔ s is exact', () => {
    for (const n of [...numbers, 0.07, 1.1, 0.001, 250, 1e-7]) {
      const ms = new Duration(n, 'ms');
      const s = new Duration(n, 's');
      expect(ms.toS().toMs().equals(ms)).toBe(true);
      expect(s.toMs().toS().equals(s)).toBe(true);
      expect(Duration.convert(Duration.convert(n, 's', 'ms'), 'ms', 's')).toBe(n);
    }
  });

  test('a three-unit cycle returns to the start', () => {
    for (const n of numbers) {
      const start = new Dimension(n, 'in');
      expect(
        start.to('cm').to('mm').to('pt').to('pc').to('Q').to('px').to('in').equals(start),
      ).toBe(true);
    }
  });
});

// ─── Hole class 4: output sanity ─────────────────────────────

describe('output sanity', () => {
  const derived: (() => unknown)[] = [
    () => new Dimension(0.1, 'rem').scale(3),
    () => new Dimension(0.1, 'rem').add(new Dimension(0.2, 'rem')),
    () => new Dimension(0.3, 'rem').subtract(new Dimension(0.1, 'rem')),
    () => new Dimension(1e-7, 'px').scale(0.1),
    () => new Dimension(1e21, 'px').scale(10),
    () => new Dimension(0.1, 'cm').to('mm'),
    () => new Dimension(1.1, 'in').to('px'),
    () => new Dimension(1.1, 'px').negate(),
    () => new Duration(0.07, 's').toMs(),
    () => new Duration(1.1, 's').toMs(),
    () => new Duration(0.1, 's').add(new Duration(200, 'ms')),
    () => new Duration(0.3, 's').subtract(new Duration(100, 'ms')),
    () => new Duration(1e-7, 's').scale(0.1),
    () => CubicBezier.easeIn.reverse(),
    () => CubicBezier.ease.reverse().reverse(),
    () => new CubicBezier(0.4, 0.1, 0.2, 1).scaleY(3),
    () => new CubicBezier(1e-7, 1e-9, 1, 1),
    () => new BoxShadow({ offsetX: 0.1, offsetY: 0.1, blur: 0.1, unit: 'rem' }).scale(3),
    () => new BoxShadow(1e-7, 1e21, 1e-9),
    () => new BoxShadow('1px 2px red').scale(0),
    () => new BoxShadowList('0.1rem 0.2rem red, 0 0').map(shadow => shadow.scale(3)),
    () => new Transition('0.3s', 'ease', '0.2s').shift('100ms'),
    () => new Transition('0.3s', 'ease').scale(1 / 3),
    () => new Transition('0.3s', 'ease-in', '0.1s').reverse().scale(3),
    () => new Transition('0.3s', 'ease', '0.2s').totalTime,
    () => new TransitionList('opacity 0.1s, transform 0.7s 0.1s').map(t => t.scale(3)),
    () => new LinearGradient(33.3, ['red', 'blue']).reverse(),
    () => new LinearGradient(33.3, ['red', 'blue']).reverse().reverse(),
    () => new LinearGradient(0.1, ['red', 'blue']).rotate(0.2),
    () => new LinearGradient(1e-7, [['red', '33.4%'], 'blue']).reverse(),
    () => new LinearGradient(-0.7, ['red', 'blue']).rotate(-1e-7),
    () => new LinearGradient('linear-gradient(0.33turn, red, blue)'),
    () => new LinearGradient('linear-gradient(1.1rad, red 66.6%, blue)').reverse(),
    () => new RadialGradient({ shape: 'circle' }, [['red', '66.6%'], 'blue']).reverse(),
    () => new Border({ width: new Dimension(0.1, 'rem').scale(3), style: 'solid', color: 'red' }),
    () =>
      typographies()[0]!.with({ fontSize: new Dimension(0.1, 'rem').scale(3), lineHeight: 1e-7 }),
  ];

  const insane = /NaN|Infinity|undefined|null|\d\.?e[+-]?\d|\.\d{13,}|^\s|\s$|\s{2,}|,\s*,|\(\s*,/i;

  const rows = [
    ...everyValue,
    ...derived.map(
      make => [String(make).replace(/^\(\) =>\s*/, ''), make] as [string, () => unknown],
    ),
  ];

  test.each(rows)('%s', (_label, make) => {
    const value = make();
    expect(String(value)).not.toMatch(insane);
    expect(String(value)).not.toBe('');
    expect(JSON.stringify(value)).not.toMatch(insane);
  });

  test('the noise-prone results print exactly', () => {
    expect(derived.slice(0, 3).map(make => String(make()))).toEqual(['0.3rem', '0.3rem', '0.2rem']);
    expect(String(new Dimension(1e21, 'px').scale(10))).toBe(`1${'0'.repeat(22)}px`);
    expect(String(new Dimension(1e-7, 'px').scale(0.1))).toBe('0.00000001px');
  });
});

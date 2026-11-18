import { describe, expect, test } from 'bun:test';

import { group } from '../builders.js';
import { CssVars } from '../Generators/CssVars.js';
import { resolveReferences } from '../resolve.js';
import { Teikn } from '../Teikn.js';
import type { Token } from '../Token.js';
import { BoxShadow } from '../TokenTypes/BoxShadow.js';
import { Color } from '../TokenTypes/Color/index.js';
import { CubicBezier } from '../TokenTypes/CubicBezier.js';
import { Dimension } from '../TokenTypes/Dimension.js';
import { Duration } from '../TokenTypes/Duration.js';
import { validate } from '../validate.js';
import { parseDtcg } from './parse.js';
import { serializeDtcg } from './serialize.js';
import type { DtcgDocument } from './types.js';

// DTCG → teikn → DTCG.
const rt = (doc: unknown): any => serializeDtcg(parseDtcg(doc as DtcgDocument));

// teikn → DTCG → teikn → DTCG must be a fixed point; returns the document.
const stable = (tokens: Token[]): any => {
  const once = serializeDtcg(tokens);
  expect(serializeDtcg(parseDtcg(once))).toEqual(once);

  return once;
};

// teikn → DTCG → teikn.
const reparse = (tokens: Token[]): Token[] => parseDtcg(serializeDtcg(tokens));

const css = (tokens: Token[]): string =>
  new Teikn({ generators: [new CssVars({ version: 'test' })] })
    .generateToStrings(tokens)
    .get('tokens.css')!;

const srgb = (r: number, g: number, b: number) => ({ colorSpace: 'srgb', components: [r, g, b] });
const px = (value: number) => ({ value, unit: 'px' });
const first = (doc: unknown): any => parseDtcg(doc as DtcgDocument)[0]!;

describe('tokens emitted without a $type reparse to the same values', () => {
  test('a border whose colour is inexpressible keeps its Dimension width', () => {
    const tokens = group('border', {
      a: { width: new Dimension(1, 'px'), style: 'solid', color: 'currentColor' },
    } as any);
    const [back] = reparse(tokens) as any[];

    expect(back.type).toBe('border');
    expect(back.value.width).toBeInstanceOf(Dimension);
    expect(String(back.value.width)).toBe('1px');
    expect(back.value.color).toBe('currentColor');
    expect(css([back])).toBe(css(tokens));
  });

  test('typed mode values under an inexpressible main value', () => {
    const tokens: Token[] = [
      {
        name: 'line',
        group: 'color',
        type: 'color',
        value: 'currentColor',
        modes: { dark: new Color('#333333') },
      },
      {
        name: 'gap',
        group: 'spacing',
        type: 'spacing',
        value: 'calc(1px + 1rem)',
        modes: { compact: new Dimension(4, 'px') },
      },
    ];
    const [line, gap] = reparse(tokens) as any[];

    expect(line.modes.dark).toBeInstanceOf(Color);
    expect(gap.modes.compact).toBeInstanceOf(Dimension);
    expect(css([line, gap])).toBe(css(tokens));
  });

  test('a mode of another type than the token is still recognised by shape', () => {
    const [back] = reparse([
      {
        name: 'a',
        type: 'color',
        value: new Color('#ff0000'),
        modes: { x: new Dimension(1, 'px') },
      },
    ]) as any[];
    expect(back.modes.x).toBeInstanceOf(Dimension);
  });

  test('a composite of a teikn-only type keeps its first-class fields', () => {
    const tokens = group('heading', {
      h1: {
        fontFamily: 'Inter',
        fontSize: new Dimension(32, 'px'),
        color: new Color('#ff0000'),
        speed: new Duration(200, 'ms'),
      },
    } as any);
    const [back] = reparse(tokens) as any[];

    expect(back.type).toBe('heading');
    expect(back.value.fontSize).toBeInstanceOf(Dimension);
    expect(back.value.color).toBeInstanceOf(Color);
    expect(back.value.speed).toBeInstanceOf(Duration);
    expect(String(back.value.speed)).toBe('200ms');
    expect(css([back])).toBe(css(tokens));
  });
});

describe('arrays of first-class values', () => {
  test('a token-level array serialises each element', () => {
    const doc = stable([
      { name: 'pad', type: 'spacing', value: [new Dimension(1, 'px'), new Dimension(2, 'rem')] },
    ] as any);
    expect(doc.pad.$value).toEqual([px(1), { value: 2, unit: 'rem' }]);
    expect('$type' in doc.pad).toBe(false);

    const [back] = parseDtcg(doc) as any[];
    expect(back.type).toBe('spacing');
    expect(back.value.map(String)).toEqual(['1px', '2rem']);
    expect(back.value[0]).toBeInstanceOf(Dimension);
  });

  test('dashArray inside a border composite', () => {
    const doc = stable([
      {
        name: 'b',
        type: 'border',
        value: {
          width: new Dimension(1, 'px'),
          color: new Color('#000000'),
          style: { dashArray: [new Dimension(2, 'px'), new Dimension(4, 'px')], lineCap: 'round' },
        },
      },
    ] as any);
    expect(doc.b.$value.style).toEqual({ dashArray: [px(2), px(4)], lineCap: 'round' });

    const [back] = parseDtcg(doc) as any[];
    expect(back.value.style.dashArray[1]).toBeInstanceOf(Dimension);
  });
});

describe('parsed tokens run through the pipeline', () => {
  const doc = {
    color: {
      $type: 'color',
      brand: { primary: { $value: srgb(0.2, 0.4, 1) } },
      surface: { $value: '{color.brand.primary}' },
    },
    spacing: { $type: 'dimension', sm: { $value: px(4) } },
    card: {
      $type: 'border',
      $value: { width: '{spacing.sm}', style: 'solid', color: '{color.brand.primary}' },
    },
  };

  test('a nested path splits into a dot-free group and name', () => {
    const tokens = parseDtcg(doc);
    expect(tokens.map(t => [t.group, t.name])).toEqual([
      ['color', 'brand-primary'],
      ['color', 'surface'],
      ['spacing', 'sm'],
      [undefined, 'card'],
    ]);
    expect(tokens[1]!.value).toBe('{color.brand-primary}');
    expect((tokens[3]!.value as any).color).toBe('{color.brand-primary}');
    expect(validate(tokens).issues.filter(i => i.severity === 'error')).toEqual([]);
  });

  test.each([undefined, '-', '/', '_'])(
    'separator %p: CssVars output and round trip',
    separator => {
      const tokens = parseDtcg(doc, separator === undefined ? undefined : { separator });
      const out = css(tokens);

      expect(out).not.toContain('color-color');
      expect(out).toContain('--color-brand-primary: ');
      expect(out).toContain('--color-surface: ');
      expect(serializeDtcg(tokens)).toEqual(doc as any);
    },
  );

  test('a renamed token no longer serialises to its old path', () => {
    const [primary] = parseDtcg(doc);
    const out = serializeDtcg([{ ...primary!, name: 'main' }]) as any;
    expect(out.color.main.$value).toEqual(srgb(0.2, 0.4, 1));
  });

  test('a copied token keeps its document path', () => {
    expect(serializeDtcg(parseDtcg(doc).map(token => ({ ...token })))).toEqual(doc as any);
  });
});

describe('$ref and $extends', () => {
  const blue = { $type: 'color', $value: srgb(0, 0, 1) };

  test('a $ref to another token’s $value is an alias', () => {
    const tokens = parseDtcg({
      colors: { blue, primary: { $ref: '#/colors/blue/$value', $type: 'color' } },
      'a/b': { 'c~d': blue },
      esc: { $ref: '#/a~1b/c~0d/$value' },
    } as any);

    expect(tokens.map(t => t.name)).toEqual(['blue', 'primary', 'c~d', 'esc']);
    expect(tokens[1]!.value).toBe('{colors.blue}');
    expect(tokens[1]!.type).toBe('color');
    expect(tokens[3]!.value).toBe('{a/b.c~d}');
    expect(tokens[3]!.type).toBe('color');
    expect(String(resolveReferences(tokens)[1]!.value)).toBe('rgb(0, 0, 255)');
  });

  test.each([
    '#/colors/blue/$value/components/0',
    '#/colors/blue',
    'other.json#/colors/blue/$value',
  ])('an unsupported $ref %p throws', $ref => {
    expect(() => parseDtcg({ colors: { blue, primary: { $ref } } } as any)).toThrow(
      /\$ref.*not supported.*colors\.primary/,
    );
  });

  test('a $ref inside a value throws', () => {
    const doc = {
      a: { $type: 'color', $value: { colorSpace: 'srgb', components: [{ $ref: '#/b' }, 0, 1] } },
    };
    expect(() => parseDtcg(doc as any)).toThrow(/\$ref.*not supported.*"a"/);
  });

  test('$extends throws', () => {
    const doc = { button: { bg: blue }, primary: { $extends: '{button}', fg: blue } };
    expect(() => parseDtcg(doc as any)).toThrow(/\$extends.*not supported.*"primary"/);
  });
});

describe('alias paths follow the emitted keys', () => {
  const c = new Color('#3366ff');
  const tokens: Token[] = [
    { group: 'color', name: 'primary', type: 'color', value: c },
    { group: 'surface', name: 'bg', type: 'color', value: '{color.primary}' },
    { group: 'surface', name: 'fg', type: 'color', value: c, link: 'color.primary' },
    { group: 'surface', name: 'bare', type: 'color', value: '{primary}' },
  ];

  test.each([
    [{ hierarchical: false, separator: '/' }, 'color/primary', '{color/primary}'],
    [{ hierarchical: false, separator: '-' }, 'color-primary', '{color-primary}'],
    [{ separator: '/' }, 'color', '{color.primary}'],
    [{}, 'color', '{color.primary}'],
  ])('%p', (options, key, alias) => {
    const doc = serializeDtcg(tokens, options) as any;
    const values = JSON.stringify(doc).match(/"\{[^"]+\}"/g);

    expect(key in doc).toBe(true);
    expect(values).toEqual([`"${alias}"`, `"${alias}"`, `"${alias}"`]);
  });
});

describe('values of a type teikn does not own are left alone', () => {
  test.each([
    [{ grid: { $type: 'grid', $value: { gutter: '16px', columns: 12, speed: '2s', w: '50%' } } }],
    [{ grid: { $value: { gutter: '16px', speed: '200ms' } } }],
    [{ grid: { $type: 'grid', $value: { gutter: px(16), tags: ['a', '1px'], n: [1, 0, 1, 1] } } }],
    [{ grid: { $type: 'grid', $value: { odd: { value: 1, unit: 'px', note: 'x' } } } }],
  ])('%j keeps its value unchanged', doc => {
    // An unknown `$type` itself moves to `$extensions.teikn.type` (by design).
    expect(rt(doc).grid.$value).toEqual(doc.grid.$value);
    expect(rt(rt(doc))).toEqual(rt(doc));
  });

  test('string fields stay strings in the token', () => {
    expect(first({ grid: { $type: 'grid', $value: { gutter: '16px' } } }).value).toEqual({
      gutter: '16px',
    });
  });
});

describe('teikn type names survive', () => {
  // [authored value, how it prints once reparsed]
  const values: Record<string, [unknown, string]> = {
    spacing: [new Dimension(4, 'px'), '4px'],
    size: ['4px', '4px'],
    'border-radius': [new Dimension(4, 'px'), '4px'],
    breakpoint: [new Dimension(40, 'rem'), '40rem'],
    'font-size': [new Dimension(12, 'px'), '12px'],
    'letter-spacing': [new Dimension(0.1, 'em'), '0.1em'],
    'line-height': [1.5, '1.5'],
    opacity: [0.5, '0.5'],
    'z-layer': [3, '3'],
    'z-index': [10, '10'],
    'font-family': ['Inter', 'Inter'],
    'font-weight': [700, '700'],
    timing: [new CubicBezier(0.4, 0, 1, 1), String(new CubicBezier(0.4, 0, 1, 1))],
    easing: [new CubicBezier(0.4, 0, 1, 1), String(new CubicBezier(0.4, 0, 1, 1))],
    'font-style': ['italic', 'italic'],
    brand: [new Color('#ff0000'), String(new Color('#ff0000'))],
    elevation: [
      new BoxShadow({ offsetY: 1, blur: 2, color: new Color('#000000') }),
      String(new BoxShadow({ offsetY: 1, blur: 2, color: new Color('#000000') })),
    ],
  };

  test.each(Object.keys(values))('%s', type => {
    const [value, printed] = values[type]!;
    const [back] = parseDtcg(stable([{ name: 'a', group: type, type, value }] as Token[]));

    expect(back!.type).toBe(type);
    expect(String(back!.value)).toBe(printed);
  });

  test('a document’s own DTCG type names gain no extension', () => {
    const doc = { a: { $type: 'dimension', $value: px(1) }, b: { $type: 'number', $value: 1 } };
    expect(rt(doc)).toEqual(doc);
  });
});

describe('names and types that are not plain keys', () => {
  test.each(['$brand', 'g.$x', 'g.$type', 'g.$value'])('serialising %p throws', name => {
    expect(() => serializeDtcg([{ name, type: 'number', value: 1 }])).toThrow(
      /must not start with "\$"/,
    );
  });

  test('a `$`-prefixed group throws; `$root` does not', () => {
    expect(() => serializeDtcg([{ name: 'a', group: '$g', type: 'number', value: 1 }])).toThrow(
      /must not start with "\$"/,
    );
    expect(() => serializeDtcg([{ name: 'g.$root', type: 'number', value: 1 }])).not.toThrow();
  });

  test.each(['constructor', 'toString', '__proto__', 'hasOwnProperty'])(
    'a $type of %p stays a string',
    $type => {
      const doc = { a: { $type, $value: 'x' } };
      const [token] = parseDtcg(doc);

      expect(token!.type).toBe($type);
      expect(token!.value).toBe('x');
      expect(parseDtcg(rt(doc))[0]!.type).toBe($type);
    },
  );
});

describe('extension data teikn does not understand', () => {
  test.each([['dark'], [3], [['dark', 'light']], [true]])('a foreign `mode` of %p', mode => {
    const doc = { a: { $type: 'number', $value: 1, $extensions: { mode, other: 1 } } };
    expect(first(doc).modes).toBeUndefined();
    expect(rt(doc)).toEqual(doc);
  });
});

describe('group $deprecated is inherited', () => {
  const doc = {
    old: {
      $deprecated: 'Use new',
      $type: 'number',
      a: { $value: 1 },
      b: { $value: 2, $description: 'B' },
      kept: { $value: 3, $deprecated: false },
      own: { $value: 4, $deprecated: true },
      deep: { c: { $value: 5 } },
    },
    fresh: { $type: 'number', $value: 6 },
  };

  test('children and grandchildren are deprecated; an explicit false opts out', () => {
    expect(parseDtcg(doc as any).map(t => [t.name, t.deprecated])).toEqual([
      ['a', true],
      ['b', true],
      ['kept', undefined],
      ['own', true],
      ['deep-c', true],
      ['fresh', undefined],
    ]);
  });

  // The group keeps its own `$deprecated`; its tokens gain nothing in the document.
  test('the document still round-trips', () => {
    const grouped = { old: { $deprecated: true, $type: 'number', a: { $value: 1 } } };
    expect(rt(grouped)).toEqual(grouped);
  });
});

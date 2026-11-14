import { describe, expect, test } from 'bun:test';

import { composite, group } from '../builders.js';
import { Dtcg } from '../Generators/Dtcg.js';
import { resolveReferences } from '../resolve.js';
import { Teikn } from '../Teikn.js';
import type { Token } from '../Token.js';
import { Border } from '../TokenTypes/Border.js';
import { BoxShadow, BoxShadowList } from '../TokenTypes/BoxShadow.js';
import { Color } from '../TokenTypes/Color/index.js';
import { CubicBezier } from '../TokenTypes/CubicBezier.js';
import { Dimension } from '../TokenTypes/Dimension.js';
import { Duration } from '../TokenTypes/Duration.js';
import { LinearGradient } from '../TokenTypes/Gradient.js';
import { Transition } from '../TokenTypes/Transition.js';
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

const srgb = (r: number, g: number, b: number) => ({ colorSpace: 'srgb', components: [r, g, b] });
const px = (value: number) => ({ value, unit: 'px' });
const colorDoc = ($value: unknown) => ({ c: { $type: 'color', $value } });
const first = (doc: unknown): any => parseDtcg(doc as DtcgDocument)[0]!;

describe('1. colour spaces', () => {
  test.each([
    ['hsl', [120, 100, 50], 'hsl', [0, 255, 0]],
    ['oklch', [0.7, 0.15, 150], 'oklch', [76, 184, 106]],
    ['oklab', [0.7, -0.1, 0.1], 'oklab', null],
    ['lab', [50, 20, -30], 'lab', null],
    ['lch', [50, 30, 270], 'lch', null],
    ['xyz-d65', [0.2, 0.3, 0.4], 'xyz', null],
  ])(
    '%s parses in its own space and round-trips unchanged',
    (colorSpace, components, space, rgb) => {
      const doc = colorDoc({ colorSpace, components });
      const { value } = first(doc);
      expect(value).toBeInstanceOf(Color);
      expect(value.space).toBe(space);

      if (rgb) {
        expect(value.asRGB().map(Math.round)).toEqual(rgb);
      }

      expect(rt(doc)).toEqual(doc);
    },
  );

  test.each(['display-p3', 'a98-rgb', 'rec2020', 'prophoto-rgb', 'srgb-linear', 'hwb', 'xyz-d50'])(
    '%s is kept as the raw DTCG object, never relabelled srgb',
    colorSpace => {
      const doc = colorDoc({ colorSpace, components: [1, 0, 0], alpha: 0.5 });
      expect(first(doc).value).toEqual(doc.c.$value);
      expect(rt(doc)).toEqual(doc);
    },
  );

  test('"none" converts as 0 and, like `hex`, survives the round trip', () => {
    const doc = colorDoc({ colorSpace: 'hsl', components: ['none', 0, 100], hex: '#ffffff' });
    expect(first(doc).value.asHSL()).toEqual([0, 0, 1]);
    expect(rt(doc)).toEqual(doc);
  });

  test('"none" is preserved on pass-through', () => {
    const doc = colorDoc({ colorSpace: 'display-p3', components: [1, 'none', 0] });
    expect(rt(doc)).toEqual(doc);
  });

  test('float sRGB components are not quantised to 8-bit', () => {
    const doc = colorDoc(srgb(0.1234, 0.2, 1));
    expect(first(doc).value.asRGB()).toEqual([31.467, 51, 255]);
    expect(rt(doc)).toEqual(doc);
  });

  test('a color inside a composite keeps its space', () => {
    const doc = {
      b: {
        $type: 'border',
        $value: {
          color: { colorSpace: 'oklch', components: [0.7, 0.15, 150] },
          width: px(1),
          style: 'solid',
        },
      },
    };
    expect(rt(doc)).toEqual(doc);
  });

  test('a teikn colour serialises in its native space', () => {
    const doc = stable(
      group('color', {
        hsl: new Color('hsl(120, 100%, 50%)'),
        oklch: Color.fromOklch(0.7, 0.15, 150),
        rgb: new Color('#ff0000'),
      }),
    );
    expect(doc.color.hsl.$value).toEqual({ colorSpace: 'hsl', components: [120, 100, 50] });
    expect(doc.color.oklch.$value).toEqual({ colorSpace: 'oklch', components: [0.7, 0.15, 150] });
    expect(doc.color.rgb.$value).toEqual(srgb(1, 0, 0));
  });

  test('a transformed colour drops the parsed source and re-serialises itself', () => {
    const { value } = first(colorDoc({ ...srgb(1, 0, 0), hex: '#ff0000' }));
    const doc = serializeDtcg([{ name: 'c', type: 'color', value: value.setAlpha(0.5) }]) as any;
    expect(doc.c.$value).toEqual({ ...srgb(1, 0, 0), alpha: 0.5 });
  });
});

describe('2. gradient stop positions', () => {
  const positions = (stops: any[]) => {
    const doc = stable(group('gradient', { g: new LinearGradient(90, stops) }));

    return doc.gradient.g.$value.map((stop: any) => stop.position);
  };

  test('unpositioned stops are distributed evenly', () => {
    expect(positions(['red', 'green', 'blue'])).toEqual([0, 0.5, 1]);
    expect(positions(['red'])).toEqual([0]);
  });

  test('unpositioned stops interpolate between their positioned neighbours', () => {
    expect(positions(['red', ['green', '20%'], 'blue', 'white', ['black', '80%'], 'red'])).toEqual([
      0, 0.2, 0.4, 0.6, 0.8, 1,
    ]);
  });

  test('a non-percent position throws instead of becoming a fraction', () => {
    expect(() => positions([['red', '10px']])).toThrow(/"10px" cannot be expressed/);
  });

  test('positions keep full precision on parse', () => {
    const doc = {
      g: {
        $type: 'gradient',
        $value: [
          { color: srgb(1, 0, 0), position: 0.125 },
          { color: srgb(0, 0, 1), position: 0.07 },
        ],
      },
    };
    expect(first(doc).value.stops.map((s: any) => s.position)).toEqual(['12.5%', '7%']);
    expect(rt(doc)).toEqual(doc);
  });
});

describe('3. gradient aliases', () => {
  test('a shared stop colour serialises as an alias that parses back', () => {
    const ink = new Color('#111111');
    const doc = stable([
      ...group('color', { ink }),
      ...group('gradient', { g: new LinearGradient(90, [ink, 'blue']) }),
    ]);
    expect(doc.gradient.g.$value[0].color).toBe('{color.ink}');

    const gradient = parseDtcg(doc).find(t => t.type === 'gradient')!.value as LinearGradient;
    expect(gradient).toBeInstanceOf(LinearGradient);
    expect(gradient.stops[0]!.color).toBe('{color.ink}');
  });

  test('a parsed stop-colour alias resolves against the colour token', () => {
    const tokens = resolveReferences(
      parseDtcg({
        color: { $type: 'color', ink: { $value: srgb(1, 0, 0) } },
        g: { $type: 'gradient', $value: [{ color: '{color.ink}', position: 0 }] },
      }),
    );
    expect(String(tokens[1]!.value)).toContain('rgb(255, 0, 0)');
  });

  test('an aliased position or whole-stop alias keeps the raw value', () => {
    const doc = {
      g: {
        $type: 'gradient',
        $value: [{ color: '{color.a}', position: '{stop.mid}' }, '{gradient.rest}'],
      },
    };
    expect(first(doc).value).toEqual(doc.g.$value);
    expect(rt(doc)).toEqual(doc);
  });
});

const shadowDoc = (overrides: object = {}) => ({
  s: {
    $type: 'shadow',
    $value: {
      color: srgb(0, 0, 0),
      offsetX: px(0),
      offsetY: { value: 0.5, unit: 'rem' },
      blur: { value: 1, unit: 'rem' },
      spread: px(0),
      ...overrides,
    },
  },
});

describe('4. shadow units and aliases', () => {
  test('the unit is carried into BoxShadow', () => {
    const shadow = first(shadowDoc()).value;
    expect(shadow).toBeInstanceOf(BoxShadow);
    expect(shadow.unit).toBe('rem');
    expect(String(shadow)).toBe('0 0.5rem 1rem rgb(0, 0, 0)');
    expect(rt(shadowDoc()).s.$value.blur).toEqual({ value: 1, unit: 'rem' });
  });

  test('mixed non-zero units are a clear error', () => {
    expect(() => parseDtcg(shadowDoc({ blur: px(1) }) as DtcgDocument)).toThrow(
      /mixes length units \(rem, px\)/,
    );
  });

  test('a colour alias is kept as a BoxShadow ref field', () => {
    const doc = shadowDoc({ color: '{color.ink}' });
    expect(first(doc).value).toBeInstanceOf(BoxShadow);
    expect(first(doc).value.color).toBe('{color.ink}');
    expect(rt(doc).s.$value.color).toBe('{color.ink}');
  });

  test('a dimension alias keeps the raw composite (no NaN)', () => {
    const doc = shadowDoc({ blur: '{spacing.sm}' });
    expect(first(doc).value).toEqual(doc.s.$value);
    expect(rt(doc)).toEqual(doc);
  });

  test('an alias element in a shadow array keeps the raw array', () => {
    const doc = { s: { $type: 'shadow', $value: ['{shadow.a}', shadowDoc().s.$value] } };
    expect(first(doc).value).toEqual(doc.s.$value);
    expect(rt(doc)).toEqual(doc);
  });

  test('a shadow whose colour space is unrepresentable keeps the raw composite', () => {
    const doc = shadowDoc({ color: { colorSpace: 'display-p3', components: [1, 0, 0] } });
    expect(rt(doc)).toEqual(doc);
  });
});

describe('5. inset', () => {
  test('is emitted and read back', () => {
    const doc = stable(
      group('shadow', {
        in: new BoxShadow({ offsetY: 1, inset: true }),
        out: new BoxShadow({ offsetY: 1 }),
        list: new BoxShadowList([new BoxShadow({ offsetY: 1, inset: true })]),
      }),
    );
    expect(doc.shadow.in.$value.inset).toBe(true);
    expect('inset' in doc.shadow.out.$value).toBe(false);
    expect(doc.shadow.list.$value[0].inset).toBe(true);
    expect(first(shadowDoc({ inset: true })).value.inset).toBe(true);
    expect(first(shadowDoc()).value.inset).toBe(false);
  });
});

describe('6. units DTCG cannot express', () => {
  test('an em shadow throws instead of being relabelled px', () => {
    expect(() => serializeDtcg(group('shadow', { s: new BoxShadow('0 0.5em 1em #000') }))).toThrow(
      /box-shadow in "em".*only px and rem/,
    );
    expect(() => serializeDtcg(group('shadow', { s: '0 0.5em 1em #000' }))).toThrow(/"em"/);
  });

  test('rem shadows serialise in rem', () => {
    const doc = stable(group('shadow', { s: new BoxShadow('0 0.5rem 1rem #000') }));
    expect(doc.shadow.s.$value.offsetY).toEqual({ value: 0.5, unit: 'rem' });
  });
});

describe('7. root-level $type', () => {
  test('is inherited like a group $type', () => {
    const token = first({ $type: 'color', a: { $value: srgb(1, 0, 0) } });
    expect(token.type).toBe('color');
    expect(token.value).toBeInstanceOf(Color);
  });
});

describe('8. alias types', () => {
  const doc = {
    color: { a: { $type: 'color', $value: srgb(1, 0, 0) } },
    b: { $value: '{color.a}' },
    c: { $value: '{b}' },
    d: { $value: '{e}' },
    e: { $value: '{d}' },
  };

  test('an alias takes the type of its target, through chains', () => {
    const types = Object.fromEntries(parseDtcg(doc).map(t => [t.name, t.type]));
    expect(types).toMatchObject({ b: 'color', c: 'color' });
  });

  test('a cycle or dangling alias stays untyped without looping', () => {
    const types = Object.fromEntries(parseDtcg(doc).map(t => [t.name, t.type]));
    expect(types).toMatchObject({ d: 'unknown', e: 'unknown' });
    expect(first({ x: { $value: '{nowhere}' } }).type).toBe('unknown');
  });

  test('$type "unknown" is never emitted', () => {
    expect(rt({ a: { $value: 12 } })).toEqual({ a: { $value: 12 } });
    expect(JSON.stringify(rt(doc))).not.toContain('unknown');
    expect(rt(doc).d).toEqual({ $value: '{e}' });
  });
});

describe('9. string values under structured types', () => {
  test('parseable CSS strings become structured DTCG values', () => {
    const doc = stable([
      ...group('easing', { std: 'ease-in-out' }),
      ...group('duration', { a: '.2s' }),
      ...group('shadow', { s: '0 1px 2px rgba(0,0,0,.2)', two: '0 1px red, inset 0 2px blue' }),
      ...group('gradient', { g: 'linear-gradient(90deg, red, blue)' }),
      ...group('transition', { a: 'opacity .2s ease-in-out' }),
      ...group('border', { a: '1px solid #000' }),
      ...group('color', { c: '#ff0000' }),
    ]);

    expect(doc.easing).toEqual({ std: { $value: [0.42, 0, 0.58, 1] }, $type: 'cubicBezier' });
    expect(doc.duration.a.$value).toEqual({ value: 0.2, unit: 's' });
    expect(doc.shadow.s.$value.blur).toEqual(px(2));
    expect(doc.shadow.s.$value.color).toEqual({ ...srgb(0, 0, 0), alpha: 0.2 });
    expect(doc.shadow.two.$value).toHaveLength(2);
    expect(doc.shadow.two.$value[1].inset).toBe(true);
    expect(doc.gradient.g.$value.map((s: any) => s.position)).toEqual([0, 1]);
    expect(doc.transition.a.$value).toEqual({
      duration: { value: 0.2, unit: 's' },
      timingFunction: [0.42, 0, 0.58, 1],
      property: 'opacity',
    });
    expect(doc.border.a.$value).toEqual({ width: px(1), style: 'solid', color: srgb(0, 0, 0) });
    expect(doc.color.c.$value).toEqual(srgb(1, 0, 0));
  });

  test.each([
    ['color', 'currentColor'],
    ['spacing', 'calc(1px + 2px)'],
    ['typography', 'bold 16px/1.5 Arial'],
    ['duration', 200],
    ['transition', 'none'],
    ['shadow', 'none'],
    ['gradient', 'url(x.png)'],
    ['easing', 'steps(4)'],
  ])('an inexpressible %s value (%p) is emitted with no $type', (type, value) => {
    const doc = stable(group(type, { a: value }));
    expect(doc[type].a).toEqual({ $value: value, $extensions: { teikn: { type } } });
    expect('$type' in doc[type]).toBe(false);

    // …and the teikn type name still comes back.
    expect(parseDtcg(doc)[0]).toMatchObject({ type, value });
  });

  test('parse never runs a composite converter on a non-object', () => {
    const tokens = parseDtcg({
      a: { $type: 'border', $value: 'thick wavy' },
      b: { $type: 'typography', $value: 'bold 16px Arial' },
      c: { $type: 'transition', $value: 'none' },
      d: { $type: 'gradient', $value: 'nope' },
      e: { $type: 'shadow', $value: 'none' },
      f: { $type: 'cubicBezier', $value: 'steps(4)' },
      g: { $type: 'color', $value: 'currentColor' },
      h: { $type: 'transition', $value: ['{a}'] },
      i: { $type: 'dimension', $value: 16 },
    } as DtcgDocument);

    expect(tokens.map(t => t.value)).toEqual([
      'thick wavy',
      'bold 16px Arial',
      'none',
      'nope',
      'none',
      'steps(4)',
      'currentColor',
      ['{a}'],
      16,
    ]);
  });

  test('older-draft string values parse into first-class values', () => {
    const [color, duration, dimension, easing, shadow, border] = parseDtcg({
      a: { $type: 'color', $value: '#ff0000' },
      b: { $type: 'duration', $value: '200ms' },
      c: { $type: 'dimension', $value: '16px' },
      d: { $type: 'cubicBezier', $value: 'ease-in-out' },
      e: { $type: 'shadow', $value: '0 1px 2px #000' },
      f: { $type: 'border', $value: '1px solid #000' },
    }).map(t => t.value);

    expect(color).toBeInstanceOf(Color);
    expect(duration).toBeInstanceOf(Duration);
    expect(dimension).toBeInstanceOf(Dimension);
    expect(easing).toBeInstanceOf(CubicBezier);
    expect(shadow).toBeInstanceOf(BoxShadow);
    expect(border).toBeInstanceOf(Border);
  });
});

describe('10. $type follows the value', () => {
  test('first-class values get their DTCG type under any type name', () => {
    const doc = stable([
      ...group('elevation', { a: new BoxShadow({ offsetY: 1 }) }),
      ...group('box-shadow', { a: new BoxShadow({ offsetY: 1 }) }),
      ...group('motion', { a: new Duration(100, 'ms'), b: new Transition('100ms', 'ease') }),
      ...group('brand', { a: new Color('#f00') }),
      ...group('border-width', { a: new Dimension(1, 'px') }),
      ...group('radius', { a: new Dimension(4, 'px') }),
      ...group('fontSize', { a: new Dimension(1, 'rem') }),
    ]);

    expect(doc.elevation.$type).toBe('shadow');
    expect(doc['box-shadow'].$type).toBe('shadow');
    expect(doc.motion.a.$type).toBe('duration');
    expect(doc.motion.b.$type).toBe('transition');
    expect(doc.brand.$type).toBe('color');
    expect(doc['border-width'].$type).toBe('dimension');
    expect(doc.radius.$type).toBe('dimension');
    expect(doc.fontSize.$type).toBe('dimension');
  });

  test('a type name is not forced onto a value of another kind', () => {
    const doc = stable(
      group('line-height', { a: new Dimension(24, 'px'), b: '24px', c: 1.5, d: '1.5' }),
    );
    expect(doc['line-height'].a).toMatchObject({ $value: px(24), $type: 'dimension' });
    expect(doc['line-height'].b).toMatchObject({ $value: px(24), $type: 'dimension' });
    expect(doc['line-height'].c).toEqual({ $value: 1.5, $type: 'number' });
    expect(doc['line-height'].d).toEqual({ $value: 1.5, $type: 'number' });
  });

  test('a type name with no DTCG equivalent emits no $type', () => {
    const doc = stable(group('aspect-ratio', { wide: '16/9' }));
    expect(doc['aspect-ratio']).toEqual({
      wide: { $value: '16/9', $extensions: { teikn: { type: 'aspect-ratio' } } },
    });
  });

  test('the teikn type name is restored on parse', () => {
    const tokens = parseDtcg(
      serializeDtcg([
        ...group('elevation', { a: new BoxShadow({ offsetY: 1 }) }),
        ...group('line-height', { a: new Dimension(24, 'px') }),
        ...group('aspect-ratio', { wide: '16/9' }),
      ]),
    );
    expect(tokens.map(t => t.type)).toEqual(['elevation', 'line-height', 'aspect-ratio']);
    expect(tokens[0]!.value).toBeInstanceOf(BoxShadow);
    expect(tokens[1]!.value).toBeInstanceOf(Dimension);
  });

  test('a plain composite keeps its DTCG type, and the recorded name, to stay serialisable', () => {
    const doc = stable(group('motion', { fade: new Transition('100ms', 'ease') }));
    const [token] = parseDtcg(doc) as any[];
    expect(token.type).toBe('transition');
    expect(token.extensions).toEqual({ teikn: { type: 'motion' } });
  });

  test('an alias under a teikn-only type name round-trips', () => {
    const doc = stable([
      ...group('color', { ink: new Color('#111111') }),
      { name: 'text', group: 'brand', type: 'brand', value: '{color.ink}' },
    ]);
    expect(doc.brand.text).toEqual({
      $value: '{color.ink}',
      $extensions: { teikn: { type: 'brand' } },
    });
  });

  test('mapTypes: false leaves the recorded type in $extensions', () => {
    const doc = serializeDtcg(group('elevation', { a: new BoxShadow({ offsetY: 1 }) }));
    const tokens = parseDtcg(doc, { mapTypes: false });
    expect(tokens[0]!.type).toBe('shadow');
    expect(serializeDtcg(tokens)).toEqual(doc);
  });

  test('an untyped token never inherits a hoisted group $type', () => {
    const doc = stable(group('spacing', { a: '4px', b: 'calc(1px + 2px)' }));
    expect('$type' in doc.spacing).toBe(false);
    expect(doc.spacing.a.$type).toBe('dimension');
    expect('$type' in doc.spacing.b).toBe(false);
  });

  test('the Dtcg generator emits only DTCG type names', () => {
    const out = new Teikn({ generators: [new Dtcg()] })
      .generateToStrings([
        ...group('elevation', { card: new BoxShadow({ offsetY: 1 }) }),
        ...group('aspect-ratio', { wide: '16/9' }),
        ...group('border-width', { thin: new Dimension(1, 'px') }),
      ])
      .get('tokens.tokens.json')!;
    const doc = JSON.parse(out);

    expect(doc['elevation-card'].$type).toBe('shadow');
    expect(doc['elevation-card'].$extensions).toEqual({ teikn: { type: 'elevation' } });
    expect('$type' in doc['aspect-ratio-wide']).toBe(false);
    expect(doc['border-width-thin'].$type).toBe('dimension');
  });
});

describe('11. __proto__ path segments', () => {
  test('serialize keeps them as plain keys and does not pollute Object.prototype', () => {
    const doc = serializeDtcg([
      { name: '__proto__.x', value: 1, type: 'number' },
      { name: 'constructor.prototype.y', value: 2, type: 'number' },
    ]);

    expect(({} as any).x).toBeUndefined();
    expect(({} as any).y).toBeUndefined();
    expect(Object.keys(doc)).toEqual(['__proto__', 'constructor']);

    const json = JSON.stringify(doc);
    expect(json).toBe(
      '{"__proto__":{"x":{"$value":1},"$type":"number"},' +
        '"constructor":{"prototype":{"y":{"$value":2}},"$type":"number"}}',
    );
    expect(parseDtcg(JSON.parse(json)).map(t => t.name)).toEqual([
      '__proto__.x',
      'constructor.prototype.y',
    ]);
  });

  test('flat output and mode names are safe too', () => {
    const doc = serializeDtcg(
      [{ name: '__proto__', value: 1, type: 'number', modes: { ['__proto__']: 2 } }],
      { hierarchical: false },
    );
    expect(JSON.stringify(doc)).toBe(
      '{"__proto__":{"$value":1,"$type":"number","$extensions":{"mode":{"__proto__":2}}}}',
    );

    // Through JSON text, as a document read from disk would be.
    const text = JSON.stringify(doc);
    const [token] = parseDtcg(JSON.parse(text));
    expect(Object.keys(token!.modes!)).toEqual(['__proto__']);
    expect(Object.getPrototypeOf(token!.modes)).toBe(Object.prototype);
  });

  test('a __proto__ composite field stays an own field', () => {
    const doc = JSON.parse(
      '{"b":{"$type":"border","$value":{"__proto__":{"value":1,"unit":"px"}}}}',
    );
    expect(Object.keys(first(doc).value)).toEqual(['__proto__']);
    expect(({} as any).value).toBeUndefined();
  });
});

describe('12. custom separator', () => {
  const doc = {
    color: {
      $type: 'color',
      a: { $value: srgb(1, 0, 0) },
      b: { $value: '{color.a}', $extensions: { mode: { dark: '{color.a}' } } },
    },
    edge: { $type: 'border', $value: { color: '{color.a}', width: px(1), style: 'solid' } },
    shade: { $type: 'shadow', $value: shadowDoc({ color: '{color.b}' }).s.$value },
  };

  test('alias paths are rewritten to the separator, everywhere', () => {
    const tokens = parseDtcg(doc, { separator: '-' });
    const byName = Object.fromEntries(tokens.map(t => [t.name, t])) as Record<string, any>;

    expect(byName['color-b'].value).toBe('{color-a}');
    expect(byName['color-b'].modes.dark).toBe('{color-a}');
    expect(byName.edge.value.color).toBe('{color-a}');
    expect(byName.shade.value.color).toBe('{color-b}');
    expect(() => resolveReferences(tokens)).not.toThrow();
    expect(String(resolveReferences(tokens)[1]!.value)).toBe('rgb(255, 0, 0)');
  });

  test('serialising with the same separator restores dotted aliases', () => {
    const out = serializeDtcg(parseDtcg(doc, { separator: '-' }), { separator: '-' }) as any;
    expect(out.color.b.$value).toBe('{color.a}');
    expect(out.color.b.$extensions.mode.dark).toBe('{color.a}');
    expect(out.edge.$value.color).toBe('{color.a}');
    expect(out.shade.$value.color).toBe('{color.b}');
  });
});

describe('13. duplicate paths', () => {
  test('the group is part of the path, so same-named tokens do not collide', () => {
    const doc = stable([
      ...group('line-height', { tight: 1.2 }),
      ...group('letter-spacing', { tight: '-0.02em' }),
    ]);
    expect(doc['line-height'].tight.$value).toBe(1.2);
    expect(doc['letter-spacing'].tight.$value).toEqual({ value: -0.02, unit: 'em' });
  });

  test('flat output keys grouped tokens by group and name', () => {
    const doc = serializeDtcg(
      [...group('line-height', { tight: 1.2 }), ...group('letter-spacing', { tight: '-0.02em' })],
      { hierarchical: false },
    );
    expect(Object.keys(doc)).toEqual(['line-height.tight', 'letter-spacing.tight']);
  });

  test('aliases and links point at the grouped path', () => {
    const ink = new Color('#111111');
    const doc = serializeDtcg([
      ...group('color', { ink }),
      ...group('shadow', { card: new BoxShadow({ offsetY: 1, color: ink }) }),
      { name: 'text', group: 'semantic', type: 'color', value: ink, link: 'ink' },
      { name: 'raw', group: 'semantic', type: 'color', value: '{color.ink}' },
    ]) as any;

    expect(doc.shadow.card.$value.color).toBe('{color.ink}');
    expect(doc.semantic.text.$value).toBe('{color.ink}');
    expect(doc.semantic.raw.$value).toBe('{color.ink}');
  });

  test('a genuine duplicate throws', () => {
    const dup: Token[] = [
      { name: 'a', value: 1, type: 'number' },
      { name: 'a', value: 2, type: 'number' },
    ];
    expect(() => serializeDtcg(dup)).toThrow(/two tokens share the path "a"/);
    expect(() => serializeDtcg(dup, { hierarchical: false })).toThrow(/share the path/);
    expect(() =>
      serializeDtcg([...group('color', { a: '#111' }), ...group('color', { a: '#222' })]),
    ).toThrow(/share the path "color.a"/);
  });

  test('the Dtcg generator does not prepend the group to prefixed names', () => {
    const out = new Teikn({ generators: [new Dtcg()] })
      .generateToStrings([
        ...group('line-height', { tight: 1.2 }),
        ...group('letter-spacing', { tight: '-0.02em' }),
      ])
      .get('tokens.tokens.json')!;
    expect(Object.keys(JSON.parse(out))).toEqual(['line-height-tight', 'letter-spacing-tight']);
  });
});

describe('14. structure preserved through DTCG → teikn → DTCG', () => {
  test('unknown token $extensions survive, alongside modes', () => {
    const doc = {
      a: {
        $type: 'color',
        $value: srgb(1, 0, 0),
        $extensions: {
          'com.figma': { variableId: 'VariableID:1:2', scopes: ['ALL_FILLS'] },
          'org.example': true,
          mode: { dark: srgb(0, 0, 0) },
        },
      },
    };
    expect((first(doc) as any).extensions).toEqual({
      'com.figma': { variableId: 'VariableID:1:2', scopes: ['ALL_FILLS'] },
      'org.example': true,
    });
    expect(rt(doc)).toEqual(doc);
  });

  test('a foreign `teikn` extension without a type is left alone', () => {
    const doc = { a: { $type: 'number', $value: 1, $extensions: { teikn: { note: 'x' } } } };
    expect(rt(doc)).toEqual(doc);
  });

  test('group and root $description / $extensions / $deprecated survive', () => {
    const doc = {
      $description: 'All tokens',
      $extensions: { 'org.example': { version: 2 } },
      color: {
        $type: 'color',
        $description: 'Palette',
        $extensions: { 'com.figma': { collection: 'c1' } },
        brand: { $deprecated: true, primary: { $value: srgb(1, 0, 0) } },
      },
    };
    expect(rt(doc)).toEqual(doc);
  });

  test('group metadata does not disturb the token list', () => {
    const tokens = parseDtcg({ g: { $description: 'x', a: { $type: 'number', $value: 1 } } });
    expect(tokens).toEqual([{ name: 'g.a', value: 1, type: 'number' }]);
    expect(Object.keys(tokens)).toEqual(['0']);
  });

  test('$root is parsed as the group’s own token and round-trips', () => {
    const doc = {
      color: {
        $type: 'color',
        accent: {
          $root: { $value: srgb(1, 0, 0) },
          light: { $value: srgb(1, 0.5, 0.5) },
          link: { $value: '{color.accent.$root}' },
        },
      },
    };
    const tokens = parseDtcg(doc);
    expect(tokens.map(t => t.name)).toEqual([
      'color.accent.$root',
      'color.accent.light',
      'color.accent.link',
    ]);
    expect(tokens[0]!.value).toBeInstanceOf(Color);
    expect(resolveReferences(tokens)[2]!.value).toBe(tokens[0]!.value);
    expect(rt(doc)).toEqual(doc);
  });
});

describe('15. plain-composite string fields', () => {
  test('colour, dimension and duration strings become structured values', () => {
    const doc = stable([
      ...composite('border', { a: { width: '1px', style: 'solid', color: '#111111' } }),
      ...composite('shadow', {
        s: { offsetX: '0', offsetY: '1px', blur: 2, spread: '0', color: 'rgba(0,0,0,.2)' },
      }),
      ...composite('transition', {
        t: { duration: '.2s', delay: '0s', timingFunction: 'ease-in' },
      }),
      ...composite('typography', {
        body: { fontFamily: 'Inter', fontSize: '+1.5E1px', letterSpacing: '-.01em' },
      }),
    ]);

    expect(doc.border.a.$value.color).toEqual(srgb(17 / 255, 17 / 255, 17 / 255));
    expect(doc.shadow.s.$value).toEqual({
      offsetX: px(0),
      offsetY: px(1),
      blur: px(2),
      spread: px(0),
      color: { ...srgb(0, 0, 0), alpha: 0.2 },
    });
    expect(doc.transition.t.$value).toEqual({
      duration: { value: 0.2, unit: 's' },
      delay: { value: 0, unit: 's' },
      timingFunction: [0.42, 0, 1, 1],
    });
    expect(doc.typography.body.$value.fontSize).toEqual(px(15));
    expect(doc.typography.body.$value.letterSpacing).toEqual({ value: -0.01, unit: 'em' });
    expect(doc.border.$type).toBe('border');
    expect(doc.shadow.$type).toBe('shadow');
  });

  test('dimension strings the old regex missed, and bare numbers, convert', () => {
    const doc = stable(
      group('spacing', { plus: '+4px', exp: '1.5E1px', dot: '.5rem', n: 16, z: '0' }),
    );
    expect(doc.spacing.$type).toBe('dimension');
    expect(doc.spacing.plus.$value).toEqual(px(4));
    expect(doc.spacing.exp.$value).toEqual(px(15));
    expect(doc.spacing.dot.$value).toEqual({ value: 0.5, unit: 'rem' });
    expect(doc.spacing.n.$value).toEqual(px(16));
    expect(doc.spacing.z.$value).toEqual(px(0));
  });

  test('`normal` letter-spacing stays verbatim and keeps the typography $type', () => {
    const doc = stable(
      composite('typography', {
        body: { fontFamily: 'Inter', fontSize: '16px', letterSpacing: 'normal' },
      }),
    );
    expect(doc.typography.$type).toBe('typography');
    expect(doc.typography.body.$value.letterSpacing).toBe('normal');
  });

  test('a composite with an inexpressible field is emitted with no $type', () => {
    const doc = stable(
      composite('shadow', {
        bad: { offsetX: 'calc(1px)', offsetY: '1px', blur: '2px', spread: '0', color: 'red' },
      }),
    );
    expect('$type' in doc.shadow).toBe(false);
    expect('$type' in doc.shadow.bad).toBe(false);
    expect(doc.shadow.bad.$value.offsetX).toBe('calc(1px)');
    expect(doc.shadow.bad.$value.offsetY).toEqual(px(1));
    expect(doc.shadow.bad.$extensions).toEqual({ teikn: { type: 'shadow' } });
  });
});

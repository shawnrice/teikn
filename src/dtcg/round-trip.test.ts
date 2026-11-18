import { describe, expect, test } from 'bun:test';

import { composite, group, ref } from '../builders.js';
import { CssVars } from '../Generators/CssVars.js';
import { Teikn } from '../Teikn.js';
import type { Token } from '../Token.js';
import { Border } from '../TokenTypes/Border.js';
import { BoxShadow, BoxShadowList } from '../TokenTypes/BoxShadow.js';
import { Color } from '../TokenTypes/Color/index.js';
import { CubicBezier } from '../TokenTypes/CubicBezier.js';
import { Dimension } from '../TokenTypes/Dimension.js';
import { Duration } from '../TokenTypes/Duration.js';
import { GradientList, LinearGradient, RadialGradient } from '../TokenTypes/Gradient.js';
import { Transition, TransitionList } from '../TokenTypes/Transition.js';
import { Typography } from '../TokenTypes/Typography.js';
import { isFirstClassValue } from '../type-classifiers.js';
import { parseDtcg } from './parse.js';
import { serializeDtcg } from './serialize.js';

/**
 * DTCG round-trip invariant — teikn is a *producer*, so the property that
 * matters is: a token set serialized to DTCG and read back yields the same
 * DTCG. We assert this as a **fixed point at the serialized layer**:
 *
 *     serializeDtcg(parseDtcg(serializeDtcg(T)))  deep-equals  serializeDtcg(T)
 *
 * Comparing the emitted DTCG documents (plain JSON) instead of the Token
 * instances sidesteps the private-field equality problem — value types like
 * Color and Dimension can't be compared with `===` or a structural deep-equal.
 *
 * This complements, rather than replaces, `serialize.test.ts` / `parse.test.ts`:
 * those pin each direction's absolute correctness; this pins that the two are
 * mutual inverses. The fixed point alone has one blind spot — a *symmetric*
 * bug (serialize omits X, parse never reads X) still passes — so the specific
 * bugs this invariant originally caught are additionally shape-pinned below.
 */

// Shared instances referenced from more than one token, so the full-set
// serialization exercises the identity-ref (`{alias}`) path.
const fast = new Duration(100, 'ms');
const ease = new CubicBezier(0.25, 0.1, 0.25, 1);
const shadowInk = new Color(0, 0, 0, 0.12);

// A kitchen-sink corpus touching every first-class value type plus the
// scalar buckets (dimension in several units, unitless ratios) that make up
// the awkward edges of DTCG serialization.
const corpus: Token[] = [
  group('color', { white: new Color('#ffffff'), ink: shadowInk }),
  // Dimensions across units the DTCG spec's px/rem-only rule doesn't cover.
  group('spacing', { sm: new Dimension(4, 'px'), lg: new Dimension(2, 'rem') }),
  group('border-radius', { sharp: new Dimension(2, 'px'), pill: '100%' }),
  // Unitless ratios — must serialize as `$type: number`, not `dimension`.
  group('line-height', { tight: 1.2, normal: 1.5, loose: 2 }),
  // Font-relative + unitless-zero strings — the letter-spacing edge.
  group('letter-spacing', { tight: '-0.02em', none: '0', wide: '0.05em' }),
  group('opacity', { muted: 0.5 }),
  group('font-weight', { bold: 700 }),
  group('font-family', { sans: 'Inter, sans-serif' }),
  group('duration', { fast, slow: new Duration(300, 'ms') }),
  group('timing', { ease }),
  group('shadow', {
    // The shadow color is the shared `color.ink` token, so it serializes to a
    // `{alias}` — exercising BoxShadow's per-field reference (RefFields) support.
    sm: new BoxShadow({ offsetY: 1, blur: 2, color: shadowInk }),
    // Multi-layer shadow — serializes to a `$value` array.
    elevated: new BoxShadowList([
      new BoxShadow({ offsetY: 2, blur: 4, color: new Color(0, 0, 0, 0.1) }),
      new BoxShadow({ offsetY: 8, blur: 16, color: new Color(0, 0, 0, 0.08) }),
    ]),
  }),
  group('gradient', {
    brand: new LinearGradient(135, [
      [new Color('#ff0000'), '0%'],
      [new Color('#0000ff'), '100%'],
    ]),
    radial: new RadialGradient({ shape: 'circle' }, [
      [new Color('#ffffff'), '0%'],
      [new Color('#000000'), '100%'],
    ]),
    layered: new GradientList([
      new LinearGradient(90, [
        [new Color('#000000'), '0%'],
        [new Color('#ffffff'), '100%'],
      ]),
    ]),
  }),
  group('transition', {
    // `fade` shares the `fast`/`ease` token instances, so it serializes with
    // `{alias}` fields — a single transition parses back to a Transition that
    // holds the aliases via the RefFields protocol.
    fade: new Transition(fast, ease),
    // `multi` shares the same instances inside a list. A TransitionList is
    // rebuilt into Transition instances on parse, which hold the aliased fields
    // via the RefFields protocol — so list layers with shared refs round-trip.
    multi: new TransitionList([
      new Transition(fast, ease),
      new Transition(new Duration(300, 'ms'), ease),
    ]),
  }),
  group('typography', {
    body: new Typography({
      fontFamily: ['Inter', 'sans-serif'],
      fontSize: new Dimension(16, 'px'),
      lineHeight: 1.5,
      letterSpacing: new Dimension(-0.01, 'em'),
    }),
  }),
  group('border', {
    divider: new Border({
      width: new Dimension(1, 'px'),
      style: 'solid',
      color: new Color('#e0e0e0'),
    }),
  }),
].flat();

// serialize → parse → serialize; the two documents must be identical.
const fixedPoint = (tokens: Token[]) => {
  const once = serializeDtcg(tokens);
  const twice = serializeDtcg(parseDtcg(once));

  return { once, twice };
};

// Serialize a single token and reach into its (only) leaf `$value` / `$type`.
// The token sits under its group, so the `$type` may have been hoisted there.
const leaf = (token: Token): { $value: unknown; $type?: string } => {
  const walk = (node: any, inherited?: string): any =>
    '$value' in node
      ? { $type: inherited, ...node }
      : walk(Object.values(node)[0], node.$type ?? inherited);

  return walk(serializeDtcg([token]));
};

// Every `$value`-bearing node in a document.
const countTokens = (node: any): number => {
  if (!node || typeof node !== 'object' || Array.isArray(node)) {
    return 0;
  }

  return '$value' in node
    ? 1
    : Object.values(node).reduce((sum: number, child) => sum + countTokens(child), 0);
};

// Tokens carry a leaf `name` plus a `group`; the full key is `group.name`.
const keyOf = (token: Token): string => (token.group ? `${token.group}.${token.name}` : token.name);

const tokenNamed = (key: string): Token => {
  const found = corpus.find(t => keyOf(t) === key);

  if (!found) {
    throw new Error(`corpus has no token keyed ${key}`);
  }

  return found;
};

describe('DTCG round-trip (producer: teikn → DTCG → teikn)', () => {
  for (const token of corpus) {
    test(`${token.type} :: ${keyOf(token)} is a serialization fixed point`, () => {
      const { once, twice } = fixedPoint([token]);
      expect(twice).toEqual(once);
    });
  }

  test('the full token set round-trips (grouping, hierarchy, aliases preserved)', () => {
    const { once, twice } = fixedPoint(corpus);
    expect(twice).toEqual(once);
  });

  // Same-named tokens in different groups (`tight`, `sm`, `fast`) used to
  // overwrite one another before the comparison ever ran.
  test('no token is lost: every corpus token survives both directions', () => {
    const { once, twice } = fixedPoint(corpus);
    expect(countTokens(once)).toBe(corpus.length);
    expect(countTokens(twice)).toBe(corpus.length);
    expect(parseDtcg(once)).toHaveLength(corpus.length);
  });
});

// Shape pins for the three bugs this invariant originally surfaced. These
// assert the *emitted form*, not just the fixed point, so a symmetric
// serialize/parse regression can't slip through unnoticed.
describe('DTCG round-trip: regression shape pins', () => {
  test('unitless line-height serializes as $type number (not dimension)', () => {
    const { $value, $type } = leaf(tokenNamed('line-height.normal'));
    expect($type).toBe('number');
    expect($value).toBe(1.5);
  });

  test('em letter-spacing serializes as a structured dimension', () => {
    const { $value, $type } = leaf(tokenNamed('letter-spacing.wide'));
    expect($type).toBe('dimension');
    expect($value).toEqual({ value: 0.05, unit: 'em' });
  });

  test('percentage radius serializes as a structured dimension', () => {
    const { $value } = leaf(tokenNamed('border-radius.pill'));
    expect($value).toEqual({ value: 100, unit: '%' });
  });

  test('unitless-zero letter-spacing survives without crashing the parser', () => {
    const { once, twice } = fixedPoint([tokenNamed('letter-spacing.none')]);
    expect(twice).toEqual(once);
  });

  test('multi-layer shadow parses back into a BoxShadowList', () => {
    const doc = serializeDtcg([tokenNamed('shadow.elevated')]);
    const [parsed] = parseDtcg(doc);
    expect(parsed!.value).toBeInstanceOf(BoxShadowList);
  });

  test('a shared color inside a shadow serializes as a {alias} and round-trips (RefFields)', () => {
    const shared = new Color(0, 0, 0, 0.2);
    const tokens = [
      ...group('color', { ink: shared }),
      ...group('shadow', { card: new BoxShadow({ offsetY: 2, blur: 8, color: shared }) }),
    ];
    const { once, twice } = fixedPoint(tokens);
    // The shadow's color is emitted as an alias to the shared token (a string),
    // not an inline color object — and the alias survives the round-trip.
    const shadowColor = (once as Record<string, any>).shadow.card.$value.color;
    expect(typeof shadowColor).toBe('string');
    expect(shadowColor).toMatch(/^\{.+\}$/);
    expect(twice).toEqual(once);
  });
});

/**
 * The other direction — teikn as a *consumer* of its own output:
 *
 *     parseDtcg(serializeDtcg(T))  equals  T
 *
 * The document fixed point above cannot see a value that reparses as the wrong
 * thing (a raw `{value, unit}` object where a Dimension went in) as long as it
 * serializes the same again. So this compares the tokens themselves — group,
 * name, type, and every value by class and printed form — and then the CSS the
 * two token sets generate.
 *
 * A case whose tokens legitimately come back different names what they come
 * back as in `back`, and sets `css: 'changes'` when that also prints
 * differently. Every such case says why.
 */
type Case = { tokens: Token[]; back?: Token[]; css?: 'changes' };

const printed = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(printed);
  }

  if (isFirstClassValue(value)) {
    return `${value.constructor.name}(${String(value)})`;
  }

  return value !== null && typeof value === 'object'
    ? Object.fromEntries(Object.entries(value).map(([key, val]) => [key, printed(val)]))
    : value;
};

const comparable = ({ group: g, name, type, value, modes, link }: Token) => ({
  group: g,
  name,
  type,
  value: printed(value),
  modes: printed(modes),
  link,
});

// The CSS a token set generates — or, for a value CssVars cannot print (a
// nested `style` object), the error, so both sides must fail alike.
const cssOf = (tokens: Token[]): string => {
  try {
    return new Teikn({ generators: [new CssVars({ version: 'test' })] })
      .generateToStrings(tokens)
      .get('tokens.css')!;
  } catch (error) {
    return String(error);
  }
};

const red = new Color('#ff0000');
const blue = new Color('#0000ff');
const hairline = new Dimension(1, 'px');
const quick = new Duration(200, 'ms');
const standard = new CubicBezier(0.4, 0, 0.2, 1);
const stops: [Color, string][] = [
  [red, '0%'],
  [blue, '100%'],
];
const borderFields = { width: hairline, style: 'solid', color: red };
const shadowFields = {
  offsetX: new Dimension(0, 'px'),
  offsetY: hairline,
  blur: new Dimension(2, 'px'),
  spread: new Dimension(0, 'px'),
  color: red,
};
const typographyFields = {
  fontFamily: 'Inter',
  fontSize: new Dimension(16, 'px'),
  fontWeight: 700,
  lineHeight: 1.5,
};

// Each case uses fresh instances unless it is about shared ones, so no
// identity ref (`{alias}`) appears where the case is not about references.
const one = (type: string, value: unknown): Token[] => [
  { name: 'a', group: type, type, value: value as Token['value'] },
];

// A token in another group that refers to `color.ink`.
const text = (input: { value: string; link?: string }): Token[] => [
  { name: 'text', group: 'surface', type: 'color', ...input },
];

// Tokens the reference cases point at.
const ink = new Color('#111111');
const gap = new Dimension(4, 'px');
const targets: Token[] = [...group('color', { ink }), ...group('spacing', { gap })];
const untilFast = new Duration(100, 'ms');
const easeOut = new CubicBezier(0, 0, 0.2, 1);

const cases: Record<string, Case> = {
  // ── every first-class value type ──
  'Color (srgb)': { tokens: one('color', new Color('#3366ff')) },
  'Color (alpha)': { tokens: one('color', new Color(0, 0, 0, 0.5)) },
  'Color (hsl)': { tokens: one('color', Color.fromHSL(200, 0.5, 0.5)) },
  'Color (oklch)': { tokens: one('color', Color.fromOklch(0.7, 0.1, 150)) },
  'Dimension (px)': { tokens: one('dimension', new Dimension(4, 'px')) },
  'Dimension (em)': { tokens: one('dimension', new Dimension(1.5, 'em')) },
  'Dimension (%)': { tokens: one('dimension', new Dimension(50, '%')) },
  'Duration (ms)': { tokens: one('duration', new Duration(200, 'ms')) },
  'Duration (s)': { tokens: one('duration', new Duration(0.2, 's')) },
  CubicBezier: { tokens: one('timing', new CubicBezier(0.4, 0, 0.2, 1)) },
  BoxShadow: { tokens: one('shadow', new BoxShadow({ offsetY: 1, blur: 2, color: red })) },
  'BoxShadow (inset, rem)': {
    tokens: one(
      'shadow',
      new BoxShadow({ offsetY: 1, blur: 2, color: red, inset: true, unit: 'rem' }),
    ),
  },
  BoxShadowList: {
    tokens: one(
      'shadow',
      new BoxShadowList([
        new BoxShadow({ offsetY: 2, blur: 4, color: new Color(0, 0, 0, 0.1) }),
        new BoxShadow({ offsetY: 8, blur: 16, color: new Color(0, 0, 0, 0.08) }),
      ]),
    ),
  },
  'LinearGradient (to bottom)': { tokens: one('gradient', new LinearGradient(180, stops)) },
  // Design call: a DTCG gradient is a list of stops with no angle, so every
  // gradient comes back linear and top-to-bottom.
  'LinearGradient (angled)': {
    tokens: one('gradient', new LinearGradient(90, stops)),
    back: one('gradient', new LinearGradient(180, stops)),
    css: 'changes',
  },
  // Design call: likewise, a radial gradient has no DTCG form of its own.
  RadialGradient: {
    tokens: one('gradient', new RadialGradient({ shape: 'circle' }, stops)),
    back: one('gradient', new LinearGradient(180, stops)),
    css: 'changes',
  },
  GradientList: {
    tokens: one(
      'gradient',
      new GradientList([new LinearGradient(180, stops), new LinearGradient(180, stops)]),
    ),
  },
  Transition: { tokens: one('transition', new Transition(quick, standard)) },
  'Transition (delay, property)': {
    tokens: one(
      'transition',
      new Transition({
        duration: quick,
        timingFunction: standard,
        delay: new Duration(50, 'ms'),
        property: 'opacity',
      }),
    ),
  },
  TransitionList: {
    tokens: one(
      'transition',
      new TransitionList([
        new Transition(quick, standard),
        new Transition(new Duration(300, 'ms'), new CubicBezier(0, 0, 1, 1)),
      ]),
    ),
  },
  Typography: {
    tokens: one(
      'typography',
      new Typography({ ...typographyFields, letterSpacing: new Dimension(0.1, 'em') }),
    ),
  },
  Border: { tokens: one('border', new Border(borderFields)) },

  // ── plain composites of DTCG types ──
  // DTCG has one shape per composite type, so a plain composite that fits its
  // class comes back as that class. Border and Transition print the same.
  'plain border': {
    tokens: composite('border', { a: borderFields }),
    back: one('border', new Border(borderFields)),
  },
  'plain transition': {
    tokens: composite('transition', { a: { duration: quick, timingFunction: standard } }),
    back: one('transition', new Transition(quick, standard)),
  },
  // …and Typography prints the CSS `font` shorthand where the plain composite
  // joined its fields in order.
  'plain typography': {
    tokens: composite('typography', { a: typographyFields }),
    back: one('typography', new Typography(typographyFields)),
    css: 'changes',
  },
  // …and BoxShadow drops the zero offset and spread the composite spelled out.
  'plain shadow': {
    tokens: composite('shadow', { a: shadowFields }),
    back: one('shadow', new BoxShadow({ offsetY: 1, blur: 2, color: red })),
    css: 'changes',
  },
  // A composite its class cannot hold stays a plain composite.
  'plain border, inexpressible colour': {
    tokens: composite('border', { a: { ...borderFields, color: 'currentColor' } }),
  },
  'plain border, dashArray': {
    tokens: one('border', {
      width: hairline,
      color: red,
      style: { dashArray: [new Dimension(2, 'px'), new Dimension(4, 'px')], lineCap: 'round' },
    }),
  },

  // ── plain composites of teikn-only types ──
  'teikn-only composite': {
    tokens: group('heading', {
      h1: {
        fontFamily: 'Inter',
        fontSize: new Dimension(32, 'px'),
        color: red,
        speed: quick,
        easing: standard,
        weight: 700,
        // A string under a type teikn does not own stays that string.
        indent: '2rem',
      },
    } as any),
  },

  // ── arrays of first-class values ──
  'array of Dimensions': {
    tokens: one('spacing', [new Dimension(1, 'px'), new Dimension(2, 'rem')]),
  },
  'array of Colors': { tokens: one('color', [new Color('#ff0000'), new Color('#00ff00')]) },

  // ── values with no DTCG form, with typed modes ──
  'currentColor with a Color mode': {
    tokens: [
      { name: 'a', group: 'color', type: 'color', value: 'currentColor', modes: { dark: red } },
    ],
  },
  'calc() with a Dimension mode': {
    tokens: [
      {
        name: 'a',
        group: 'spacing',
        type: 'spacing',
        value: 'calc(1px + 1rem)',
        modes: { compact: new Dimension(4, 'px') },
      },
    ],
  },
  'var() with a Duration mode': {
    tokens: [
      {
        name: 'a',
        group: 'duration',
        type: 'duration',
        value: 'var(--speed)',
        modes: { slow: new Duration(1, 's') },
      },
    ],
  },
  'modes on typed values': {
    tokens: [
      { name: 'bg', group: 'color', type: 'color', value: red, modes: { dark: blue } },
      {
        name: 'sm',
        group: 'spacing',
        type: 'spacing',
        value: new Dimension(4, 'px'),
        modes: { compact: new Dimension(2, 'px') },
      },
      {
        name: 'card',
        group: 'panel',
        type: 'panel',
        value: { pad: new Dimension(8, 'px'), ink: red },
        modes: { dark: { pad: new Dimension(8, 'px'), ink: blue } },
      },
    ],
  },

  // ── every teikn type name that maps onto a DTCG type ──
  ...Object.fromEntries(
    ['spacing', 'size', 'border-radius', 'breakpoint', 'font-size', 'letter-spacing'].map(type => [
      `type name: ${type}`,
      { tokens: one(type, new Dimension(4, 'px')) },
    ]),
  ),
  ...Object.fromEntries(
    ['line-height', 'opacity', 'z-layer', 'z-index'].map(type => [
      `type name: ${type}`,
      { tokens: one(type, 2) },
    ]),
  ),
  'type name: font-family': { tokens: one('font-family', 'Inter, sans-serif') },
  'type name: font-weight': { tokens: group('font-weight', { a: 700, b: 'bold' }) },
  'type name: font-style': { tokens: one('font-style', 'italic') },
  'type name: timing': { tokens: one('timing', new CubicBezier(0, 0, 1, 1)) },
  'type name: easing': { tokens: one('easing', new CubicBezier(0, 0, 1, 1)) },
  // …and names with no DTCG type at all.
  'type name: brand': { tokens: one('brand', new Color('#3366ff')) },
  'type name: elevation': {
    tokens: one('elevation', new BoxShadow({ offsetY: 1, blur: 2, color: red })),
  },

  // ── strings authored under a DTCG type ──
  // A string that parses as its type is serialized structured, so it comes
  // back as the value class. A dimension prints the same…
  'dimension string': {
    tokens: one('spacing', '4px'),
    back: one('spacing', new Dimension(4, 'px')),
  },
  'duration string': {
    tokens: one('duration', '200ms'),
    back: one('duration', new Duration(200, 'ms')),
  },
  // …a colour prints as `rgb()` where the author wrote hex.
  'colour string': {
    tokens: one('color', '#ff0000'),
    back: one('color', new Color('#ff0000')),
    css: 'changes',
  },

  // ── references ──
  'token-level reference': { tokens: [...targets, ...text({ value: '{color.ink}' })] },
  // A bare reference comes back qualified with its group.
  'bare reference': {
    tokens: [...targets, ...text(ref('ink') as { value: string })],
    back: [...targets, ...text({ value: '{color.ink}' })],
  },
  // Gap: `link` has no home in the document, so a linked ref comes back as an
  // ordinary reference and CSS inlines the value instead of emitting `var()`.
  'linked reference': {
    tokens: [...targets, ...text(ref('ink', { link: true }) as { value: string })],
    back: [...targets, ...text({ value: '{color.ink}' })],
    css: 'changes',
  },
  'references in composite fields': {
    tokens: [...targets, ...group('panel', { a: { pad: '{spacing.gap}', ink: '{color.ink}' } })],
  },
  'references in wrapper fields': {
    tokens: [
      ...targets,
      ...group('border', {
        edge: new Border({ width: '{spacing.gap}', style: 'solid', color: '{color.ink}' }),
      }),
      ...group('shadow', { card: new BoxShadow({ offsetY: 2, blur: 8, color: '{color.ink}' }) }),
    ],
  },
  'references in modes': {
    tokens: [
      ...targets,
      {
        name: 'bg',
        group: 'surface',
        type: 'color',
        value: new Color('#ffffff'),
        modes: { dark: '{color.ink}' },
      },
    ],
  },
  // A value sharing an instance with another token serializes as an alias to
  // it, and comes back holding the alias as a reference field.
  'shared instances': {
    tokens: [
      ...targets,
      ...group('duration', { fast: untilFast }),
      ...group('timing', { out: easeOut }),
      ...group('shadow', { card: new BoxShadow({ offsetY: 2, blur: 8, color: ink }) }),
      ...group('border', { edge: new Border({ width: gap, style: 'solid', color: ink }) }),
      ...group('transition', { fade: new Transition(untilFast, easeOut) }),
    ],
    back: [
      ...targets,
      ...group('duration', { fast: untilFast }),
      ...group('timing', { out: easeOut }),
      ...group('shadow', { card: new BoxShadow({ offsetY: 2, blur: 8, color: '{color.ink}' }) }),
      ...group('border', {
        edge: new Border({ width: '{spacing.gap}', style: 'solid', color: '{color.ink}' }),
      }),
      ...group('transition', {
        fade: new Transition({ duration: '{duration.fast}', timingFunction: '{timing.out}' }),
      }),
    ],
  },
};

describe('DTCG round-trip (consumer: tokens → DTCG → tokens)', () => {
  for (const [label, { tokens, back = tokens, css }] of Object.entries(cases)) {
    test(label, () => {
      const reparsed = parseDtcg(serializeDtcg(tokens));

      expect(reparsed.map(comparable)).toEqual(back.map(comparable));
      expect(cssOf(reparsed)).toBe(cssOf(back));

      if (css === 'changes') {
        expect(cssOf(reparsed)).not.toBe(cssOf(tokens));
      } else {
        expect(cssOf(reparsed)).toBe(cssOf(tokens));
      }
    });
  }

  test('a document that has been through the pipeline once is stable', () => {
    const tokens = Object.values(cases).map(({ tokens: [first] }) => first!);
    const renamed = tokens.map((token, i) => ({ ...token, name: `t${i}` }));
    const reparsed = parseDtcg(serializeDtcg(renamed));

    expect(parseDtcg(serializeDtcg(reparsed)).map(comparable)).toEqual(reparsed.map(comparable));
  });
});

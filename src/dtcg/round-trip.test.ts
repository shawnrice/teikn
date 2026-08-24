import { describe, expect, test } from 'bun:test';

import { group } from '../builders.js';
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
    // `{alias}` fields — a single transition parses back to a plain composite
    // that preserves the aliases.
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
const leaf = (token: Token): { $value: unknown; $type?: string } => {
  const walk = (node: any): any =>
    node && typeof node === 'object' && '$value' in node ? node : walk(Object.values(node)[0]);

  return walk(serializeDtcg([token]));
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
    const shadowColor = (once as Record<string, any>).card.$value.color;
    expect(typeof shadowColor).toBe('string');
    expect(shadowColor).toMatch(/^\{.+\}$/);
    expect(twice).toEqual(once);
  });
});

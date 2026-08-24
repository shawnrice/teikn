import { describe, expect, test } from 'bun:test';

import { testOpts } from '../fixtures/testOpts.js';
import { CssVars } from '../Generators/CssVars.js';
import { Dtcg } from '../Generators/Dtcg.js';
import { ScssVars } from '../Generators/ScssVars.js';
import { resolveReferences } from '../resolve.js';
import type { Token } from '../Token.js';
import { validate } from '../validate.js';
import { BoxShadow, BoxShadowList } from './BoxShadow.js';
import { Color } from './Color/index.js';
import { CubicBezier } from './CubicBezier.js';
import { Duration } from './Duration.js';
import { hasRefFields } from './ref-guard.js';
import { Transition, TransitionList } from './Transition.js';

// Per-field reference (RefFields) support for BoxShadow and Transition — the
// two first-class value types that gained the protocol so a shared token used
// *inside* a shadow/transition survives resolution and DTCG round-trip as a
// reference rather than being inlined or rejected.

describe('BoxShadow RefFields', () => {
  test('accepts a {ref} color via the object form and preserves it', () => {
    const s = new BoxShadow({ offsetY: 2, blur: 8, color: '{accent}' });
    expect(s.color).toBe('{accent}');
  });

  test('accepts a {ref} color via the positional form and preserves it', () => {
    const s = new BoxShadow(0, 2, 8, 0, '{accent}');
    expect(s.color).toBe('{accent}');
  });

  test('still coerces a non-ref string color into a Color', () => {
    const s = new BoxShadow({ offsetY: 2, blur: 8, color: 'steelblue' });
    expect(s.color).toBeInstanceOf(Color);
  });

  test('reports hasRefFields and exposes its fields', () => {
    const s = new BoxShadow({ offsetX: 1, offsetY: 2, blur: 8, spread: 3, color: '{accent}' });
    expect(hasRefFields(s)).toBe(true);
    expect(s.__teikn_fields__()).toEqual({
      offsetX: 1,
      offsetY: 2,
      blur: 8,
      spread: 3,
      color: '{accent}',
      inset: false,
      unit: 'px',
    });
  });

  test('__teikn_fromFields__ rebuilds an equivalent BoxShadow', () => {
    const s = new BoxShadow({ offsetY: 2, blur: 8, color: new Color(10, 20, 30) });
    const rebuilt = s.__teikn_fromFields__(s.__teikn_fields__());
    expect(rebuilt).toBeInstanceOf(BoxShadow);
    expect(String(rebuilt)).toBe(String(s));
  });

  test('with() preserves a {ref} color', () => {
    const s = new BoxShadow({ offsetY: 2, blur: 8, color: '{accent}' }).with({ blur: 12 });
    expect(s.color).toBe('{accent}');
    expect(s.blur).toBe(12);
  });

  test('toString() emits the reference verbatim without crashing', () => {
    const s = new BoxShadow({ offsetY: 2, blur: 8, color: '{accent}' });
    expect(() => s.toString()).not.toThrow();
    expect(s.toString()).toContain('{accent}');
  });

  test('a whole-value reference to the constructor is still rejected', () => {
    expect(() => new BoxShadow('{shadow.card}')).toThrow(
      /BoxShadow cannot be constructed from a reference string/,
    );
  });

  test('a shared color inside a shadow emits var(--…) in CSS', () => {
    const tokens: Token[] = [
      { name: 'ink', type: 'color', value: new Color(0, 0, 0) },
      {
        name: 'card',
        type: 'shadow',
        value: new BoxShadow({ offsetY: 2, blur: 8, color: '{ink}' }),
      },
    ];
    const css = new CssVars(testOpts).generate(tokens);
    expect(css).toContain('--card: 0 2px 8px var(--ink);');
    expect(css).not.toContain('{ink}');
  });

  test('a resolved shadow color {ref} becomes a DTCG alias', () => {
    const tokens: Token[] = [
      { name: 'ink', type: 'color', value: new Color(0, 0, 0) },
      {
        name: 'card',
        type: 'shadow',
        value: new BoxShadow({ offsetY: 2, blur: 8, color: '{ink}' }),
      },
    ];
    const dtcg = JSON.parse(new Dtcg({ hierarchical: false }).generate(tokens));
    expect(dtcg.card.$value.color).toBe('{ink}');
  });

  test('resolve turns a shadow color {ref} into the referenced Color instance', () => {
    const tokens: Token[] = [
      { name: 'ink', type: 'color', value: new Color(10, 20, 30) },
      {
        name: 'card',
        type: 'shadow',
        value: new BoxShadow({ offsetY: 2, blur: 8, color: '{ink}' }),
      },
    ];
    const resolved = resolveReferences(tokens)[1]!.value as BoxShadow;
    expect(resolved.color).toBeInstanceOf(Color);
  });

  test('a dangling shadow color reference is flagged by validate()', () => {
    const result = validate([
      {
        name: 'card',
        type: 'shadow',
        value: new BoxShadow({ offsetY: 2, blur: 8, color: '{nope}' }),
      },
    ]);
    expect(result.valid).toBe(false);
    expect(result.issues.some(i => /Unresolved reference in field "color"/.test(i.message))).toBe(
      true,
    );
  });
});

describe('Transition RefFields', () => {
  test('accepts {ref} strings in duration, timingFunction, and delay', () => {
    const t = new Transition({
      duration: '{motion.fast}',
      timingFunction: '{easing.standard}',
      delay: '{motion.slow}',
    });
    expect(t.duration).toBe('{motion.fast}');
    expect(t.timingFunction).toBe('{easing.standard}');
    expect(t.delay).toBe('{motion.slow}');
  });

  test('still coerces non-ref field values', () => {
    const t = new Transition({ duration: '200ms', timingFunction: 'ease' });
    expect(t.duration).toBeInstanceOf(Duration);
    expect(t.timingFunction).toBeInstanceOf(CubicBezier);
  });

  test('reports hasRefFields and round-trips through the protocol methods', () => {
    const t = new Transition({ duration: '{motion.fast}', timingFunction: 'ease' });
    expect(hasRefFields(t)).toBe(true);
    const rebuilt = t.__teikn_fromFields__(t.__teikn_fields__());
    expect(rebuilt).toBeInstanceOf(Transition);
    expect(rebuilt.duration).toBe('{motion.fast}');
  });

  test('setDuration() preserves a {ref}', () => {
    const t = new Transition('200ms', 'ease').setDuration('{motion.fast}');
    expect(t.duration).toBe('{motion.fast}');
  });

  test('toString() emits references verbatim without crashing', () => {
    const t = new Transition({ duration: '{motion.fast}', timingFunction: '{easing.standard}' });
    expect(() => t.toString()).not.toThrow();
    expect(t.toString()).toContain('{motion.fast}');
    expect(t.toString()).toContain('{easing.standard}');
  });

  test('a whole-value reference to the constructor is still rejected', () => {
    expect(() => new Transition('{motion.fade}')).toThrow(
      /Transition cannot be constructed from a reference string/,
    );
  });

  describe('transforms throw on an unresolved reference', () => {
    const withRef = () => new Transition({ duration: '{motion.fast}', timingFunction: 'ease' });

    test('scale()', () => {
      expect(() => withRef().scale(2)).toThrow(/unresolved reference/);
    });
    test('shift() — guards the delay field it operates on', () => {
      const t = new Transition({
        duration: '200ms',
        timingFunction: 'ease',
        delay: '{motion.slow}',
      });
      expect(() => t.shift('50ms')).toThrow(/unresolved reference/);
    });
    test('reverse()', () => {
      const t = new Transition({ duration: '200ms', timingFunction: '{easing.standard}' });
      expect(() => t.reverse()).toThrow(/unresolved reference/);
    });
    test('totalTime', () => {
      expect(() => withRef().totalTime).toThrow(/unresolved reference/);
    });
  });

  test('transforms work again once references are resolved', () => {
    const tokens: Token[] = [
      { name: 'fast', group: 'motion', type: 'duration', value: new Duration(100, 'ms') },
      {
        name: 'fade',
        type: 'transition',
        value: new Transition({ duration: '{motion.fast}', timingFunction: 'ease' }),
      },
    ];
    const resolved = resolveReferences(tokens)[1]!.value as Transition;
    expect(resolved.duration).toBeInstanceOf(Duration);
    // The transform now succeeds on the resolved instance.
    expect(String(resolved.scale(2).duration)).toBe('200ms');
  });

  test('a shared duration inside a transition emits var(--…) in CSS', () => {
    const tokens: Token[] = [
      { name: 'fast', type: 'duration', value: new Duration(100, 'ms') },
      {
        name: 'fade',
        type: 'transition',
        value: new Transition({ duration: '{fast}', timingFunction: 'ease' }),
      },
    ];
    const css = new CssVars(testOpts).generate(tokens);
    expect(css).toContain('--fade: var(--fast) ease;');
    expect(css).not.toContain('{fast}');
  });

  test('a resolved transition duration {ref} becomes a DTCG alias', () => {
    const tokens: Token[] = [
      { name: 'fast', type: 'duration', value: new Duration(100, 'ms') },
      {
        name: 'fade',
        type: 'transition',
        value: new Transition({ duration: '{fast}', timingFunction: 'ease' }),
      },
    ];
    const dtcg = JSON.parse(new Dtcg({ hierarchical: false }).generate(tokens));
    expect(dtcg.fade.$value.duration).toBe('{fast}');
  });

  test('a dangling transition field reference is flagged by validate()', () => {
    const result = validate([
      {
        name: 'fade',
        type: 'transition',
        value: new Transition({ duration: '{nope}', timingFunction: 'ease' }),
      },
    ]);
    expect(result.valid).toBe(false);
    expect(
      result.issues.some(i => /Unresolved reference in field "duration"/.test(i.message)),
    ).toBe(true);
  });
});

// The list wrappers hold no refs directly, but each layer can — so a `{ref}`
// inside a layer must resolve, emit a var()/alias, and validate, exactly as it
// does for a single shadow/transition. The list exposes its layers as fields.
describe('BoxShadowList / TransitionList RefFields (per-layer)', () => {
  test('BoxShadowList and TransitionList report hasRefFields', () => {
    expect(hasRefFields(new BoxShadowList([new BoxShadow({ blur: 2, color: '{ink}' })]))).toBe(
      true,
    );
    expect(
      hasRefFields(
        new TransitionList([new Transition({ duration: '{fast}', timingFunction: 'ease' })]),
      ),
    ).toBe(true);
  });

  test('a shared color inside a shadow-list layer emits var(--…) in CSS', () => {
    const tokens: Token[] = [
      { name: 'ink', type: 'color', value: new Color(0, 0, 0) },
      {
        name: 'stack',
        type: 'shadow',
        value: new BoxShadowList([
          new BoxShadow({ offsetY: 1, blur: 2, color: '{ink}' }),
          new BoxShadow({ offsetY: 4, blur: 8, color: '{ink}' }),
        ]),
      },
    ];
    const css = new CssVars(testOpts).generate(tokens);
    expect(css).toContain('--stack: 0 1px 2px var(--ink), 0 4px 8px var(--ink);');
    expect(css).not.toContain('{ink}');
  });

  test('a shared duration inside a transition-list layer emits var(--…) in CSS', () => {
    const tokens: Token[] = [
      { name: 'fast', type: 'duration', value: new Duration(100, 'ms') },
      {
        name: 'multi',
        type: 'transition',
        value: new TransitionList([
          new Transition({ duration: '{fast}', timingFunction: 'ease' }),
          new Transition({ duration: '{fast}', timingFunction: 'linear' }),
        ]),
      },
    ];
    const css = new CssVars(testOpts).generate(tokens);
    expect(css).toContain('--multi: var(--fast) ease, var(--fast) linear;');
  });

  test('resolve rebuilds a BoxShadowList with each layer ref resolved', () => {
    const tokens: Token[] = [
      { name: 'ink', type: 'color', value: new Color(10, 20, 30) },
      {
        name: 'stack',
        type: 'shadow',
        value: new BoxShadowList([new BoxShadow({ blur: 2, color: '{ink}' })]),
      },
    ];
    const resolved = resolveReferences(tokens)[1]!.value as BoxShadowList;
    expect(resolved).toBeInstanceOf(BoxShadowList);
    expect(resolved.layers[0]!.color).toBeInstanceOf(Color);
  });

  test('a resolved shadow-list layer {ref} becomes a DTCG alias array entry', () => {
    const tokens: Token[] = [
      { name: 'ink', type: 'color', value: new Color(0, 0, 0) },
      {
        name: 'stack',
        type: 'shadow',
        value: new BoxShadowList([new BoxShadow({ blur: 2, color: '{ink}' })]),
      },
    ];
    const dtcg = JSON.parse(new Dtcg({ hierarchical: false }).generate(tokens));
    expect(dtcg.stack.$value[0].color).toBe('{ink}');
  });

  test('a dangling ref inside a list layer is flagged by validate()', () => {
    const result = validate([
      {
        name: 'stack',
        type: 'shadow',
        value: new BoxShadowList([new BoxShadow({ blur: 2, color: '{nope}' })]),
      },
    ]);
    expect(result.valid).toBe(false);
    // main's validate reports the nested path (`layers.color`) for a ref inside
    // a list layer.
    expect(
      result.issues.some(i => /Unresolved reference in field "layers\.color"/.test(i.message)),
    ).toBe(true);
  });

  test('__teikn_fromFields__ rebuilds an equivalent list', () => {
    const list = new BoxShadowList([
      new BoxShadow({ offsetY: 1, blur: 2, color: new Color(0, 0, 0) }),
      new BoxShadow({ offsetY: 4, blur: 8, color: new Color(0, 0, 0) }),
    ]);
    const rebuilt = list.__teikn_fromFields__(list.__teikn_fields__());
    expect(rebuilt).toBeInstanceOf(BoxShadowList);
    expect(String(rebuilt)).toBe(String(list));
  });

  test('SCSS topo-sort orders a dependency shared inside a list layer first', () => {
    const ink = new Color(0, 0, 0);
    // `stack` is declared before `ink`, but its layers share the `ink` instance,
    // so the dependency walk (visitComponents over the layers) must reorder the
    // emitted `$` variables so `$ink` precedes `$stack`.
    const tokens: Token[] = [
      {
        name: 'stack',
        type: 'shadow',
        value: new BoxShadowList([
          new BoxShadow({ offsetY: 1, blur: 2, color: ink }),
          new BoxShadow({ offsetY: 4, blur: 8, color: ink }),
        ]),
      },
      { name: 'ink', type: 'color', value: ink },
    ];
    const scss = new ScssVars(testOpts).generate(tokens);
    expect(scss).toContain('$stack: 0 1px 2px $ink, 0 4px 8px $ink;');
    expect(scss.indexOf('$ink:')).toBeLessThan(scss.indexOf('$stack:'));
  });

  test('SCSS topo-sort follows a dependency shared inside a transition-list layer', () => {
    const fast = new Duration(100, 'ms');
    const tokens: Token[] = [
      {
        name: 'multi',
        type: 'transition',
        value: new TransitionList([
          new Transition({ duration: fast, timingFunction: 'ease' }),
          new Transition({ duration: fast, timingFunction: 'linear' }),
        ]),
      },
      { name: 'fast', type: 'duration', value: fast },
    ];
    const scss = new ScssVars(testOpts).generate(tokens);
    expect(scss).toContain('$multi: $fast ease, $fast linear;');
    expect(scss.indexOf('$fast:')).toBeLessThan(scss.indexOf('$multi:'));
  });
});

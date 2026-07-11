import { describe, expect, test } from 'bun:test';

import { testOpts } from '../fixtures/testOpts.js';
import { ColorTransformPlugin } from '../Plugins/ColorTransformPlugin.js';
import type { Token } from '../Token.js';
import { Border } from '../TokenTypes/Border.js';
import { BoxShadow, BoxShadowList } from '../TokenTypes/BoxShadow.js';
import { Color } from '../TokenTypes/Color/index.js';
import { GradientList, LinearGradient, RadialGradient } from '../TokenTypes/Gradient.js';
import { validate } from '../validate.js';
import { CssVars } from './CssVars.js';
import { DtcgGenerator } from './Dtcg.js';
import { ScssVars } from './ScssVars.js';

// One matrix row per value type that carries a color and supports per-field
// `{ref}` colors. Every behavior below runs for every type so the coverage is
// symmetric and a regression in any one cell fails loudly.
type MatrixCase = {
  name: string;
  type: string;
  /** Composite value holding a `{ref}` color. */
  withRef: (ref: string) => unknown;
  /** Composite value holding a concrete color (for the plugin re-base test). */
  withColor: (color: Color) => unknown;
  /** Substring the CSS var value must contain once the ref resolves. */
  cssContains: string;
  /** Reach into a DTCG `$value` and return the aliased color slot. */
  dtcgAlias: (value: any) => unknown;
  /** Field label the validate() message reports for an unresolved ref. */
  validateField: RegExp;
  /** Reach the (concrete) nested color of a transformed value. */
  nestedColor: (value: unknown) => Color;
};

const CASES: MatrixCase[] = [
  {
    name: 'Border',
    type: 'border',
    withRef: ref => new Border({ width: '1px', style: 'solid', color: ref }),
    withColor: color => new Border({ width: '1px', style: 'solid', color }),
    cssContains: '1px solid var(--ink)',
    dtcgAlias: v => v.color,
    validateField: /field "color"/,
    nestedColor: v => (v as Border).color as Color,
  },
  {
    name: 'BoxShadow',
    type: 'shadow',
    withRef: ref => new BoxShadow({ offsetY: 2, blur: 8, color: ref }),
    withColor: color => new BoxShadow({ offsetY: 2, blur: 8, color }),
    cssContains: '0 2px 8px var(--ink)',
    dtcgAlias: v => v.color,
    validateField: /field "color"/,
    nestedColor: v => (v as BoxShadow).color as Color,
  },
  {
    name: 'BoxShadowList',
    type: 'shadow',
    withRef: ref => new BoxShadowList([new BoxShadow({ offsetY: 2, blur: 8, color: ref })]),
    withColor: color => new BoxShadowList([new BoxShadow({ offsetY: 2, blur: 8, color })]),
    cssContains: '0 2px 8px var(--ink)',
    dtcgAlias: v => v[0].color,
    validateField: /field "layers\.color"/,
    nestedColor: v => (v as BoxShadowList).layers[0]!.color as Color,
  },
  {
    name: 'LinearGradient',
    type: 'gradient',
    withRef: ref =>
      new LinearGradient(180, [
        [ref, '0%'],
        ['#000', '100%'],
      ]),
    withColor: color =>
      new LinearGradient(180, [
        [color, '0%'],
        ['#000', '100%'],
      ]),
    cssContains: 'linear-gradient(to bottom, var(--ink) 0%',
    dtcgAlias: v => v[0].color,
    validateField: /field "stops\.color"/,
    nestedColor: v => (v as LinearGradient).stops[0]!.color as Color,
  },
  {
    name: 'RadialGradient',
    type: 'gradient',
    withRef: ref =>
      new RadialGradient({ shape: 'circle' }, [
        [ref, '0%'],
        ['#000', '100%'],
      ]),
    withColor: color =>
      new RadialGradient({ shape: 'circle' }, [
        [color, '0%'],
        ['#000', '100%'],
      ]),
    cssContains: 'radial-gradient(circle, var(--ink) 0%',
    dtcgAlias: v => v[0].color,
    validateField: /field "stops\.color"/,
    nestedColor: v => (v as RadialGradient).stops[0]!.color as Color,
  },
  {
    name: 'GradientList',
    type: 'gradient',
    withRef: ref =>
      new GradientList([
        new LinearGradient(180, [
          [ref, '0%'],
          ['#000', '100%'],
        ]),
      ]),
    withColor: color =>
      new GradientList([
        new LinearGradient(180, [
          [color, '0%'],
          ['#000', '100%'],
        ]),
      ]),
    cssContains: 'linear-gradient(to bottom, var(--ink) 0%',
    dtcgAlias: v => v[0][0].color,
    validateField: /field "layers\.stops\.color"/,
    nestedColor: v => (v as GradientList).layers[0]!.stops[0]!.color as Color,
  },
];

const inkToken: Token = { name: 'ink', type: 'color', value: new Color(0, 0, 0) };

describe('color-ref matrix (all ref-carrying value types)', () => {
  for (const c of CASES) {
    describe(c.name, () => {
      test('authoring a {ref} color does not throw', () => {
        expect(() => c.withRef('{ink}')).not.toThrow();
      });

      test('a resolved {ref} emits var(--…) in CSS', () => {
        const tokens: Token[] = [
          inkToken,
          { name: 'target', type: c.type, value: c.withRef('{ink}') },
        ];
        const css = new CssVars(testOpts).generate(tokens);
        expect(css).toContain(c.cssContains);
        expect(css).not.toContain('{ink}');
      });

      test('a resolved {ref} emits a $variable in SCSS', () => {
        const tokens: Token[] = [
          inkToken,
          { name: 'target', type: c.type, value: c.withRef('{ink}') },
        ];
        const scss = new ScssVars(testOpts).generate(tokens);
        // Same shape as the CSS output, but the ref renders as an SCSS `$ink`.
        expect(scss).toContain(c.cssContains.replace('var(--ink)', '$ink'));
        expect(scss).not.toContain('{ink}');
      });

      test('a {ref} color inside a mode value resolves in that mode block', () => {
        const tokens: Token[] = [
          inkToken,
          {
            name: 'target',
            type: c.type,
            value: c.withColor(new Color(255, 255, 255)),
            modes: { dark: c.withRef('{ink}') },
          },
        ];
        const css = new CssVars(testOpts).generate(tokens);
        expect(css).toContain('[data-theme="dark"]');
        // The var(--ink) reference only comes from the dark mode value.
        expect(css).toContain(c.cssContains);
        expect(css).not.toContain('{ink}');
      });

      test('a resolved {ref} becomes a DTCG alias', () => {
        const tokens: Token[] = [
          inkToken,
          { name: 'target', type: c.type, value: c.withRef('{ink}') },
        ];
        const dtcg = JSON.parse(new DtcgGenerator({ hierarchical: false }).generate(tokens));
        expect(c.dtcgAlias(dtcg.target.$value)).toBe('{ink}');
      });

      test('an unresolved {ref} is flagged by validate()', () => {
        const result = validate([{ name: 'target', type: c.type, value: c.withRef('{missing}') }]);
        expect(result.valid).toBe(false);
        expect(result.issues.some(i => c.validateField.test(i.message))).toBe(true);
      });

      test('ColorTransformPlugin re-bases the nested color into the target space', () => {
        const plugin = new ColorTransformPlugin({ type: 'hsl' });
        const result = plugin.transform({
          name: 'target',
          type: c.type,
          value: c.withColor(new Color(255, 0, 0)),
        });
        const color = c.nestedColor(result.value);
        expect(color).toBeInstanceOf(Color);
        expect(String(color)).toBe('hsl(0, 100%, 50%)');
      });
    });
  }

  test('a circular reference through a gradient stop is detected', () => {
    const tokens: Token[] = [
      { name: 'a', type: 'color', value: '{grad}' },
      {
        name: 'grad',
        type: 'gradient',
        value: new LinearGradient(180, [
          ['{a}', '0%'],
          ['#000', '100%'],
        ]),
      },
    ];
    const result = validate(tokens);
    expect(result.issues.some(i => /[Cc]ircular/.test(i.message))).toBe(true);
  });

  test('a circular reference through a shadow-list layer is detected', () => {
    const tokens: Token[] = [
      { name: 'a', type: 'color', value: '{stack}' },
      {
        name: 'stack',
        type: 'shadow',
        value: new BoxShadowList([new BoxShadow({ offsetY: 2, blur: 8, color: '{a}' })]),
      },
    ];
    const result = validate(tokens);
    expect(result.issues.some(i => /[Cc]ircular/.test(i.message))).toBe(true);
  });

  test('hex-family formats render a nested color in the space canonical notation (documented caveat)', () => {
    // `hex` has no native space, so a nested color normalized to hex renders as
    // rgb() — while a standalone color token still emits exact hex.
    const plugin = new ColorTransformPlugin({ type: 'hex' });
    const shadow = plugin.transform({
      name: 's',
      type: 'shadow',
      value: new BoxShadow({ offsetY: 2, blur: 8, color: new Color(255, 0, 0) }),
    });
    expect(String((shadow.value as BoxShadow).color)).toBe('rgb(255, 0, 0)');

    const bare = plugin.transform({ name: 'c', type: 'color', value: new Color(255, 0, 0) });
    expect(bare.value).toBe('#ff0000');
  });
});

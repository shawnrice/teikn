import { describe, expect, test } from 'bun:test';

import { composite } from '../builders.js';
import { testOpts } from '../fixtures/testOpts.js';
import type { Token } from '../Token.js';
import { Border } from '../TokenTypes/Border.js';
import { BoxShadow, BoxShadowList } from '../TokenTypes/BoxShadow.js';
import { Color } from '../TokenTypes/Color/index.js';
import { Dimension } from '../TokenTypes/Dimension.js';
import { LinearGradient } from '../TokenTypes/Gradient.js';
import { Typography } from '../TokenTypes/Typography.js';
import { validate } from '../validate.js';
import { CssVars } from './CssVars.js';
import { DtcgGenerator } from './Dtcg.js';
import { Html } from './Html.js';
import { JavaScript } from './JavaScript.js';
import { Scss } from './Scss.js';
import { Storybook } from './Storybook.js';

const sbOpts = { ...testOpts, importPath: './tokens' };

// ─── Typography ──────────────────────────────────────────────

describe('first-class Typography serializes correctly', () => {
  const typographyToken: Token[] = [
    {
      name: 'bodyText',
      type: 'typography',
      value: new Typography({
        fontFamily: ['Inter', 'system-ui', 'sans-serif'],
        fontSize: new Dimension('1rem'),
        fontWeight: 400,
        lineHeight: 1.5,
        letterSpacing: '-0.01em',
      }),
    },
  ];

  test('CssVars emits the font shorthand', () => {
    const output = new CssVars(testOpts).generate(typographyToken);
    expect(output).toContain('--body-text: 400 1rem/1.5 Inter, system-ui, sans-serif;');
    expect(output).not.toContain('[object Object]');
  });

  test('Scss emits the font shorthand', () => {
    const output = new Scss(testOpts).generate(typographyToken);
    expect(output).toContain('400 1rem/1.5 Inter, system-ui, sans-serif');
    expect(output).not.toContain('[object Object]');
  });

  test('JavaScript emits the shorthand as a string', () => {
    const output = new JavaScript(testOpts).generate(typographyToken);
    expect(output).toContain("'400 1rem/1.5 Inter, system-ui, sans-serif'");
    expect(output).not.toContain('[object Object]');
  });

  test('Html renders rich typography props from the live instance', () => {
    const output = new Html(testOpts).generate(typographyToken);
    expect(output).toContain('fontFamily');
    expect(output).toContain('fontWeight');
    // letterSpacing is excluded from the shorthand but shown in the props table
    expect(output).toContain('letterSpacing');
    expect(output).toContain('-0.01em');
    expect(output).not.toContain('[object Object]');
  });

  test('Storybook generates a TypographyBlock story', () => {
    const output = new Storybook(sbOpts).generate(typographyToken);
    expect(output).toContain('TypographyBlock');
    expect(output).toContain('bodyText');
    expect(output).not.toContain('[object Object]');
  });

  test('Dtcg emits a structured typography $value', () => {
    const output = new DtcgGenerator({ hierarchical: false }).generate(typographyToken);
    const parsed = JSON.parse(output);
    expect(parsed.bodyText.$type).toBe('typography');
    expect(parsed.bodyText.$value).toEqual({
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: { value: 1, unit: 'rem' },
      fontWeight: 400,
      lineHeight: 1.5,
      letterSpacing: { value: -0.01, unit: 'em' },
    });
  });
});

// ─── Border ──────────────────────────────────────────────────

describe('first-class Border serializes correctly', () => {
  const borderToken: Token[] = [
    {
      name: 'borderFocus',
      type: 'border',
      value: new Border({
        width: new Dimension('2px'),
        style: 'solid',
        color: new Color(70, 130, 180),
      }),
    },
  ];

  test('CssVars emits the border shorthand', () => {
    const output = new CssVars(testOpts).generate(borderToken);
    expect(output).toContain('--border-focus: 2px solid rgb(70, 130, 180);');
    expect(output).not.toContain('[object Object]');
  });

  test('JavaScript emits the shorthand as a string', () => {
    const output = new JavaScript(testOpts).generate(borderToken);
    expect(output).toContain("'2px solid rgb(70, 130, 180)'");
  });

  test('Html renders rich border props from the live instance', () => {
    const output = new Html(testOpts).generate(borderToken);
    expect(output).toContain('width');
    expect(output).toContain('style');
    expect(output).toContain('color');
    expect(output).not.toContain('[object Object]');
  });

  test('Storybook generates a BorderDemo story', () => {
    const output = new Storybook(sbOpts).generate(borderToken);
    expect(output).toContain('BorderDemo');
    expect(output).toContain('borderFocus');
    expect(output).not.toContain('[object Object]');
  });

  test('Dtcg emits a structured border $value', () => {
    const output = new DtcgGenerator({ hierarchical: false }).generate(borderToken);
    const parsed = JSON.parse(output);
    expect(parsed.borderFocus.$type).toBe('border');
    expect(parsed.borderFocus.$value).toEqual({
      width: { value: 2, unit: 'px' },
      style: 'solid',
      color: { colorSpace: 'srgb', components: [70 / 255, 130 / 255, 180 / 255] },
    });
  });
});

// ─── References into sub-values ──────────────────────────────

describe('first-class composites resolve sub-value references in CSS', () => {
  test('Border color shared with a color token emits var(--...)', () => {
    const accent = new Color(70, 130, 180);
    const tokens: Token[] = [
      { name: 'accent', type: 'color', value: accent },
      {
        name: 'borderFocus',
        type: 'border',
        value: new Border({ width: '2px', style: 'solid', color: accent }),
      },
    ];
    const output = new CssVars(testOpts).generate(tokens);
    expect(output).toContain('--border-focus: 2px solid var(--accent);');
  });
});

// ─── Documented behavior: shorthand + per-field references ───
// These tests pin the deliberate trade-off of the first-class wrappers and the
// per-field reference support, so both stay explicit and regressions are
// caught. They mirror the commentary in `example/raw-tokens.ts`.

describe('LIMITATION 1: letterSpacing is not in the CSS font shorthand', () => {
  const token: Token[] = [
    {
      name: 'caption',
      type: 'typography',
      value: new Typography({
        fontFamily: 'Inter',
        fontSize: '0.75rem',
        fontWeight: 400,
        lineHeight: 1.4,
        letterSpacing: '0.02em',
      }),
    },
  ];

  test('the CSS shorthand omits letter-spacing (no slot in `font`)', () => {
    const css = new CssVars(testOpts).generate(token);
    expect(css).toContain('--caption: 400 0.75rem/1.4 Inter;');
    expect(css).not.toContain('0.02em');
  });

  test('the JS shorthand string omits letter-spacing too', () => {
    const js = new JavaScript(testOpts).generate(token);
    expect(js).not.toContain('0.02em');
  });

  test('but it IS retained in Html docs (read from the live instance)', () => {
    const html = new Html(testOpts).generate(token);
    expect(html).toContain('letterSpacing');
    expect(html).toContain('0.02em');
  });

  test('and IS retained in the structured DTCG $value', () => {
    const dtcg = JSON.parse(new DtcgGenerator({ hierarchical: false }).generate(token));
    expect(dtcg.caption.$value.letterSpacing).toEqual({ value: 0.02, unit: 'em' });
  });
});

describe('per-field references inside a wrapper resolve (RefFields protocol)', () => {
  test('a Border color `{ref}` resolves and emits var(--…) in CSS', () => {
    const tokens: Token[] = [
      { name: 'line', type: 'color', value: new Color(70, 130, 180) },
      {
        name: 'borderFocus',
        type: 'border',
        value: new Border({ width: '2px', style: 'solid', color: '{line}' }),
      },
    ];
    const css = new CssVars(testOpts).generate(tokens);
    // Resolved to the `line` color token's instance → emitted as a var() ref.
    expect(css).toContain('--border-focus: 2px solid var(--line);');
    expect(css).not.toContain('{line}');
  });

  test('a BoxShadow color `{ref}` resolves and emits var(--…) in CSS', () => {
    const tokens: Token[] = [
      { name: 'ink', type: 'color', value: new Color(0, 0, 0) },
      {
        name: 'shadowMd',
        type: 'shadow',
        value: new BoxShadow({ offsetY: 2, blur: 8, color: '{ink}' }),
      },
    ];
    const css = new CssVars(testOpts).generate(tokens);
    expect(css).toContain('--shadow-md: 0 2px 8px var(--ink);');
    expect(css).not.toContain('{ink}');
  });

  test('a resolved BoxShadow color `{ref}` becomes a DTCG alias', () => {
    const tokens: Token[] = [
      { name: 'ink', type: 'color', value: new Color(0, 0, 0) },
      {
        name: 'shadowMd',
        type: 'shadow',
        value: new BoxShadow({ offsetY: 2, blur: 8, color: '{ink}' }),
      },
    ];
    const dtcg = JSON.parse(new DtcgGenerator({ hierarchical: false }).generate(tokens));
    expect(dtcg.shadowMd.$value.color).toBe('{ink}');
  });

  test('an unresolved BoxShadow color reference is flagged by validate()', () => {
    const result = validate([
      {
        name: 'shadowMd',
        type: 'shadow',
        value: new BoxShadow({ offsetY: 2, blur: 8, color: '{nope}' }),
      },
    ]);
    expect(result.valid).toBe(false);
    expect(result.issues.some(i => /Unresolved reference in field "color"/.test(i.message))).toBe(
      true,
    );
  });

  test('a BoxShadowList layer `{ref}` resolves and emits var(--…) in CSS', () => {
    const tokens: Token[] = [
      { name: 'ink', type: 'color', value: new Color(0, 0, 0) },
      {
        name: 'elevated',
        type: 'shadow',
        value: new BoxShadowList([
          new BoxShadow({ offsetY: 2, blur: 4, color: '{ink}' }),
          new BoxShadow({ offsetY: 8, blur: 16, color: new Color(51, 51, 51) }),
        ]),
      },
    ];
    const css = new CssVars(testOpts).generate(tokens);
    expect(css).toContain('--elevated: 0 2px 4px var(--ink), 0 8px 16px rgb(51, 51, 51);');
    expect(css).not.toContain('{ink}');
  });

  test('a Gradient stop `{ref}` resolves and emits var(--…) in CSS', () => {
    const tokens: Token[] = [
      { name: 'brand', type: 'color', value: new Color(70, 130, 180) },
      {
        name: 'hero',
        type: 'gradient',
        value: new LinearGradient(180, [
          ['{brand}', '0%'],
          [new Color(0, 0, 0), '100%'],
        ]),
      },
    ];
    const css = new CssVars(testOpts).generate(tokens);
    expect(css).toContain(
      '--hero: linear-gradient(to bottom, var(--brand) 0%, rgb(0, 0, 0) 100%);',
    );
    expect(css).not.toContain('{brand}');
  });

  test('a resolved Gradient stop `{ref}` becomes a DTCG alias', () => {
    const tokens: Token[] = [
      { name: 'brand', type: 'color', value: new Color(70, 130, 180) },
      {
        name: 'hero',
        type: 'gradient',
        value: new LinearGradient(180, [
          ['{brand}', '0%'],
          [new Color(0, 0, 0), '100%'],
        ]),
      },
    ];
    const dtcg = JSON.parse(new DtcgGenerator({ hierarchical: false }).generate(tokens));
    expect(dtcg.hero.$value[0].color).toBe('{brand}');
  });

  test('an unresolved Gradient stop reference is flagged by validate()', () => {
    const result = validate([
      {
        name: 'hero',
        type: 'gradient',
        value: new LinearGradient(180, [
          ['{missing}', '0%'],
          [new Color(0, 0, 0), '100%'],
        ]),
      },
    ]);
    expect(result.valid).toBe(false);
    expect(
      result.issues.some(i => /Unresolved reference in field "stops\.color"/.test(i.message)),
    ).toBe(true);
  });

  test('a Typography fontSize `{ref}` resolves to the referenced dimension', () => {
    const tokens: Token[] = [
      { name: 'md', type: 'fontSize', value: new Dimension('1rem') },
      {
        name: 'bodyText',
        type: 'typography',
        value: new Typography({ fontFamily: 'Inter', fontSize: '{md}', fontWeight: 400 }),
      },
    ];
    const css = new CssVars(testOpts).generate(tokens);
    // The font shorthand carries the resolved size as a var() ref.
    expect(css).toContain('--body-text: 400 var(--md) Inter;');
  });

  test('a resolved Border field `{ref}` becomes a DTCG alias', () => {
    const tokens: Token[] = [
      { name: 'line', type: 'color', value: new Color(70, 130, 180) },
      {
        name: 'borderFocus',
        type: 'border',
        value: new Border({ width: '2px', style: 'solid', color: '{line}' }),
      },
    ];
    const dtcg = JSON.parse(new DtcgGenerator({ hierarchical: false }).generate(tokens));
    expect(dtcg.borderFocus.$value.color).toBe('{line}');
  });

  test('an unresolved field reference is flagged by validate()', () => {
    const result = validate([
      {
        name: 'borderFocus',
        type: 'border',
        value: new Border({ width: '1px', style: 'solid', color: '{nope}' }),
      },
    ]);
    expect(result.valid).toBe(false);
    expect(result.issues.some(i => /Unresolved reference in field "color"/.test(i.message))).toBe(
      true,
    );
  });

  test('a circular reference through a wrapper field is detected', () => {
    const result = validate([
      {
        name: 'a',
        type: 'border',
        value: new Border({ width: '1px', style: 'solid', color: '{b}' }),
      },
      { name: 'b', type: 'color', value: '{a}' },
    ]);
    expect(result.valid).toBe(false);
    expect(result.issues.some(i => /Circular reference/.test(i.message))).toBe(true);
  });

  test('the plain composite-object form still resolves per-field refs too', () => {
    const tokens: Token[] = [
      { name: 'hair', type: 'borderWidth', value: new Dimension('1px') },
      ...composite('border', { divider: { width: '{hair}', style: 'solid', color: '#e0e0e0' } }),
    ];
    const css = new CssVars(testOpts).generate(tokens);
    // Plain composites inline resolved refs (via `cssValue`); only the
    // first-class wrappers emit `var(--…)` for shared instances.
    expect(css).toContain('--divider: 1px solid #e0e0e0;');
    expect(css).not.toContain('{hair}');
  });
});

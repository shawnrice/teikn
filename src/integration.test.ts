import { describe, expect, test } from 'bun:test';

import { group, scale, composite, tokens, theme, dp, dur } from './builders.js';
import { testOpts } from './fixtures/testOpts.js';
import { Teikn } from './Teikn.js';
import type { Token } from './Token.js';
import { BoxShadow } from './TokenTypes/BoxShadow.js';
import { Color } from './TokenTypes/Color/index.js';
import { validate } from './validate.js';

// ─── Realistic token set ────────────────────────────────────
// Modeled on actual consumer usage from the docs.

const colors = group('color', {
  background: '#fafafa',
  surface: '#ffffff',
  textPrimary: 'rgba(0, 0, 0, 0.87)',
  textSecondary: 'rgba(0, 0, 0, 0.60)',
  primary: [new Color('#4a90d9'), 'Primary interactive color'],
  primaryHover: new Color('#3a7bc8'),
  error: new Color('#f44336'),
  border: 'rgba(0, 0, 0, 0.12)',
  borderFocus: '#4a90d9',
});

const spacing = scale('spacing', {
  xs: dp(4),
  sm: dp(8),
  md: dp(16),
  lg: dp(24),
  xl: dp(32),
  xxl: dp(48),
});

const typography = composite('typography', {
  displayLg: {
    fontFamily: '"Quicksand", sans-serif',
    fontSize: dp(36),
    fontWeight: 700,
    lineHeight: 1.2,
  },
  headingMd: {
    fontFamily: '"Quicksand", sans-serif',
    fontSize: dp(18),
    fontWeight: 600,
    lineHeight: 1.4,
  },
  bodyMd: {
    fontFamily: '"Quicksand", sans-serif',
    fontSize: dp(14),
    fontWeight: 400,
    lineHeight: 1.5,
  },
});

const shadows = group('shadow', {
  sm: new BoxShadow(0, 1, 2, 0, new Color(0, 0, 0, 0.06)),
  md: new BoxShadow(0, 4, 6, 0, new Color(0, 0, 0, 0.07)),
});

const radius = scale('radius', { sm: dp(4), md: dp(8), lg: dp(12), full: '9999px' });

const timing = group('duration', { fast: dur(150, 'ms'), normal: dur(300, 'ms') });

const allTokens = tokens(colors, spacing, typography, shadows, radius, timing);

// ─── Themes ────────────────────────────────────────────────

const dark = theme('dark', colors, {
  background: '#121212',
  surface: '#1e1e1e',
  textPrimary: 'rgba(255, 255, 255, 0.87)',
  textSecondary: 'rgba(255, 255, 255, 0.60)',
  primary: '#6db3f8',
  primaryHover: '#8ec5fa',
  border: 'rgba(255, 255, 255, 0.12)',
  borderFocus: '#6db3f8',
});

// ─── Validation ─────────────────────────────────────────────

describe('integration: validate', () => {
  test('all tokens pass validation', () => {
    const result = validate(allTokens);
    expect(result.valid).toBe(true);
    expect(result.issues.filter(i => i.severity === 'error')).toHaveLength(0);
  });
});

// ─── Full pipeline per generator ────────────────────────────

const generatorConfigs = [
  { name: 'CssVars', make: () => new Teikn.generators.CssVars(testOpts), file: 'tokens.css' },
  { name: 'Scss', make: () => new Teikn.generators.Scss(testOpts), file: 'tokens.scss' },
  { name: 'ScssVars', make: () => new Teikn.generators.ScssVars(testOpts), file: 'tokens.scss' },
  { name: 'Json', make: () => new Teikn.generators.Json(testOpts), file: 'tokens.json' },
  {
    name: 'JavaScript (ESM)',
    make: () => new Teikn.generators.JavaScript(testOpts),
    file: 'tokens.mjs',
  },
  {
    name: 'JavaScript (CJS)',
    make: () => new Teikn.generators.JavaScript({ ...testOpts, module: 'cjs' }),
    file: 'tokens.cjs',
  },
  {
    name: 'TypeScriptDeclarations',
    make: () => new Teikn.generators.TypeScriptDeclarations(testOpts),
    file: 'tokens.d.ts',
  },
] as const;

describe('integration: full pipeline', () => {
  for (const { name, make, file } of generatorConfigs) {
    describe(name, () => {
      const writer = new Teikn({
        generators: [make()],
        themes: [dark],
        plugins: [new Teikn.plugins.NameConventionPlugin({ convention: 'kebab-case' })],
      });

      const output = writer.generateToStrings(allTokens);
      const content = output.get(file)!;

      test('produces output', () => {
        expect(content).toBeDefined();
        expect(content.length).toBeGreaterThan(0);
      });

      test('contains no [object Object]', () => {
        expect(content).not.toContain('[object Object]');
      });

      test('contains no empty values', () => {
        // Match CSS-style empty values like ": ;" or ": ,"
        const emptyValuePattern = /:\s*[;,}\n]/;
        const lines = content.split('\n');
        const emptyLines = lines.filter(
          line =>
            emptyValuePattern.test(line) &&
            // Exclude lines that are just closing braces or structure
            !line.trim().startsWith('}') &&
            !line.trim().startsWith(')') &&
            !line.trim().startsWith('*') &&
            !line.trim().startsWith('//') &&
            !line.trim().startsWith('/**'),
        );
        expect(emptyLines).toEqual([]);
      });

      if (name !== 'TypeScriptDeclarations') {
        test('contains Dimension values from dp()', () => {
          // dp(16) = 1rem, dp(8) = 0.5rem
          expect(content).toContain('1rem');
          expect(content).toContain('0.5rem');
        });

        test('contains Duration values from dur()', () => {
          expect(content).toContain('150ms');
          expect(content).toContain('300ms');
        });
      }
    });
  }
});

// ─── JSON deep assertions ───────────────────────────────────

describe('integration: JSON output structure', () => {
  const writer = new Teikn({
    generators: [new Teikn.generators.Json()],
    themes: [dark],
    plugins: [new Teikn.plugins.NameConventionPlugin({ convention: 'kebab-case' })],
  });

  const json = JSON.parse(writer.generateToStrings(allTokens).get('tokens.json')!);

  test('spacing tokens have rem values from dp()', () => {
    expect(json.spacingXs.value).toBe('0.25rem');
    expect(json.spacingSm.value).toBe('0.5rem');
    expect(json.spacingMd.value).toBe('1rem');
    expect(json.spacingLg.value).toBe('1.5rem');
    expect(json.spacingXl.value).toBe('2rem');
    expect(json.spacingXxl.value).toBe('3rem');
  });

  test('typography composites have rem fontSize from dp()', () => {
    expect(json.typographyDisplayLg.value.fontSize).toBe('2.25rem');
    expect(json.typographyHeadingMd.value.fontSize).toBe('1.125rem');
    expect(json.typographyBodyMd.value.fontSize).toBe('0.875rem');
  });

  test('radius tokens have rem values from dp()', () => {
    expect(json.radiusSm.value).toBe('0.25rem');
    expect(json.radiusMd.value).toBe('0.5rem');
    expect(json.radiusLg.value).toBe('0.75rem');
    expect(json.radiusFull.value).toBe('9999px');
  });

  test('duration tokens have ms values from dur()', () => {
    expect(json.durationFast.value).toBe('150ms');
    expect(json.durationNormal.value).toBe('300ms');
  });

  test('color tokens from Color objects are strings', () => {
    const primaryValue = json.colorPrimary.value;
    expect(typeof primaryValue).toBe('string');
    expect(primaryValue).not.toBe('');
  });

  test('dark mode overrides are present', () => {
    expect(json.colorBackground.modes.dark).toBe('#121212');
    expect(json.colorSurface.modes.dark).toBe('#1e1e1e');
    expect(json.colorPrimary.modes.dark).toBe('#6db3f8');
  });

  test('tokens without dark overrides have no modes', () => {
    expect(json.spacingMd.modes).toBeUndefined();
    expect(json.colorError.modes).toBeUndefined();
  });

  test('shadow tokens serialize BoxShadow objects', () => {
    const smValue = json.shadowSm.value;
    expect(typeof smValue).toBe('string');
    expect(smValue).not.toBe('');
    expect(smValue).not.toBe('[object Object]');
  });
});

// ─── TypeScript meta generator ──────────────────────────────

describe('integration: TypeScript meta generator', () => {
  const writer = new Teikn({
    generators: [new Teikn.generators.TypeScript(testOpts)],
    themes: [dark],
    plugins: [new Teikn.plugins.NameConventionPlugin({ convention: 'kebab-case' })],
  });
  const output = writer.generateToStrings(allTokens);

  test('emits both runtime and declaration files from a single construction', () => {
    expect(output.has('tokens.mjs')).toBe(true);
    expect(output.has('tokens.d.mts')).toBe(true);
  });

  test('runtime output is a valid ES module with tokens export', () => {
    const mjs = output.get('tokens.mjs')!;
    expect(mjs).toContain('export const tokens = {');
    expect(mjs).toContain('export default tokens;');
    expect(mjs).not.toContain('[object Object]');
  });

  test('declaration output is ambient and narrow-typed', () => {
    const dts = output.get('tokens.d.mts')!;
    expect(dts).toContain('export declare const tokens: {');
    expect(dts).toContain('readonly');
  });

  test('duplicate construction with same filename errors at Teikn construction', () => {
    expect(
      () =>
        new Teikn({
          generators: [
            new Teikn.generators.TypeScript({ filename: 'tokens' }),
            new Teikn.generators.TypeScriptDeclarations({ filename: 'tokens', module: 'esm' }),
          ],
        }),
    ).toThrow('Duplicate generator output filenames');
  });
});

// ─── CSS output assertions ──────────────────────────────────

describe('integration: CSS output', () => {
  const writer = new Teikn({
    generators: [new Teikn.generators.CssVars(testOpts)],
    themes: [dark],
    plugins: [new Teikn.plugins.NameConventionPlugin({ convention: 'kebab-case' })],
  });

  const css = writer.generateToStrings(allTokens).get('tokens.css')!;

  test('has :root block', () => {
    expect(css).toContain(':root {');
  });

  test('has dark theme block', () => {
    expect(css).toContain('[data-theme="dark"]');
  });

  test('spacing custom properties use rem from dp()', () => {
    expect(css).toContain('--spacing-md: 1rem;');
    expect(css).toContain('--spacing-sm: 0.5rem;');
  });

  test('duration custom properties use ms from dur()', () => {
    expect(css).toContain('--duration-fast: 150ms;');
    expect(css).toContain('--duration-normal: 300ms;');
  });

  test('dark mode overrides are in theme block', () => {
    expect(css).toContain('--color-background: #121212;');
  });
});

// ─── Multi-generator pipeline ───────────────────────────────

describe('integration: multi-generator output', () => {
  const writer = new Teikn({
    generators: [
      new Teikn.generators.CssVars(testOpts),
      new Teikn.generators.Json(),
      new Teikn.generators.JavaScript(testOpts),
    ],
    themes: [dark],
    plugins: [
      new Teikn.plugins.NameConventionPlugin({ convention: 'kebab-case' }),
      new Teikn.plugins.ScssQuoteValuePlugin(),
    ],
  });

  const output = writer.generateToStrings(allTokens);

  test('produces output for each generator', () => {
    expect(output.size).toBe(3);
    expect(output.has('tokens.css')).toBe(true);
    expect(output.has('tokens.json')).toBe(true);
    expect(output.has('tokens.mjs')).toBe(true);
  });

  test('all outputs contain spacing values', () => {
    for (const [, content] of output) {
      expect(content).toContain('1rem');
    }
  });

  test('all outputs contain duration values', () => {
    for (const [, content] of output) {
      expect(content).toContain('150ms');
    }
  });
});

// ─── Themed ramps ───────────────────────────────────────────

describe('integration: a theme drives a palette ramp', () => {
  const brand = group('color', { brand: '#3b82f6' });
  const darkBrand = theme('dark', brand, { brand: '#1e3a8a' });

  const writer = new Teikn({
    generators: [new Teikn.generators.CssVars(testOpts)],
    themes: [darkBrand],
    plugins: [new Teikn.plugins.PalettePlugin({ steps: [50, 500, 950] })],
  });

  const css = writer.generateToStrings(tokens(brand)).get('tokens.css')!;
  const [, root = '', darkTheme = ''] = css.split(/:root \{|\[data-theme="dark"\] \{/);

  test('the dark block carries the whole ramp, not just the seed', () => {
    // Step 500 is the seed itself: light vs dark base.
    expect(root).toContain('--color-brand-500: rgb(59, 130, 246)');
    expect(darkTheme).toContain('--color-brand-500: rgb(30, 58, 138)');
    // The derived steps are themed too, and differ between the two ramps.
    const stepValue = (block: string, step: string): string | undefined =>
      block.match(new RegExp(`--color-brand-${step}: (rgb\\([^)]+\\))`))?.[1];

    for (const step of ['50', '950']) {
      expect(darkTheme).toContain(`--color-brand-${step}:`);
      expect(stepValue(darkTheme, step)).not.toBe(stepValue(root, step));
    }
  });
});

describe('integration: a theme points a color at a generated ramp step', () => {
  const palette = group('color', { brand: '#3b82f6', surface: '#ffffff' });
  const darkSurface = theme('dark', palette, { surface: '{brand-950}' });

  const writer = new Teikn({
    generators: [new Teikn.generators.CssVars(testOpts)],
    themes: [darkSurface],
    plugins: [new Teikn.plugins.PalettePlugin({ steps: [50, 500, 950] })],
  });

  test('the override resolves after expansion', () => {
    const css = writer.generateToStrings(tokens(palette)).get('tokens.css')!;
    const [, , darkTheme = ''] = css.split(/:root \{|\[data-theme="dark"\] \{/);

    expect(darkTheme).toMatch(/--color-surface: (?!\{)\S/);
    expect(darkTheme).not.toContain('{brand-950}');
  });
});

describe('integration: aliases, layered themes and untouched tokens alongside a ramp', () => {
  const palette = group('color', { brand: '#3b82f6', text: '{brand-950}', accent: '{brand}' });
  const darkBrand = theme('dark', palette, { brand: '#1e3a8a' });
  const dimBrand = theme('dim', darkBrand, { text: '{brand-50}' });
  const plugins = [new Teikn.plugins.PalettePlugin({ steps: [50, 500, 950] })];
  const cssFor = (options: ConstructorParameters<typeof Teikn>[0], set: Token[]): string =>
    new Teikn({ generators: [new Teikn.generators.CssVars(testOpts)], ...options })
      .generateToStrings(set)
      .get('tokens.css')!;
  const block = (out: string, selector: string): string =>
    out.split(selector)[1]?.split('}')[0] ?? '';
  const valueOf = (out: string, name: string): string | undefined =>
    out.match(new RegExp(`--color-${name}: ([^;]+);`))?.[1];

  const css = cssFor({ plugins, themes: [darkBrand, dimBrand] }, tokens(palette, spacing));
  const root = block(css, ':root {');
  const darkBlock = block(css, '[data-theme="dark"] {');
  const dimBlock = block(css, '[data-theme="dim"] {');

  test('a color aliasing a generated step resolves, and follows the themed ramp', () => {
    expect(valueOf(root, 'text')).toBe(valueOf(root, 'brand-950'));
    expect(valueOf(darkBlock, 'text')).toBe(valueOf(darkBlock, 'brand-950'));
    expect(valueOf(darkBlock, 'text')).not.toBe(valueOf(root, 'text'));
  });

  test("an alias of the seed inherits the seed's themed value", () => {
    expect(valueOf(darkBlock, 'accent')).toBe(valueOf(darkBlock, 'brand'));
    expect(valueOf(darkBlock, 'accent-500')).toBe(valueOf(darkBlock, 'brand-500'));
  });

  test("a layered theme carries its parent's ramp and its own override", () => {
    expect(valueOf(dimBlock, 'brand-500')).toBe(valueOf(darkBlock, 'brand-500'));
    expect(valueOf(dimBlock, 'text')).toBe(valueOf(dimBlock, 'brand-50'));
  });

  test('a dangling alias is still reported', () => {
    const broken = group('color', { brand: '#3b82f6', text: '{nope}' });

    expect(() => cssFor({ plugins }, broken)).toThrow(/nope/);
  });

  test('non-expanded tokens are byte-identical with and without the themed ramp', () => {
    const spacingLines = (out: string): string[] =>
      out.split('\n').filter(line => line.includes('--spacing-'));

    expect(spacingLines(css)).toEqual(spacingLines(cssFor({}, tokens(spacing))));
    expect(spacingLines(css).length).toBeGreaterThan(0);
  });
});

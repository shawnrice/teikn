import { describe, expect, test } from 'bun:test';

import { group, ref } from '../builders.js';
import { NameConventionPlugin } from '../Plugins/NameConventionPlugin.js';
import { StripTypePrefixPlugin } from '../Plugins/StripTypePrefixPlugin.js';
import { resolveReferences } from '../resolve.js';
import { Teikn } from '../Teikn.js';
import { tokenKey } from '../token-keys.js';
import { Color } from '../TokenTypes/Color/index.js';
import { validate } from '../validate.js';

// End-to-end coverage for top-level linked references: `ref(name, { link: true })`
// emits a live alias in reference-aware formats (CSS var(), SCSS $var, DTCG
// alias) while flattening everywhere else and keeping resolveReferences concrete.

const build = (generators: any[], tokens: any[], extra: Record<string, unknown> = {}) =>
  new Teikn({ generators, validate: false, ...extra }).generateToStrings(tokens);

describe('linked top-level refs', () => {
  const colors = () =>
    group('color', {
      neutral50: '#fafafa',
      surface: ref('neutral50', { link: true }),
      baked: ref('neutral50'),
    });

  test('CssVars emits var() for a linked ref and flattens a plain ref', () => {
    const out = build([new Teikn.generators.CssVars({ dateFn: () => null })], colors());
    const css = out.get('tokens.css')!;

    expect(css).toContain('--color-neutral-50: #fafafa;');
    expect(css).toContain('--color-surface: var(--color-neutral-50);');
    expect(css).toContain('--color-baked: #fafafa;');
  });

  test('ScssVars emits $alias, declared after the target', () => {
    const out = build([new Teikn.generators.ScssVars({ dateFn: () => null })], colors());
    const scss = out.get('tokens.scss')!;

    expect(scss).toContain('$color-surface: $color-neutral50;');
    // The target's `$var` must be declared before the alias uses it.
    expect(scss.indexOf('$color-neutral50:')).toBeLessThan(scss.indexOf('$color-surface:'));
  });

  test('Dtcg emits a DTCG alias to the target token', () => {
    const out = build([new Teikn.generators.Dtcg()], colors());
    const doc = JSON.parse(out.get('tokens.tokens.json')!);

    expect(doc['color-surface'].$value).toBe('{color-neutral50}');
    expect(doc['color-baked'].$value).not.toBe('{color-neutral50}');
  });

  test('Json flattens and does not leak the link directive', () => {
    const out = build([new Teikn.generators.Json()], colors());
    const doc = JSON.parse(out.get('tokens.json')!);

    expect(doc.colorSurface.value).toBe('#fafafa');
    expect(doc.colorSurface).not.toHaveProperty('link');
  });

  test('link works when the target is an object-valued Color token', () => {
    const tokens = group('color', {
      brand: new Color('#0066cc'),
      accent: ref('brand', { link: true }),
    });
    const css = build([new Teikn.generators.CssVars({ dateFn: () => null })], tokens).get(
      'tokens.css',
    )!;
    expect(css).toContain('--color-accent: var(--color-brand);');
  });

  test('linked ref keeps a usage comment', () => {
    const tokens = group('color', {
      brand: '#0066cc',
      accent: ref('brand', { usage: 'Primary accent', link: true }),
    });
    const css = build([new Teikn.generators.CssVars({ dateFn: () => null })], tokens).get(
      'tokens.css',
    )!;
    expect(css).toContain('/* Primary accent */');
    expect(css).toContain('--color-accent: var(--color-brand);');
  });

  // ─── orthogonality: measurement stays concrete ─────────────────

  test('resolveReferences still yields the concrete value for a linked ref', () => {
    const resolved = resolveReferences(colors());
    const surface = resolved.find(t => t.name === 'surface')!;

    // The alias is emitted output; the resolved value remains concrete so
    // audits (contrast, ΔE) measure the real color.
    expect(surface.value).toBe('#fafafa');
    expect(surface.link).toBe('neutral50');
  });

  // ─── validation still catches a missing target ─────────────────

  test('a linked ref to a missing token is a build-time validation error', () => {
    const tokens = group('color', { surface: ref('does-not-exist', { link: true }) });
    const result = validate(tokens);
    expect(result.valid).toBe(false);
    expect(result.issues.some(i => /Unresolved reference/.test(i.message))).toBe(true);
  });

  test('transform() throws for a linked ref to a missing token', () => {
    const tokens = group('color', { surface: ref('missing', { link: true }) });
    const t = new Teikn({ generators: [new Teikn.generators.CssVars()] });
    expect(() => t.generateToStrings(tokens)).toThrow(/validation failed/i);
  });

  // ─── robustness against name-mangling plugins ──────────────────

  test('NameConventionPlugin keeps the alias pointing at the renamed target', () => {
    // ScssVars emits names verbatim (no re-casing at emit), so a rename that is
    // not mirrored onto `link` would produce a dangling `$var`.
    const out = new Teikn({
      generators: [new Teikn.generators.ScssVars({ dateFn: () => null })],
      plugins: [new NameConventionPlugin({ convention: 'camelCase' })],
      validate: false,
    }).generateToStrings(colors());
    const scss = out.get('tokens.scss')!;

    // Both the target definition and the alias use the camelCased name.
    expect(scss).toContain('$colorNeutral50: #fafafa;');
    expect(scss).toContain('$colorSurface: $colorNeutral50;');
  });

  test('StripTypePrefixPlugin keeps the alias pointing at the stripped target', () => {
    const out = new Teikn({
      generators: [new Teikn.generators.CssVars({ dateFn: () => null })],
      plugins: [new StripTypePrefixPlugin()],
      validate: false,
    }).generateToStrings(colors());
    const css = out.get('tokens.css')!;

    expect(css).toContain('--neutral-50: #fafafa;');
    expect(css).toContain('--surface: var(--neutral-50);');
  });

  // ─── ref() shape ───────────────────────────────────────────────

  test('ref() without link is unchanged (flattened, no link field)', () => {
    const [, plain] = group('color', { brand: '#0066cc', plain: ref('brand') });
    expect(plain!.link).toBeUndefined();
    expect(plain!.value).toBe('{brand}');
  });

  test('ref() with a bare usage string still sets usage, not link', () => {
    const tokens = group('color', { brand: '#0066cc', a: ref('brand', 'note') });
    const a = tokens.find(t => t.name === 'a')!;
    expect(a.usage).toBe('note');
    expect(a.link).toBeUndefined();
    expect(tokenKey(a)).toBe('color.a');
  });

  test('qualified link target resolves', () => {
    const tokens = group('color', {
      neutral50: '#fafafa',
      surface: ref('color.neutral50', { link: true }),
    });
    const css = build([new Teikn.generators.CssVars({ dateFn: () => null })], tokens).get(
      'tokens.css',
    )!;
    expect(css).toContain('--color-surface: var(--color-neutral-50);');
  });
});

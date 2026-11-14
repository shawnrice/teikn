import { describe, expect, test } from 'bun:test';

import { compileString } from 'sass';

import { dp, group, ref, scale, theme, tokens } from '../builders.js';
import { testOpts } from '../fixtures/testOpts.js';
import { tokenSet1 } from '../fixtures/tokenSet1.js';
import { ColorTransformPlugin } from '../Plugins/ColorTransformPlugin.js';
import { PrefixTypePlugin } from '../Plugins/PrefixTypePlugin.js';
import { ScssQuoteValuePlugin } from '../Plugins/ScssQuoteValuePlugin.js';
import { Teikn } from '../Teikn.js';
import type { Token } from '../Token.js';
import type { Generator } from './Generator.js';
import { Scss } from './Scss.js';
import { ScssVars } from './ScssVars.js';

// The Scss and ScssVars generators are otherwise only snapshot-tested; these
// compile their output with Sass and read values back through it.

// A known bug: the test body states the correct behaviour and is expected to
// fail. Once the bug is fixed the runner reports it, and the marker comes off.
// (bun calls this `test.failing`, vitest `test.fails`.)
type KnownBug = (name: string, fn: () => void) => void;
const markers = test as unknown as { failing?: KnownBug; fails?: KnownBug };
const knownBug: KnownBug = (markers.failing ?? markers.fails)!;

type Options = ConstructorParameters<typeof Teikn>[0];

const generate = (generator: Generator, set: Token[], options: Partial<Options> = {}): string =>
  [...new Teikn({ generators: [generator], ...options }).generateToStrings(set).values()][0]!;

// Compile with Sass, collecting its warnings instead of printing them.
const compile = (scss: string): { css: string; warnings: string[] } => {
  const warnings: string[] = [];
  const { css } = compileString(scss, {
    style: 'compressed',
    logger: { warn: message => warnings.push(message) },
  });

  return { css, warnings };
};

const compiles = (scss: string): string => compile(scss).css;

// Compile `scss` followed by a rule that reads `expression`, and return the
// value Sass computed for it.
const evaluate = (scss: string, expression: string): string =>
  compile(`${scss}\n.probe { value: ${expression}; }`).css.match(/\.probe\{value:([^}]*)\}/)?.[1] ??
  '';

const colors = group('color', { primary: '#336699', accent: '#ff5500' });
const sizes = scale('spacing', { sm: dp(8), md: dp(16) });
const basic = tokens(colors, sizes);
const moded = group('color', { primary: { value: '#ffffff', modes: { dark: '#000000' } } });

describe('Scss output compiles with Sass', () => {
  test('the snapshot fixture compiles', () => {
    const scss = new Scss(testOpts).generate(tokenSet1, [
      new ColorTransformPlugin({ type: 'rgba' }),
      new ScssQuoteValuePlugin(),
      new PrefixTypePlugin(),
    ]);

    expect(() => compiles(scss)).not.toThrow();
  });

  test('quoted values compile without Sass deprecation warnings', () => {
    const scss = new Scss(testOpts).generate(tokenSet1, [new ScssQuoteValuePlugin()]);

    expect(compile(scss).warnings).toEqual([]);
  });

  test('get-token returns a token value', () => {
    const scss = generate(new Scss(testOpts), basic);

    expect(evaluate(scss, "get-token('color-primary')")).toBe('#369');
    expect(evaluate(scss, "get-token('spacing-md')")).toBe('1rem');
  });

  test('get-token errors on an unknown token', () => {
    const scss = generate(new Scss(testOpts), basic);

    expect(() => evaluate(scss, "get-token('nope')")).toThrow(/does not exist/);
  });

  test('group functions return a token by its short name', () => {
    const scss = generate(new Scss({ ...testOpts, groups: true }), basic);

    expect(evaluate(scss, "color('primary')")).toBe('#369');
    expect(evaluate(scss, "spacing('sm')")).toBe('.5rem');
    expect(() => evaluate(scss, "color('nope')")).toThrow(/Unknown color token/);
  });

  test('the modes map holds each mode value', () => {
    const scss = generate(new Scss(testOpts), moded);

    expect(evaluate(scss, "get-token('color-primary')")).toBe('#fff');
    expect(evaluate(scss, 'map.get($modes, dark, color-primary)')).toBe('#000');
  });

  test('a theme lands in the modes map', () => {
    const scss = generate(new Scss(testOpts), colors, {
      themes: [theme('dark', colors, { primary: '#000000' })],
    });

    expect(evaluate(scss, 'map.get($modes, dark, color-primary)')).toBe('#000');
  });

  test('the modes map uses the same prefixed keys as the token map', () => {
    const scss = generate(new Scss({ ...testOpts, prefix: 'acme' }), moded);

    expect(evaluate(scss, "get-token('acme-color-primary')")).toBe('#fff');
    expect(evaluate(scss, 'map.get($modes, dark, acme-color-primary)')).toBe('#000');
  });

  test('group functions find a short name Sass reads as a color', () => {
    const scss = generate(
      new Scss({ ...testOpts, groups: true }),
      group('color', { red: '#ff0000' }),
    );

    expect(evaluate(scss, "color('red')")).toBe('red');
  });

  test('group functions find a short name Sass reads as a number', () => {
    const scss = generate(
      new Scss({ ...testOpts, groups: true }),
      scale('fontSize', { '100': dp(12) }),
    );

    expect(evaluate(scss, "font-size('100')")).toBe('.75rem');
  });

  test('a mode name with a quote compiles', () => {
    const scss = generate(
      new Scss(testOpts),
      group('color', { primary: { value: '#fff', modes: { "it's dark": '#111' } } }),
    );

    expect(() => compiles(scss)).not.toThrow();
  });

  test('an empty string value compiles', () => {
    expect(() =>
      compiles(generate(new Scss(testOpts), group('content', { empty: '' }))),
    ).not.toThrow();
  });

  test('a multi-line usage note stays inside its comment', () => {
    const scss = generate(
      new Scss(testOpts),
      group('color', { primary: ['#fff', 'line one\nsecond line'] }),
    );

    expect(() => compiles(scss)).not.toThrow();
  });

  // Still a known bug: needs the generic name-collision check in the Generator
  // base class, not a Scss-only fix.
  knownBug('names that transform to the same key are rejected before Sass sees them', () => {
    const scss = generate(new Scss(testOpts), scale('spacing', { '1-5': dp(6), '15': dp(60) }));

    expect(() => compiles(scss)).not.toThrow();
  });
});

describe('ScssVars output compiles with Sass', () => {
  test('the snapshot fixture compiles', () => {
    const scss = new ScssVars(testOpts).generate(tokenSet1, [
      new ColorTransformPlugin({ type: 'rgba' }),
      new ScssQuoteValuePlugin(),
      new PrefixTypePlugin(),
    ]);

    expect(() => compiles(scss)).not.toThrow();
  });

  test('quoted values compile without Sass deprecation warnings', () => {
    const scss = new ScssVars(testOpts).generate(tokenSet1, [new ScssQuoteValuePlugin()]);

    expect(compile(scss).warnings).toEqual([]);
  });

  test('each token is a variable', () => {
    const scss = generate(new ScssVars(testOpts), basic);

    expect(evaluate(scss, '$color-primary')).toBe('#369');
    expect(evaluate(scss, '$spacing-md')).toBe('1rem');
  });

  test('a linked reference follows its target', () => {
    const scss = generate(
      new ScssVars(testOpts),
      group('color', { primary: '#336699', surface: ref('primary', { link: true }) }),
    );

    expect(evaluate(scss, '$color-surface')).toBe('#369');
  });

  test('a mode is a suffixed variable', () => {
    const scss = generate(new ScssVars(testOpts), moded);

    expect(evaluate(scss, '$color-primary')).toBe('#fff');
    expect(evaluate(scss, '$color-primary-dark')).toBe('#000');
  });

  test('group functions return a token by its short name', () => {
    const scss = generate(new ScssVars({ ...testOpts, groups: true }), basic);

    expect(evaluate(scss, "color('primary')")).toBe('#369');
    expect(evaluate(scss, "spacing('sm')")).toBe('.5rem');
  });

  test('a mode variable that would overwrite a token of the same name is rejected', () => {
    const set = group('color', {
      primary: { value: '#ffffff', modes: { dark: '#000000' } },
      'primary-dark': '#123456',
    });

    expect(() => generate(new ScssVars(testOpts), set)).toThrow(
      /mode "dark" of token "color-primary" and token "color-primary-dark" both emit \$color-primary-dark/,
    );
  });

  test('an empty string value compiles', () => {
    expect(() =>
      compiles(generate(new ScssVars(testOpts), group('content', { empty: '' }))),
    ).not.toThrow();
  });

  test('a token name with a slash is a sanitised variable', () => {
    const scss = generate(new ScssVars(testOpts), scale('spacing', { 'icon/sm': dp(4) }));

    expect(evaluate(scss, '$spacing-icon-sm')).toBe('.25rem');
  });

  test('group functions find a short name Sass reads as a color', () => {
    const scss = generate(
      new ScssVars({ ...testOpts, groups: true }),
      group('color', { red: '#ff0000' }),
    );

    expect(evaluate(scss, "color('red')")).toBe('red');
  });

  test('a mode name with a space compiles', () => {
    const scss = generate(
      new ScssVars(testOpts),
      group('color', { primary: { value: '#fff', modes: { 'high contrast': '#111' } } }),
    );

    expect(() => compiles(scss)).not.toThrow();
  });

  test('a token name with a space compiles', () => {
    expect(() =>
      compiles(generate(new ScssVars(testOpts), scale('spacing', { 'icon sm': dp(4) }))),
    ).not.toThrow();
  });

  test('a multi-line usage note stays inside its comment', () => {
    const scss = generate(
      new ScssVars(testOpts),
      group('color', { primary: ['#fff', 'line one\nsecond line'] }),
    );

    expect(() => compiles(scss)).not.toThrow();
  });
});

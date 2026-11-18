import { describe, expect, test } from 'bun:test';

import { compileString } from 'sass';

import { allTokens, themes } from '../../example/raw-tokens.ts';
import { composite, dim, dp, dur, group, ref, scale, theme, tokens } from '../builders.js';
import { testOpts } from '../fixtures/testOpts.js';
import { tokenSet1 } from '../fixtures/tokenSet1.js';
import { ColorTransformPlugin } from '../Plugins/ColorTransformPlugin.js';
import { PrefixTypePlugin } from '../Plugins/PrefixTypePlugin.js';
import { ScssQuoteValuePlugin } from '../Plugins/ScssQuoteValuePlugin.js';
import { StripTypePrefixPlugin } from '../Plugins/StripTypePrefixPlugin.js';
import { kebabCase } from '../string-utils.js';
import { Teikn } from '../Teikn.js';
import type { Token } from '../Token.js';
import { Border } from '../TokenTypes/Border.js';
import { BoxShadow, BoxShadowList } from '../TokenTypes/BoxShadow.js';
import { Color } from '../TokenTypes/Color/index.js';
import { CubicBezier } from '../TokenTypes/CubicBezier.js';
import { GradientList, LinearGradient, RadialGradient } from '../TokenTypes/Gradient.js';
import { Transition, TransitionList } from '../TokenTypes/Transition.js';
import { Typography } from '../TokenTypes/Typography.js';
import { CssVars } from './CssVars.js';
import type { Generator } from './Generator.js';
import { Scss } from './Scss.js';
import { ScssVars } from './ScssVars.js';

// The Scss and ScssVars generators are otherwise only snapshot-tested; these
// compile their output with Sass and read values back through it.

// Names Sass refuses as a `@function` name, plus `if`, whose call always
// reaches the built-in. Each was confirmed by compiling.
const reservedFunctionNames = ['type', 'url', 'not', 'and', 'or', 'if', 'element', 'expression'];

// Built-ins and CSS functions a module may redefine: the group accessor wins.
const overridableFunctionNames = ['calc', 'var', 'min', 'max', 'clamp', 'rgb', 'opacity', 'color'];

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

  test('names that transform to the same key are rejected before Sass sees them', () => {
    const set = scale('spacing', { '1-5': dp(6), '15': dp(60) });

    expect(() => generate(new Scss(testOpts), set)).toThrow(
      /emits the name `get-token\('spacing-15'\)` for two different tokens/,
    );
  });

  test('a usage note cannot break out of its comment', () => {
    for (const terminator of ['\r', '\f']) {
      const scss = generate(
        new Scss(testOpts),
        group('color', { primary: ['#fff', `note${terminator}) ; .injected { a: b }`] }),
      );

      expect(compiles(scss)).toBe('');
    }
  });

  test.each(['2d', ...reservedFunctionNames])('a group type named %s is rejected', type => {
    const set: Token[] = [{ name: 'a', type, value: '1px' }];

    expect(() => generate(new Scss({ ...testOpts, groups: true }), set)).toThrow(
      `Scss: cannot emit a group accessor for token type "${type}"`,
    );
  });

  test('a group type that would overwrite the token map or get-token is rejected', () => {
    for (const type of ['token', 'get-token']) {
      const set: Token[] = [{ name: 'a', type, value: '1px' }];

      expect(() => generate(new Scss({ ...testOpts, groups: true }), set)).toThrow(
        `Scss: cannot emit a group accessor for token type "${type}"`,
      );
    }
  });

  test.each(overridableFunctionNames)('a group type named %s compiles and wins', type => {
    const set: Token[] = [{ name: 'a', type, value: '1px' }];
    const scss = generate(new Scss({ ...testOpts, groups: true }), set);

    expect(evaluate(scss, `${type}('a')`)).toBe('1px');
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

  test('a usage note cannot break out of its comment', () => {
    for (const terminator of ['\r', '\f']) {
      const scss = generate(
        new ScssVars(testOpts),
        group('color', { primary: ['#fff', `note${terminator}.injected { a: b }`] }),
      );

      expect(compiles(scss)).toBe('');
    }
  });

  test('a mode name cannot break out of its comment', () => {
    for (const terminator of ['\n', '\r', '\f']) {
      const mode = `dark${terminator}.injected { a: b }`;
      const scss = generate(
        new ScssVars(testOpts),
        group('color', { primary: { value: '#fff', modes: { [mode]: '#111' } } }),
      );

      expect(compiles(scss)).toBe('');
    }
  });

  test('a variable name starting with a digit is rejected', () => {
    const set = scale('spacing', { '2xl': dp(32) });

    expect(() =>
      generate(new ScssVars(testOpts), set, { plugins: [new StripTypePrefixPlugin()] }),
    ).toThrow(
      'ScssVars: token "2xl" would emit $2xl, which Sass cannot read as a variable name. ' +
        'Rename the token or set a `prefix`.',
    );

    // Straight to the generator: Teikn would prefix each name with its type.
    for (const name of ['4', '2d-x', '-2', '-']) {
      expect(() => new ScssVars(testOpts).generate([{ name, type: 'x', value: '1px' }])).toThrow(
        `ScssVars: token "${name}" would emit $${name}`,
      );
    }
  });

  test('a prefix makes a name starting with a digit a valid variable', () => {
    const scss = new ScssVars({ ...testOpts, prefix: 'ds' }).generate([
      { name: '2xl', type: 'spacing', value: '2rem' },
    ]);

    expect(evaluate(scss, '$ds-2xl')).toBe('2rem');
  });

  test('names Sass reads as one variable are rejected', () => {
    const set: Token[] = [
      { name: 'a_b', type: 'x', value: '1px' },
      { name: 'a-b', type: 'x', value: '2px' },
    ];

    expect(() => new ScssVars(testOpts).generate(set)).toThrow(
      'ScssVars: token "a-b" and token "a_b" both emit $a-b (Sass reads `_` and `-` as the same character). Rename one of them.',
    );
  });

  test('a mode variable Sass reads as an existing token variable is rejected', () => {
    const set: Token[] = [
      { name: 'primary_dark', type: 'color', value: 'red' },
      { name: 'primary', type: 'color', value: 'blue', modes: { dark: 'green' } },
    ];

    expect(() => new ScssVars(testOpts).generate(set)).toThrow(
      /mode "dark" of token "primary" and token "primary_dark" both emit \$primary-dark/,
    );
  });

  test('a group map that would overwrite a token variable is rejected', () => {
    const set: Token[] = [{ name: 'color-values', type: 'color', value: '#ff0000' }];

    expect(() => new ScssVars({ ...testOpts, groups: true }).generate(set)).toThrow(
      'ScssVars: the "color" group map and token "color-values" both emit $color-values. Rename one of them.',
    );
  });

  test.each(['2d', ...reservedFunctionNames])('a group type named %s is rejected', type => {
    const set: Token[] = [{ name: 'a', type, value: '1px' }];

    expect(() => new ScssVars({ ...testOpts, groups: true }).generate(set)).toThrow(
      `ScssVars: cannot emit a group accessor for token type "${type}"`,
    );
  });

  test.each(overridableFunctionNames)('a group type named %s compiles and wins', type => {
    const set: Token[] = [{ name: 'a', type, value: '1px' }];
    const scss = generate(new ScssVars({ ...testOpts, groups: true }), set);

    expect(evaluate(scss, `${type}('a')`)).toBe('1px');
  });
});

// CssVars writes a value into plain CSS, where nothing evaluates it, so its
// output is the reference: whatever Sass makes of the same tokens must match.
const declarations = (css: string): Map<string, string> =>
  new Map([...css.matchAll(/^\s*(?:--)?([\w-]+): (.*);$/gm)].map(m => [m[1]!, m[2]!]));

const cssVarsValues = (set: Token[], options: Partial<Options>): Map<string, string> => {
  const css = generate(new CssVars(testOpts), set, options);
  const raw = declarations(css.slice(0, css.indexOf('}')));
  // A shared sub-value is `var(--x)` in CSS; Sass output carries the value itself.
  const inline = (value: string): string =>
    value.replace(/var\(--([\w-]+)\)/g, (whole, name) =>
      raw.has(name) ? inline(raw.get(name)!) : whole,
    );

  return new Map([...raw].map(([name, value]) => [name, inline(value)]));
};

// Expanded output, where Sass leaves a color as it was written. A warning
// (Sass warns when it divides) fails the round trip.
const compiledValues = (scss: string): Map<string, string> => {
  const warnings: string[] = [];
  const { css } = compileString(scss, { logger: { warn: message => warnings.push(message) } });

  expect(warnings).toEqual([]);

  return declarations(css);
};

const scssValues = (set: Token[], options: Partial<Options>): Map<string, string> =>
  compiledValues(
    `${generate(new Scss(testOpts), set, options)}\n.probe { @each $k, $v in $token-values { #{$k}: $v; } }`,
  );

const scssVarsValues = (set: Token[], options: Partial<Options>): Map<string, string> => {
  // Base values only: the mode variables that follow have no `:root` counterpart.
  const [scss = ''] = generate(new ScssVars(testOpts), set, options).split('\n// Mode:');
  const probes = [...scss.matchAll(/^\$([^:\s]+): /gm)].map(m => `${kebabCase(m[1]!)}: $${m[1]};`);

  return compiledValues(`${scss}\n.probe { ${probes.join(' ')} }`);
};

const roundTrips = (label: string, set: Token[], options: Partial<Options> = {}): void => {
  const expected = Object.fromEntries(cssVarsValues(set, options));

  test(`Scss: ${label}`, () => {
    expect(Object.fromEntries(scssValues(set, options))).toEqual(expected);
  });

  test(`ScssVars: ${label}`, () => {
    expect(Object.fromEntries(scssVarsValues(set, options))).toEqual(expected);
  });
};

describe('Sass compiles a value to what CssVars emits', () => {
  roundTrips(
    'strings with a slash',
    group('raw', {
      ratio: '16/9',
      'ratio-spaced': '16 / 9',
      'ratio-one': '1/1',
      third: '1/3',
      'negative-ratio': '-1/3',
      radius: '50%/10%',
      'radius-long': '10px 20px / 5px 10px',
      'grid-area': '1 / 2 / 3 / 4',
      'grid-span': '1 / span 2',
      font: '400 1rem/1.5 Inter',
      'font-stack': 'italic 1.25rem/2 Georgia, serif',
      'font-quoted': '400 1rem/1.5 "Helvetica Neue", Arial',
      background: 'url(a.png) center/cover no-repeat',
      url: 'url(a/b.png)',
      'url-quoted': 'url("a/b.png")',
      quoted: '"a/b"',
      content: '"\\201C" / "it\'s an opening quote"',
      calc: 'calc(100% / 3)',
      'calc-tight': 'calc(100%/3)',
      'calc-nested': 'calc((100% - 2rem) / 3)',
      'min-ratio': 'min(1/2, 3)',
      'var-fallback': 'var(--x, 1/2)',
      'var-ratio': 'var(--w)/var(--h)',
      inset: 'inset(0 round 10px / 20px)',
      important: '16/9 !important',
    }),
  );

  roundTrips(
    'strings without a slash',
    group('raw', {
      percent: '50%',
      negative: '-0.02em',
      'negative-integer': '-1',
      zero: '0',
      number: 0.5,
      integer: 400,
      'negative-number': -2,
      hex: '#336699',
      'hex-short': '#369',
      named: 'rebeccapurple',
      transparent: 'transparent',
      rgb: 'rgb(51, 102, 153)',
      rgba: 'rgba(0, 0, 0, 0.5)',
      stack: 'Inter, system-ui, sans-serif',
      'stack-quoted': '"Helvetica Neue", Arial, sans-serif',
      keyword: 'solid',
      shadow: '0 1px 2px rgba(0, 0, 0, 0.25), 0 4px 8px #000000',
      calc: 'calc(100% - 2rem)',
      clamp: 'clamp(1rem, 2vw + 1rem, 3rem)',
      quoted: '"a b"',
    }),
  );

  roundTrips(
    'first-class values',
    group('value', {
      color: new Color('#336699'),
      'color-alpha': new Color('rgba(51, 102, 153, 0.5)'),
      dimension: dim(1.5, 'rem'),
      'dimension-negative': dim(-4, 'px'),
      duration: dur(200, 'ms'),
      bezier: new CubicBezier(0.4, 0, 0.2, 1),
      shadow: new BoxShadow(0, 1, 2, 0, 'rgba(0, 0, 0, 0.25)'),
      shadows: new BoxShadowList([
        new BoxShadow(0, 1, 2, 0, '#000000'),
        new BoxShadow(0, 4, 8, -2, 'rgba(0, 0, 0, 0.1)'),
      ]),
      linear: new LinearGradient(90, [
        ['#ff0000', '0%'],
        ['#0000ff', '100%'],
      ]),
      radial: new RadialGradient('radial-gradient(circle at center, #ff0000 0%, #0000ff 100%)'),
      gradients: new GradientList(
        'linear-gradient(90deg, #ff0000 0%, #0000ff 100%), radial-gradient(circle, #ffffff 0%, #000000 100%)',
      ),
      transition: new Transition('200ms', 'ease-in-out', '50ms', 'opacity'),
      transitions: new TransitionList('opacity 200ms ease, transform 300ms linear'),
      typography: new Typography({
        fontFamily: 'Inter, system-ui',
        fontSize: '2rem',
        fontWeight: 700,
        lineHeight: 1.2,
      }),
      'typography-bare': new Typography({ fontFamily: 'Inter', fontSize: '1rem', lineHeight: 1.5 }),
      'typography-sized': new Typography({ fontFamily: 'Inter', fontSize: '1rem' }),
      border: new Border('1px solid #000000'),
    }),
  );

  const size = dp(16);
  const ink = new Color('rgba(0, 0, 0, 0.25)');
  const line = new Color('#cccccc');
  const fast = dur(150, 'ms');
  const ease = new CubicBezier(0.4, 0, 0.2, 1);

  roundTrips(
    'values whose sub-values are shared tokens',
    group('shared', {
      size,
      ink,
      line,
      fast,
      ease,
      typography: new Typography({
        fontFamily: 'Inter',
        fontSize: size,
        fontWeight: 400,
        lineHeight: 1.5,
      }),
      'typography-stack': new Typography({
        fontFamily: 'Inter, system-ui',
        fontSize: size,
        lineHeight: 1.5,
      }),
      'typography-sized': new Typography({ fontFamily: 'Inter', fontSize: size }),
      border: new Border({ width: size, style: 'solid', color: line }),
      shadow: new BoxShadow(0, 1, 2, 0, ink),
      shadows: new BoxShadowList([new BoxShadow(0, 1, 2, 0, ink), new BoxShadow(0, 4, 8, 0, ink)]),
      transition: new Transition(fast, ease),
      transitions: new TransitionList([new Transition(fast, ease), new Transition(fast, 'linear')]),
      gradient: new LinearGradient(90, [
        [line, '0%'],
        [ink, '100%'],
      ]),
    }),
  );

  roundTrips(
    'a per-field reference inside a typography value',
    tokens(
      group('font-size', { base: '1rem' }),
      group('typography', {
        body: new Typography({
          fontFamily: 'Inter',
          fontSize: '{font-size.base}',
          fontWeight: 400,
          lineHeight: 1.5,
        }),
      }),
    ),
  );

  roundTrips(
    'plain composites',
    composite('typography', {
      body: { fontFamily: 'Inter, sans-serif', fontSize: '1rem', fontWeight: 400, lineHeight: 1.5 },
    }),
  );

  // Sass rewrites `.95` as `0.95`; every other example value comes through as CssVars has it.
  const canonical = (values: Map<string, string>): Record<string, string> =>
    Object.fromEntries([...values].map(([name, value]) => [name, value.replace(/ \./g, ' 0.')]));

  test('the example token set', () => {
    const expected = canonical(cssVarsValues(allTokens, { themes }));

    expect(Object.keys(expected).length).toBeGreaterThan(90);
    expect(expected['aspect-ratio-video']).toBe('16/9');
    expect(canonical(scssValues(allTokens, { themes }))).toEqual(expected);
    expect(canonical(scssVarsValues(allTokens, { themes }))).toEqual(expected);
  });

  test('a mode value with a slash is kept', () => {
    const set = group('ratio', { media: { value: '16/9', modes: { dark: '4/3' } } });

    expect(evaluate(generate(new Scss(testOpts), set), 'map.get($modes, dark, ratio-media)')).toBe(
      '4/3',
    );
    expect(evaluate(generate(new ScssVars(testOpts), set), '$ratio-media-dark')).toBe('4/3');
  });

  test('a group accessor returns a value with a slash as authored', () => {
    const set = group('ratio', { video: '16/9' });

    for (const generator of [Scss, ScssVars]) {
      const scss = generate(new generator({ ...testOpts, groups: true }), set);

      expect(evaluate(scss, "ratio('video')")).toBe('16/9');
    }
  });

  test('a color written with a slash stays a Sass color', () => {
    const set = group('color', { scrim: 'rgb(0 0 0 / 50%)', tint: 'oklch(60% 0.15 250 / 0.5)' });

    const map = generate(new Scss(testOpts), set);
    const vars = generate(new ScssVars(testOpts), set);

    for (const name of ['scrim', 'tint']) {
      expect(evaluate(map, `type-of(get-token('color-${name}'))`)).toBe('color');
      expect(evaluate(vars, `type-of($color-${name})`)).toBe('color');
    }
  });

  test('a shared font size next to a slash is interpolated, not divided', () => {
    const base = dp(16);
    const set = tokens(
      group('size', { base }),
      group('typography', {
        body: new Typography({ fontFamily: 'Inter', fontSize: base, lineHeight: 1.5 }),
      }),
    );
    const scss = generate(new ScssVars(testOpts), set);

    expect(scss).toContain('$typography-body: #{$size-base}/1.5 Inter;');
    expect(evaluate(scss, '$typography-body')).toBe('1rem/1.5 Inter');
  });

  test('a value that already interpolates is left to the author', () => {
    const set = tokens(
      group('size', { base: '1rem' }),
      group('font', { body: '#{$size-base}/1.5 Inter' }),
    );

    expect(evaluate(generate(new ScssVars(testOpts), set), '$font-body')).toBe('1rem/1.5 Inter');
  });
});

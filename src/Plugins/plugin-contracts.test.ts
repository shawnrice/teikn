import { describe, expect, test } from 'bun:test';

import { group, ref } from '../builders.js';
import { testOpts } from '../fixtures/testOpts.js';
import { CssVars } from '../Generators/CssVars.js';
import { Teikn } from '../Teikn.js';
import type { Token } from '../Token.js';
import { Border } from '../TokenTypes/Border.js';
import { BoxShadow } from '../TokenTypes/BoxShadow.js';
import { Color } from '../TokenTypes/Color/index.js';
import type { ColorFormat } from '../TokenTypes/Color/types.js';
import { LinearGradient } from '../TokenTypes/Gradient.js';
import { Transition, TransitionList } from '../TokenTypes/Transition.js';
import { AlphaMultiplyPlugin } from './AlphaMultiplyPlugin.js';
import { ColorBlindnessPlugin } from './ColorBlindnessPlugin.js';
import { ColorTransformPlugin } from './ColorTransformPlugin.js';
import { ContrastValidatorPlugin } from './ContrastValidatorPlugin.js';
import { DeprecationPlugin } from './DeprecationPlugin.js';
import { NameConventionPlugin } from './NameConventionPlugin.js';
import { PalettePlugin } from './PalettePlugin.js';
import { PerceptualDistancePlugin } from './PerceptualDistancePlugin.js';
import type { Plugin } from './Plugin.js';
import { ReducedMotionPlugin } from './ReducedMotionPlugin.js';
import { RemUnitPlugin } from './RemUnitPlugin.js';

// Everything here runs the full pipeline (themes, expand, resolve, transform,
// CssVars) so that plugin interactions are covered, not just a plugin's own
// method in isolation.
const css = ({ tokens, plugins }: { tokens: Token[]; plugins: Plugin[] }): string =>
  new Teikn({ generators: [new CssVars(testOpts)], plugins })
    .generateToStrings(tokens)
    .get('tokens.css')!;

const DARK = '[data-theme="dark"]';

// The value of a custom property in the default block, or in the dark block.
const read = ({
  output,
  name,
  dark = false,
}: {
  output: string;
  name: string;
  dark?: boolean;
}): string | undefined => {
  const [root = '', darkBlock = ''] = output.split(DARK);
  const line = (dark ? darkBlock : root).split('\n').find(l => l.trim().startsWith(`${name}:`));

  return line
    ?.trim()
    .slice(name.length + 1, -1)
    .trim();
};

const UNPARSEABLE = ['currentColor', 'inherit', 'var(--x)', 'color-mix(in srgb, red 50%, blue)'];

type ColorPluginRow = {
  name: string;
  make: () => Plugin;
  // The custom property this plugin writes for a color token named `n`.
  derived: (n: string) => string;
  // Whether the plugin generates extra tokens (so an unparseable seed must
  // generate none) or rewrites the token in place.
  expands: boolean;
  // Alpha of the derived value for a 50% translucent source. Flattening alpha
  // away is AlphaMultiplyPlugin's whole job; everything else must keep it.
  alpha: number;
};

const COLOR_PLUGINS: ColorPluginRow[] = [
  {
    name: 'ColorTransformPlugin',
    make: () => new ColorTransformPlugin({ type: 'rgb' }),
    derived: n => `--color-${n}`,
    expands: false,
    alpha: 0.5,
  },
  {
    name: 'AlphaMultiplyPlugin',
    make: () => new AlphaMultiplyPlugin(),
    derived: n => `--color-${n}`,
    expands: false,
    alpha: 1,
  },
  {
    name: 'PalettePlugin',
    make: () => new PalettePlugin({ steps: [100, 500, 900] }),
    derived: n => `--color-${n}-900`,
    expands: true,
    alpha: 0.5,
  },
  {
    name: 'PalettePlugin (oklch)',
    make: () => new PalettePlugin({ steps: [100, 500, 900], space: 'oklch' }),
    derived: n => `--color-${n}-900`,
    expands: true,
    alpha: 0.5,
  },
  {
    name: 'ColorBlindnessPlugin',
    make: () => new ColorBlindnessPlugin({ types: ['protanopia'] }),
    derived: n => `--color-${n}-protanopia`,
    expands: true,
    alpha: 0.5,
  },
];

describe.each(COLOR_PLUGINS)(
  'color plugin contract: $name',
  ({ make, derived, expands, alpha }) => {
    test.each(UNPARSEABLE)('passes %s through untouched', value => {
      const output = css({ tokens: group('color', { a: '#06c', x: value }), plugins: [make()] });

      expect(read({ output, name: '--color-x' })).toBe(value);
      expect(read({ output, name: derived('a') })).toBeDefined();

      if (expands) {
        expect(read({ output, name: derived('x') })).toBeUndefined();
      }
    });

    test.each(UNPARSEABLE)('passes %s through untouched as a mode value', value => {
      const output = css({
        tokens: group('color', { a: { value: '#06c', modes: { dark: value } } }),
        plugins: [make()],
      });

      expect(read({ output, name: '--color-a', dark: true })).toBe(value);
      expect(read({ output, name: derived('a') })).toBeDefined();
    });

    test('preserves alpha', () => {
      const output = css({
        tokens: group('color', { a: 'rgba(255, 0, 0, 0.5)' }),
        plugins: [make()],
      });

      expect(new Color(read({ output, name: derived('a') })!).alpha).toBeCloseTo(alpha, 5);
    });

    test('handles a {ref} value like its target', () => {
      const output = css({
        tokens: group('color', { a: 'rgba(255, 0, 0, 0.5)', b: ref('a') }),
        plugins: [make()],
      });
      const target = read({ output, name: derived('a') });

      expect(target).toBeDefined();
      expect(read({ output, name: derived('b') })).toBe(target!);
    });

    test('follows modes inherited through a reference', () => {
      const output = css({
        tokens: group('color', {
          primary: { value: '#ff0000', modes: { dark: '#00ff00' } },
          brand: ref('primary'),
        }),
        plugins: [make()],
      });
      const target = read({ output, name: derived('primary'), dark: true });

      expect(target).toBeDefined();
      expect(target).not.toBe(read({ output, name: derived('primary') })!);
      expect(read({ output, name: derived('brand'), dark: true })).toBe(target!);
    });
  },
);

describe('color audit plugins do not throw on values that are not colors', () => {
  const tokens = group('color', { a: '#000', b: '#010101', x: 'currentColor', y: 'var(--x)' });

  test('ContrastValidatorPlugin', () => {
    const plugin = new ContrastValidatorPlugin({ pairs: [{ foreground: 'x', background: 'a' }] });

    expect(() => new Teikn({ plugins: [plugin] }).audit(tokens)).not.toThrow();
  });

  test('PerceptualDistancePlugin', () => {
    const plugin = new PerceptualDistancePlugin({ sets: [['a', 'x', 'y']] });

    expect(() => new Teikn({ plugins: [plugin] }).audit(tokens)).not.toThrow();
  });

  test('ColorTransformPlugin', () => {
    const plugin = new ColorTransformPlugin({ type: 'hex' });

    expect(() => new Teikn({ plugins: [plugin] }).audit(tokens)).not.toThrow();
  });
});

describe('plugin audits only ever warn about token content', () => {
  test('no audit issue is an error', () => {
    const tokens = [
      ...group('color', { a: 'rgba(0, 0, 0, 0.5)', b: 'rgba(0, 0, 0, 0.51)', x: 'currentColor' }),
      ...group('brand', { a: '#fff' }),
    ];
    const issues = new Teikn({
      plugins: [
        new ColorTransformPlugin({ type: 'hex' }),
        new ContrastValidatorPlugin({
          pairs: [
            { foreground: 'color.a', background: 'b' },
            { foreground: 'nope', background: 'x' },
          ],
        }),
        new PerceptualDistancePlugin({ sets: [['color.a', 'b', 'nope', 'x']] }),
        new DeprecationPlugin({ tokens: { nope: true } }),
      ],
    }).audit(tokens);

    expect(issues.length).toBeGreaterThan(3);
    expect(issues.filter(i => i.severity === 'error')).toEqual([]);
  });
});

// ─── Required and constrained options ────────────────────────

const construct = (Class: unknown, options?: unknown): Plugin =>
  new (Class as new (options?: unknown) => Plugin)(options);

describe('plugins with required options reject a missing value in the constructor', () => {
  const REQUIRED: [string, unknown, string][] = [
    ['ContrastValidatorPlugin', ContrastValidatorPlugin, 'pairs'],
    ['DeprecationPlugin', DeprecationPlugin, 'tokens'],
    ['NameConventionPlugin', NameConventionPlugin, 'convention'],
  ];

  describe.each(REQUIRED)('%s', (name, Class, option) => {
    test.each([
      ['no options', undefined],
      ['empty options', {}],
      ['a null option', { [option]: null }],
    ])(`names itself and \`${option}\` given %s`, (_label, options) => {
      expect(() => construct(Class, options)).toThrow(new RegExp(`${name}.*${option}`));
    });
  });
});

describe('plugins reject an option value they cannot use', () => {
  const INVALID: [string, () => Plugin, RegExp][] = [
    ['RemUnitPlugin base 0', () => new RemUnitPlugin({ base: 0 }), /RemUnitPlugin.*base/],
    ['RemUnitPlugin base -16', () => new RemUnitPlugin({ base: -16 }), /RemUnitPlugin.*base/],
    ['RemUnitPlugin base NaN', () => new RemUnitPlugin({ base: NaN }), /RemUnitPlugin.*base/],
    [
      'RemUnitPlugin base Infinity',
      () => new RemUnitPlugin({ base: Infinity }),
      /RemUnitPlugin.*base/,
    ],
    [
      'NameConventionPlugin unknown convention',
      () => construct(NameConventionPlugin, { convention: 'Title Case' }),
      /NameConventionPlugin.*convention.*Title Case/,
    ],
    [
      'NameConventionPlugin inherited key as convention',
      () => construct(NameConventionPlugin, { convention: 'toString' }),
      /NameConventionPlugin.*convention/,
    ],
    [
      'ColorTransformPlugin unknown type',
      () => construct(ColorTransformPlugin, { type: 'hexx' }),
      /ColorTransformPlugin.*type.*hexx/,
    ],
    [
      'PalettePlugin unknown space',
      () => construct(PalettePlugin, { space: 'nope' }),
      /PalettePlugin.*space.*nope/,
    ],
    [
      'ContrastValidatorPlugin pairs not an array',
      () => construct(ContrastValidatorPlugin, { pairs: 'a,b' }),
      /ContrastValidatorPlugin.*pairs/,
    ],
    [
      'DeprecationPlugin tokens not an object',
      () => construct(DeprecationPlugin, { tokens: 'old' }),
      /DeprecationPlugin.*tokens/,
    ],
  ];

  test.each(INVALID)('%s', (_label, make, message) => {
    expect(make).toThrow(message);
  });

  test('valid and omitted optional values are still accepted', () => {
    expect(() => new RemUnitPlugin()).not.toThrow();
    expect(() => new RemUnitPlugin({ base: 10 })).not.toThrow();
    expect(() => new ColorTransformPlugin({})).not.toThrow();
    expect(() => new ColorTransformPlugin({ type: 'native' })).not.toThrow();
    expect(() => new PalettePlugin()).not.toThrow();
    expect(() => new PalettePlugin({ space: 'auto' })).not.toThrow();
    expect(() => new PalettePlugin({ space: 'oklch' })).not.toThrow();
    expect(() => new ContrastValidatorPlugin({ pairs: [] })).not.toThrow();
    expect(() => new DeprecationPlugin({ tokens: {} })).not.toThrow();
    expect(() => new NameConventionPlugin({ convention: 'camelCase' })).not.toThrow();
  });
});

// ─── ColorTransformPlugin keeps alpha in every format that can carry it ───

describe('ColorTransformPlugin alpha', () => {
  const ALPHA_CAPABLE: ColorFormat[] = ['rgb', 'hsl', 'lab', 'lch', 'oklab', 'oklch', 'xyz'];

  describe.each(ALPHA_CAPABLE)('type %s', type => {
    const plugin = (): Plugin[] => [new ColorTransformPlugin({ type })];

    test('keeps the alpha of a standalone color', () => {
      const output = css({
        tokens: group('color', { a: 'rgba(0, 0, 0, 0.5)', solid: '#000' }),
        plugins: plugin(),
      });
      const translucent = read({ output, name: '--color-a' })!;
      const solid = read({ output, name: '--color-solid' })!;

      expect(new Color(translucent).alpha).toBeCloseTo(0.5, 5);
      expect(new Color(solid).alpha).toBe(1);
      // The opaque form of the requested format is unchanged.
      expect(solid).toBe(new Color('#000').toString(type));
    });

    test('keeps the alpha of a mode value', () => {
      const output = css({
        tokens: group('color', { a: { value: '#000', modes: { dark: 'rgba(0, 0, 0, 0.5)' } } }),
        plugins: plugin(),
      });

      expect(new Color(read({ output, name: '--color-a', dark: true })!).alpha).toBeCloseTo(0.5, 5);
    });

    test('keeps the alpha of colors nested in a shadow, border and gradient', () => {
      const tokens: Token[] = [
        ...group('shadow', { s: new BoxShadow(0, 1, 2, 0, 'rgba(0, 0, 0, 0.25)') }),
        ...group('border', { b: new Border('1px solid rgba(0, 0, 0, 0.25)') }),
        ...group('gradient', {
          g: new LinearGradient(90, [
            ['rgba(0, 0, 0, 0.25)', '0%'],
            ['rgba(255, 255, 255, 0.25)', '100%'],
          ]),
        }),
      ];
      const output = css({ tokens, plugins: plugin() });

      for (const name of ['--shadow-s', '--border-b', '--gradient-g']) {
        const [nested] = read({ output, name })!.match(/[a-z]+\([^()]*\)/)!;
        const color = new Color(nested);

        expect(color.alpha).toBeCloseTo(0.25, 5);
        expect(color.space).toBe(type);
      }
    });

    test('reports no alpha loss', () => {
      const issues = new ColorTransformPlugin({ type }).audit([
        { name: 'a', type: 'color', value: 'rgba(0, 0, 0, 0.5)' },
      ]);

      expect(issues).toEqual([]);
    });
  });

  test.each(['hex', 'hex3'] as const)('%s cannot carry alpha and still warns', type => {
    const issues = new Teikn({ plugins: [new ColorTransformPlugin({ type })] }).audit(
      group('color', { a: 'rgba(0, 0, 0, 0.5)' }),
    );

    expect(issues).toHaveLength(1);
    expect(issues[0]!.severity).toBe('warning');
  });
});

// ─── ColorBlindnessPlugin ────────────────────────────────────

describe('ColorBlindnessPlugin through the pipeline', () => {
  test('an alias gets the simulation of each mode its target has', () => {
    const output = css({
      tokens: group('color', {
        primary: { value: '#f00', modes: { dark: '#0f0' } },
        brand: ref('primary'),
      }),
      plugins: [new ColorBlindnessPlugin({ types: ['protanopia'] })],
    });

    expect(read({ output, name: '--color-brand-protanopia', dark: true })).toBe(
      new Color('#0f0').simulateColorBlindness('protanopia').toString(),
    );
  });

  test('a token without a value for a mode adds nothing to that mode', () => {
    const output = css({
      tokens: group('color', {
        primary: { value: '#f00', modes: { dark: '#0f0' } },
        other: '#00f',
      }),
      plugins: [new ColorBlindnessPlugin({ types: ['protanopia'] })],
    });

    expect(read({ output, name: '--color-other-protanopia' })).toBeDefined();
    expect(read({ output, name: '--color-other-protanopia', dark: true })).toBeUndefined();
  });

  test('placed before PalettePlugin, an alias of a ramp step is skipped, not fatal', () => {
    const output = css({
      tokens: group('color', { primary: '#06c', text: ref('primary-900') }),
      plugins: [new ColorBlindnessPlugin({ types: ['protanopia'] }), new PalettePlugin()],
    });

    expect(read({ output, name: '--color-text' })).toBe(
      read({ output, name: '--color-primary-900' })!,
    );
    expect(read({ output, name: '--color-primary-protanopia' })).toBeDefined();
    expect(read({ output, name: '--color-text-protanopia' })).toBeUndefined();
  });

  test('placed after PalettePlugin, the alias of a ramp step is simulated', () => {
    const output = css({
      tokens: group('color', { primary: '#06c', text: ref('primary-900') }),
      plugins: [new PalettePlugin(), new ColorBlindnessPlugin({ types: ['protanopia'] })],
    });

    expect(read({ output, name: '--color-text-protanopia' })).toBe(
      read({ output, name: '--color-primary-900-protanopia' })!,
    );
  });
});

// ─── PerceptualDistancePlugin name lookup ────────────────────

describe('PerceptualDistancePlugin finds tokens the way the other audits do', () => {
  const tokens = [...group('color', { a: '#000', b: '#010101' }), ...group('brand', { a: '#fff' })];
  const audit = (sets: string[][], report = false) =>
    new Teikn({ plugins: [new PerceptualDistancePlugin({ sets, report })] }).audit(tokens);

  test.each([
    ['bare', ['a', 'b']],
    ['qualified', ['color.a', 'color.b']],
    ['prefixed', ['color-a', 'color-b']],
    ['mixed', ['color.a', 'b']],
  ])('%s names are compared', (_label, set) => {
    const issues = audit([set]);

    expect(issues).toHaveLength(1);
    expect(issues[0]!.severity).toBe('warning');
    expect(issues[0]!.message).toContain('very similar');
  });

  test('a name that matches no color token is reported, and the rest still compared', () => {
    const issues = audit([['a', 'b', 'bb']]);

    expect(issues.map(i => i.severity)).toEqual(['warning', 'warning']);
    expect(issues.find(i => i.token === 'bb')!.message).toContain('matches no color token');
    expect(issues.some(i => i.message.includes('very similar'))).toBe(true);
  });

  test('a name of a non-color token is reported', () => {
    const issues = audit([['brand.a', 'b']]);

    expect(issues).toHaveLength(1);
    expect(issues[0]!.token).toBe('brand.a');
  });

  test('an ambiguous name is reported and not compared', () => {
    const ambiguous: Token[] = [
      { name: 'a', type: 'color', group: 'light', value: '#000' },
      { name: 'a', type: 'color', group: 'dark', value: '#010101' },
      { name: 'b', type: 'color', value: '#000' },
    ];
    const issues = new PerceptualDistancePlugin({ sets: [['a', 'b']] }).audit(ambiguous);

    expect(issues).toHaveLength(1);
    expect(issues[0]!.severity).toBe('warning');
    expect(issues[0]!.message).toContain('ambiguous');
    expect(issues[0]!.message).toContain('light.a');
  });

  test('report mode warns about an unknown name alongside its measurements', () => {
    const issues = audit([['a', 'b', 'bb']], true);

    expect(issues.map(i => i.severity).toSorted()).toEqual(['info', 'warning']);
  });
});

// ─── ReducedMotionPlugin keeps everything but the motion ─────

describe('ReducedMotionPlugin keeps the property and delay of a transition', () => {
  const reduced = (tokens: Token[], name: string): string | undefined =>
    read({ output: css({ tokens, plugins: [new ReducedMotionPlugin()] }), name });

  const first = reduced(
    group('transition', { fade: new Transition('opacity 200ms ease 50ms') }),
    '--transition-reduced-fade',
  );

  test('a first-class Transition is the reference behaviour', () => {
    expect(first).toBe('opacity 0s linear 50ms');
  });

  test('a plain composite', () => {
    const tokens = group('transition', {
      fade: { property: 'opacity', duration: '200ms', timingFunction: 'ease', delay: '50ms' },
    });

    expect(reduced(tokens, '--transition-reduced-fade')).toBe(first!);
  });

  test('a transition string', () => {
    const tokens = group('transition', { fade: 'opacity 200ms ease 50ms' });

    expect(reduced(tokens, '--transition-reduced-fade')).toBe(first!);
  });

  test('an alias', () => {
    const tokens = group('transition', {
      fade: new Transition('opacity 200ms ease 50ms'),
      alias: ref('fade'),
    });

    expect(reduced(tokens, '--transition-reduced-alias')).toBe(first!);
  });

  test('an alias of a plain composite', () => {
    const tokens = group('transition', {
      fade: { property: 'opacity', duration: '200ms', timingFunction: 'ease', delay: '50ms' },
      alias: ref('fade'),
    });

    expect(reduced(tokens, '--transition-reduced-alias')).toBe(first!);
  });

  test('a mode value that is an alias', () => {
    const tokens = group('transition', {
      fade: new Transition('opacity 200ms ease 50ms'),
      move: { value: new Transition('transform 1s ease'), modes: { dark: '{fade}' } },
    });
    const output = css({ tokens, plugins: [new ReducedMotionPlugin()] });

    expect(read({ output, name: '--transition-reduced-move', dark: true })).toBe(first!);
  });

  test('a TransitionList keeps every layer', () => {
    const tokens = group('transition', {
      fade: new TransitionList([
        new Transition('opacity 1s ease'),
        new Transition('color 2s ease 50ms'),
      ]),
    });

    expect(reduced(tokens, '--transition-reduced-fade')).toBe(
      'opacity 0s linear, color 0s linear 50ms',
    );
  });

  test('a list string keeps every layer', () => {
    const tokens = group('transition', { fade: 'opacity 1s ease, color 2s ease 50ms' });

    expect(reduced(tokens, '--transition-reduced-fade')).toBe(
      'opacity 0s linear, color 0s linear 50ms',
    );
  });

  test('a value that is not a transition still reduces to no motion', () => {
    const tokens = group('transition', { fade: 'var(--fade)' });

    expect(reduced(tokens, '--transition-reduced-fade')).toBe('0s linear');
  });
});

// ─── PalettePlugin ramps stay monotonic ──────────────────────

describe('PalettePlugin lightness never reverses along a ramp', () => {
  const steps = [50, 100, 300, 500, 700, 900, 950];

  const lightnesses = (seed: string, space?: ColorFormat): number[] => {
    const output = css({
      tokens: group('color', { a: seed }),
      plugins: [new PalettePlugin({ steps, ...(space ? { space } : {}) })],
    });

    return steps.map(step => new Color(read({ output, name: `--color-a-${step}` })!).luminance());
  };

  const SEEDS: [string, string, ColorFormat | undefined][] = [
    ['very light oklch seed', 'oklch(0.98 0.02 100)', undefined],
    ['very dark oklch seed', 'oklch(0.04 0.02 100)', undefined],
    ['very light hsl seed', 'hsl(100 50% 98%)', undefined],
    ['very dark hsl seed', 'hsl(100 50% 4%)', undefined],
    ['very light lch seed', 'lch(98 10 100)', undefined],
    ['very dark lch seed', 'lch(4 10 100)', undefined],
    ['very light hex seed in oklch', '#fefefe', 'oklch'],
    ['very dark hex seed in lab', '#050505', 'lab'],
    ['very light hex seed', '#fefefe', undefined],
    ['very dark hex seed', '#050505', undefined],
    ['mid seed', 'oklch(0.6 0.15 250)', undefined],
  ];

  test.each(SEEDS)('%s', (_label, seed, space) => {
    const values = lightnesses(seed, space);

    for (const [i, value] of values.entries()) {
      if (i > 0) {
        expect(value).toBeLessThanOrEqual(values[i - 1]! + 1e-6);
      }
    }
  });
});

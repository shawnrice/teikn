import { describe, expect, test } from 'bun:test';

import { dp, group, scale, theme, tokens } from '../builders.js';
import { ColorTransformPlugin } from '../Plugins/index.js';
import { Teikn } from '../Teikn.js';
import type { Token } from '../Token.js';
import { Border } from '../TokenTypes/Border.js';
import { BoxShadow } from '../TokenTypes/BoxShadow.js';
import { LinearGradient } from '../TokenTypes/Gradient.js';
import { CssVars } from './CssVars.js';
import { JavaScript } from './JavaScript.js';
import { Json } from './Json.js';
import { Scss } from './Scss.js';
import { ScssVars } from './ScssVars.js';
import { cssValue } from './value-serializers.js';

const generators = () => [
  new CssVars(),
  new Scss(),
  new ScssVars({ filename: 'vars' }),
  new JavaScript(),
  new Json(),
];

describe('plugins run before stringification in every generator', () => {
  const shadows = group('shadow', { s: new BoxShadow('0 1px 2px #336699') });
  const set = tokens(
    shadows,
    group('border', { b: new Border('1px solid #336699') }),
    group('gradient', { g: new LinearGradient(90, ['#336699', '#ffffff']) }),
  );
  const dark = theme('dark', shadows, { s: new BoxShadow('0 1px 2px #ff0000') });
  const out = new Teikn({
    generators: generators(),
    plugins: [new ColorTransformPlugin({ type: 'hsl' })],
    themes: [dark],
  }).generateToStrings(set);

  test.each([...out.keys()])('%s emits hsl for nested colours', file => {
    const content = out.get(file)!;

    // shadow + border + gradient stop share #336699
    expect(content.match(/hsl\(210, 50%, 40%\)/g)?.length).toBeGreaterThanOrEqual(3);
    // gradient second stop and the dark mode value
    expect(content).toContain('hsl(0, 0%, 100%)');
    expect(content).toContain('hsl(0, 100%, 50%)');
    expect(content).not.toMatch(/rgb\(|#336699/);
  });

  test('covers all five generators', () => {
    expect(out.size).toBe(5);
  });
});

describe('emitted-name collisions throw', () => {
  const cases: [string, Token[]][] = [
    ['1-5 / 15', scale('spacing', { '1-5': dp(6), '15': dp(60) })],
    ['blue-100 / blue100', group('color', { 'blue-100': '#00f', blue100: '#00e' })],
    ['textPrimary / text-primary', group('color', { textPrimary: '#000', 'text-primary': '#111' })],
  ];

  for (const [label, set] of cases) {
    test.each([CssVars, Scss, JavaScript, Json])(`${label}: %p`, Gen => {
      expect(() => new Teikn({ generators: [new Gen()] }).generateToStrings(set)).toThrow(
        new RegExp(`Generator \`${Gen.name}\` emits the name .* for two different tokens`),
      );
    });
  }

  test('names the generator, emitted name and both sources', () => {
    const set = scale('spacing', { '1-5': dp(6), '15': dp(60) });

    expect(() => new Teikn({ generators: [new CssVars()] }).generateToStrings(set)).toThrow(
      'Generator `CssVars` emits the name `var(--spacing-15)` for two different tokens: ' +
        '`spacing.15` and `spacing.1-5`.',
    );
  });

  test('same name and type across groups', () => {
    const set: Token[] = [
      { name: 'primary', type: 'color', value: '#111' },
      { name: 'primary', type: 'color', group: 'color', value: '#222' },
      { name: 'primary', type: 'color', group: 'brand', value: '#333' },
    ];

    for (const generator of generators()) {
      expect(() =>
        new Teikn({ generators: [generator], validate: false }).generateToStrings(set),
      ).toThrow('for two different tokens: `primary` and `color.primary`');
    }
  });

  test('ScssVars keeps names verbatim, so 1-5 and 15 do not collide', () => {
    const set = scale('spacing', { '1-5': dp(6), '15': dp(60) });
    const out = new Teikn({ generators: [new ScssVars()] }).generateToStrings(set);

    expect([...out.values()][0]).toContain('$spacing-1-5:');
  });
});

describe('plain border composite', () => {
  test('keeps a zero width', () => {
    expect(cssValue({ width: 0, style: 'solid', color: 'red' })).toBe('0 solid red');
  });
});

import { describe, expect, test } from 'bun:test';

import type { Token } from '../Token';
import { Color } from '../TokenTypes/Color';
import { CubicBezier } from '../TokenTypes/CubicBezier';
import { DTCGGenerator } from './DTCG';

const sampleTokens: Token[] = [
  {
    name: 'color.primary',
    value: new Color(255, 0, 0),
    type: 'color',
    usage: 'Primary brand color',
  },
  { name: 'color.secondary', value: new Color(0, 0, 255), type: 'color' },
  { name: 'spacing.sm', value: '8px', type: 'spacing' },
  { name: 'spacing.md', value: '16px', type: 'spacing' },
  { name: 'timing.ease', value: new CubicBezier(0.42, 0, 0.58, 1), type: 'timing' },
  { name: 'font.body', value: 'Arial, sans-serif', type: 'font-family' },
  { name: 'opacity.muted', value: 0.5, type: 'opacity' },
];

describe('DTCGGenerator', () => {
  test('produces valid JSON', () => {
    const gen = new DTCGGenerator();
    const output = gen.generate(sampleTokens);
    expect(() => JSON.parse(output)).not.toThrow();
  });

  test('file extension is .tokens.json', () => {
    const gen = new DTCGGenerator();
    expect(gen.file).toBe('tokens.tokens.json');
  });

  test('custom filename works', () => {
    const gen = new DTCGGenerator({ filename: 'design' });
    expect(gen.file).toBe('design.tokens.json');
  });

  test('describe() returns correct info', () => {
    const gen = new DTCGGenerator();
    const info = gen.describe();
    expect(info!.format).toBe('DTCG');
    expect(info!.usage).toContain('DTCG');
  });

  test('tokenUsage returns null', () => {
    const gen = new DTCGGenerator();
    expect(gen.tokenUsage(sampleTokens[0]!)).toBeNull();
  });

  test('snapshot test with standard token set', () => {
    const gen = new DTCGGenerator();
    expect(gen.generate(sampleTokens)).toMatchSnapshot();
  });

  test('hierarchical output reconstructs groups', () => {
    const gen = new DTCGGenerator({ hierarchical: true });
    const output = JSON.parse(gen.generate(sampleTokens));
    expect(output.color).toBeDefined();
    expect(output.color.primary).toBeDefined();
    expect(output.spacing).toBeDefined();
  });

  test('flat output mode', () => {
    const gen = new DTCGGenerator({ hierarchical: false });
    const output = JSON.parse(gen.generate(sampleTokens));
    expect(output['color.primary']).toBeDefined();
    expect(output['spacing.sm']).toBeDefined();
    expect(output.color).toBeUndefined();
  });

  test('custom separator', () => {
    const tokens: Token[] = [
      { name: 'color/primary', value: new Color(255, 0, 0), type: 'color' },
      { name: 'color/secondary', value: new Color(0, 0, 255), type: 'color' },
    ];
    const gen = new DTCGGenerator({ separator: '/' });
    const output = JSON.parse(gen.generate(tokens));
    expect(output.color).toBeDefined();
    expect(output.color.primary).toBeDefined();
  });

  test('tokens with modes include $extensions.mode', () => {
    const tokens: Token[] = [
      {
        name: 'surface',
        value: new Color(255, 255, 255),
        type: 'color',
        modes: { dark: new Color(26, 26, 26) },
      },
    ];
    const gen = new DTCGGenerator();
    const output = JSON.parse(gen.generate(tokens));
    expect(output.surface.$extensions).toBeDefined();
    expect(output.surface.$extensions.mode.dark).toBeDefined();
    expect(output.surface.$extensions.mode.dark.colorSpace).toBe('srgb');
  });
});

import { describe, expect, test } from 'bun:test';

import type { Token } from '../Token.js';
import { Color } from '../TokenTypes/Color/index.js';
import { PalettePlugin } from './PalettePlugin.js';

describe('PalettePlugin', () => {
  const plugin = new PalettePlugin();

  test('tokenType matches color', () => {
    expect(plugin.tokenType).toBe('color');
  });

  test('outputType matches anything', () => {
    expect(plugin.outputType.test('css')).toBe(true);
    expect(plugin.outputType.test('scss')).toBe(true);
    expect(plugin.outputType.test('json')).toBe(true);
  });

  test('transform returns token unchanged', () => {
    const token: Token = { name: 'primary', type: 'color', value: new Color('#3366ff') };
    const result = plugin.transform(token);
    expect(result).toBe(token);
  });

  test('expand passes through non-color tokens', () => {
    const token: Token = { name: 'spacing-sm', type: 'spacing', value: '8px' };
    const result = plugin.expand([token]);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(token);
  });

  test('expand generates palette tokens for color tokens', () => {
    const token: Token = { name: 'primary', type: 'color', value: new Color('#3366ff') };
    const result = plugin.expand([token]);

    // Original + 11 default steps
    expect(result).toHaveLength(12);
    expect(result[0]).toBe(token);
  });

  test('expand generates tokens with correct names', () => {
    const token: Token = { name: 'brand', type: 'color', value: new Color('#ff5500') };
    const result = plugin.expand([token]);

    const names = result.map(t => t.name);
    expect(names).toContain('brand');
    expect(names).toContain('brand-50');
    expect(names).toContain('brand-500');
    expect(names).toContain('brand-950');
  });

  test('step 500 preserves the original color', () => {
    const baseColor = new Color('#3366ff');
    const token: Token = { name: 'primary', type: 'color', value: baseColor };
    const result = plugin.expand([token]);

    const step500 = result.find(t => t.name === 'primary-500');
    expect(step500).toBeDefined();
    expect(step500!.value.toString()).toBe(baseColor.toString());
  });

  test('lighter steps are lighter than the base color', () => {
    const baseColor = new Color('#3366ff');
    const token: Token = { name: 'primary', type: 'color', value: baseColor };
    const result = plugin.expand([token]);

    const step50 = result.find(t => t.name === 'primary-50');
    expect(step50).toBeDefined();
    const lightColor = new Color(step50!.value);
    expect(lightColor.lightness).toBeGreaterThan(baseColor.lightness);
  });

  test('darker steps are darker than the base color', () => {
    const baseColor = new Color('#3366ff');
    const token: Token = { name: 'primary', type: 'color', value: baseColor };
    const result = plugin.expand([token]);

    const step900 = result.find(t => t.name === 'primary-900');
    expect(step900).toBeDefined();
    const darkColor = new Color(step900!.value);
    expect(darkColor.lightness).toBeLessThan(baseColor.lightness);
  });

  test('custom steps option', () => {
    const customPlugin = new PalettePlugin({ steps: [100, 500, 900] });
    const token: Token = { name: 'accent', type: 'color', value: new Color('#00cc88') };
    const result = customPlugin.expand([token]);

    // Original + 3 steps
    expect(result).toHaveLength(4);
    const names = result.map(t => t.name);
    expect(names).toContain('accent-100');
    expect(names).toContain('accent-500');
    expect(names).toContain('accent-900');
  });

  test('multiple color tokens each get palettes', () => {
    const tokens: Token[] = [
      { name: 'primary', type: 'color', value: new Color('#3366ff') },
      { name: 'secondary', type: 'color', value: new Color('#ff6633') },
    ];
    const result = plugin.expand(tokens);

    // 2 originals + 2 * 11 steps
    expect(result).toHaveLength(24);
    expect(result.filter(t => t.name.startsWith('primary'))).toHaveLength(12);
    expect(result.filter(t => t.name.startsWith('secondary'))).toHaveLength(12);
  });

  test('generated tokens preserve type and group', () => {
    const token: Token = {
      name: 'brand',
      type: 'color',
      value: new Color('#ff0000'),
      group: 'colors',
    };
    const result = plugin.expand([token]);

    const step200 = result.find(t => t.name === 'brand-200');
    expect(step200!.type).toBe('color');
    expect(step200!.group).toBe('colors');
  });

  // ─── Color space ─────────────────────────────────────────────

  const valueOf = (tokens: Token[], name: string): string =>
    String(tokens.find(t => t.name === name)!.value);

  test('auto (default) keeps an oklch-authored base in oklch', () => {
    const token: Token = { name: 'brand', type: 'color', value: new Color('oklch(0.65 0.2 250)') };
    const result = new PalettePlugin({ steps: [50, 500, 950] }).expand([token]);

    // Every step stays in oklch, holding hue + chroma while lightness moves.
    for (const name of ['brand-50', 'brand-500', 'brand-950']) {
      expect(valueOf(result, name)).toMatch(/^oklch\(/);
      expect(valueOf(result, name)).toContain('0.2 250');
    }

    expect(new Color(valueOf(result, 'brand-50')).oklch.lightness()).toBeGreaterThan(
      new Color(valueOf(result, 'brand-950')).oklch.lightness(),
    );
  });

  test('auto keeps an rgb/hex base in RGB (backward compatible)', () => {
    const token: Token = { name: 'brand', type: 'color', value: '#3b82f6' };
    const result = new PalettePlugin({ steps: [50, 500, 950] }).expand([token]);

    expect(valueOf(result, 'brand-50')).toMatch(/^rgb\(/);
    expect(valueOf(result, 'brand-950')).toMatch(/^rgb\(/);
  });

  test('explicit space forces the ramp into that space', () => {
    const token: Token = { name: 'brand', type: 'color', value: '#3b82f6' };
    const result = new PalettePlugin({ steps: [50, 500, 950], space: 'oklch' }).expand([token]);

    expect(valueOf(result, 'brand-50')).toMatch(/^oklch\(/);
    expect(valueOf(result, 'brand-500')).toMatch(/^oklch\(/);
    expect(valueOf(result, 'brand-950')).toMatch(/^oklch\(/);
  });

  test('space: hsl holds hue and saturation while moving lightness', () => {
    const token: Token = { name: 'brand', type: 'color', value: '#3b82f6' };
    const result = new PalettePlugin({ steps: [50, 500, 950], space: 'hsl' }).expand([token]);

    const light = new Color(valueOf(result, 'brand-50'));
    const dark = new Color(valueOf(result, 'brand-950'));
    expect(valueOf(result, 'brand-50')).toMatch(/^hsl\(/);
    expect(light.lightness).toBeGreaterThan(dark.lightness);
    // Hue is preserved across the ramp.
    expect(light.hue).toBeCloseTo(dark.hue, 1);
  });
});

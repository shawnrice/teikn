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

// ─── Modes and references ──────────────────────────────────────

describe('PalettePlugin: modes and references', () => {
  const plugin = new PalettePlugin({ steps: [50, 500, 950] });
  const step = (tokens: Token[], name: string): Token => tokens.find(t => t.name === name)!;
  const modeColor = (t: Token, mode: string): Color => new Color(t.modes![mode] as string | Color);

  test('an authored mode on the seed is rampified onto every step', () => {
    const token: Token = {
      name: 'brand',
      type: 'color',
      value: '#3b82f6',
      modes: { dark: '#1e3a8a' },
    };
    const result = plugin.expand([token]);

    // Step 500 holds the mode's own base; the ramp moves its lightness.
    expect(modeColor(step(result, 'brand-500'), 'dark').lightness).toBeCloseTo(
      new Color('#1e3a8a').lightness,
      5,
    );
    expect(modeColor(step(result, 'brand-50'), 'dark').lightness).toBeGreaterThan(
      modeColor(step(result, 'brand-950'), 'dark').lightness,
    );
    // The dark ramp is distinct from the default ramp.
    expect(String(step(result, 'brand-500').modes!.dark)).not.toBe(
      String(step(result, 'brand-500').value),
    );
  });

  test('a {ref} default seed rampifies its target', () => {
    const tokens: Token[] = [
      { name: 'primary', type: 'color', value: '#3b82f6' },
      { name: 'brand', type: 'color', value: '{primary}' },
    ];
    const result = plugin.expand(tokens);

    // brand's ramp equals primary's ramp, step for step.
    expect(String(step(result, 'brand-500').value)).toBe(String(step(result, 'primary-500').value));
    expect(String(step(result, 'brand-50').value)).toBe(String(step(result, 'primary-50').value));
  });

  test('a {ref} mode seed rampifies per mode', () => {
    const tokens: Token[] = [
      { name: 'primary-dark', type: 'color', value: '#1e3a8a' },
      { name: 'brand', type: 'color', value: '#3b82f6', modes: { dark: '{primary-dark}' } },
    ];
    const result = plugin.expand(tokens);

    expect(modeColor(step(result, 'brand-500'), 'dark').lightness).toBeCloseTo(
      new Color('#1e3a8a').lightness,
      5,
    );
  });

  test("a {ref} seed follows its target's modes", () => {
    const tokens: Token[] = [
      { name: 'primary', type: 'color', value: '#3b82f6', modes: { dark: '#1e3a8a' } },
      { name: 'brand', type: 'color', value: '{primary}' },
      { name: 'plain', type: 'color', value: '#00cc88' },
    ];
    const result = plugin.expand(tokens);

    for (const name of ['brand-50', 'brand-500', 'brand-950']) {
      expect(String(step(result, name).modes!.dark)).toBe(
        String(step(result, name.replace('brand', 'primary')).modes!.dark),
      );
    }

    // A seed no mode reaches stays mode-free.
    expect(step(result, 'plain-500').modes).toBeUndefined();
  });

  test('a mode referencing a generated step leaves the steps on their default', () => {
    const tokens: Token[] = [
      { name: 'brand', type: 'color', value: '#3b82f6' },
      { name: 'surface', type: 'color', value: '#ffffff', modes: { dark: '{brand-950}' } },
    ];
    const result = plugin.expand(tokens);

    // The seed keeps its mode for the full resolve pass; the steps carry none.
    expect(step(result, 'surface').modes).toEqual({ dark: '{brand-950}' });
    expect(step(result, 'surface-500').modes).toBeUndefined();
  });

  test('an alias of a generated step passes through without a ramp', () => {
    const tokens: Token[] = [
      { name: 'brand', type: 'color', value: '#3b82f6' },
      { name: 'text', type: 'color', value: '{brand-950}' },
    ];
    const result = plugin.expand(tokens);

    expect(result.filter(t => t.name.startsWith('text'))).toEqual([tokens[1]!]);
  });
});

import { describe, expect, test } from 'bun:test';

import { group } from '../builders.js';
import { CssVars } from '../Generators/index.js';
import { Teikn } from '../Teikn.js';
import type { Token } from '../Token.js';
import { DeprecationPlugin } from './DeprecationPlugin.js';

describe('DeprecationPlugin', () => {
  const plugin = new DeprecationPlugin({ tokens: { oldColor: 'newColor', legacySpacing: true } });

  test('tokenType and outputType match everything', () => {
    expect(plugin.tokenType.test('color')).toBe(true);
    expect(plugin.tokenType.test('spacing')).toBe(true);
    expect(plugin.outputType.test('json')).toBe(true);
  });

  test('returns token unchanged when not in deprecation map', () => {
    const token: Token = { name: 'primary', type: 'color', value: '#000' };
    const result = plugin.transform(token);
    expect(result).toBe(token);
  });

  test('marks token as deprecated with replacement', () => {
    const token: Token = { name: 'oldColor', type: 'color', value: '#f00' };
    const result = plugin.transform(token) as Token & { deprecated: boolean; replacement: string };
    expect(result.deprecated).toBe(true);
    expect(result.replacement).toBe('newColor');
    expect(result.usage).toBe('DEPRECATED: use "newColor" instead.');
  });

  test('marks token as deprecated without replacement', () => {
    const token: Token = { name: 'legacySpacing', type: 'spacing', value: '8px' };
    const result = plugin.transform(token) as Token & { deprecated: boolean };
    expect(result.deprecated).toBe(true);
    expect((result as any).replacement).toBeUndefined();
    expect(result.usage).toBe('DEPRECATED.');
  });

  test('prepends deprecation notice to existing usage', () => {
    const token: Token = {
      name: 'oldColor',
      type: 'color',
      value: '#f00',
      usage: 'Use for headings',
    };
    const result = plugin.transform(token);
    expect(result.usage).toBe('DEPRECATED: use "newColor" instead. Use for headings');
  });

  test('preserves other token fields', () => {
    const token: Token = { name: 'oldColor', type: 'color', value: '#f00', group: 'brand' };
    const result = plugin.transform(token);
    expect(result.type).toBe('color');
    expect(result.value).toBe('#f00');
    expect(result.group).toBe('brand');
  });
});

describe('DeprecationPlugin in the pipeline', () => {
  const tokens = group('color', { old: '#000', valueOf: '#111' });

  test.each(['old', 'color.old', 'color-old'])('key "%s" marks the token deprecated', key => {
    const writer = new Teikn({
      generators: [new CssVars({ version: 'test' })],
      plugins: [new DeprecationPlugin({ tokens: { [key]: 'new' } })],
    });
    const css = writer.generateToStrings(tokens).get('tokens.css')!;
    expect(css).toContain('/* DEPRECATED: use "new" instead. */\n  --color-old: #000;');
    expect(writer.audit(tokens)).toEqual([]);
  });

  test('inherited Object.prototype names are not treated as configured', () => {
    const plugin = new DeprecationPlugin({ tokens: {} });
    const token: Token = { name: 'valueOf', type: 'color', value: '#111' };
    expect(plugin.transform(token)).toBe(token);
    expect(plugin.transform({ ...token, name: 'constructor' }).deprecated).toBeUndefined();
  });

  test('audit reports a configured key that matches no token', () => {
    const plugin = new DeprecationPlugin({ tokens: { old: true, oldd: 'new' } });
    expect(plugin.audit(tokens)).toEqual([
      {
        severity: 'warning',
        token: 'oldd',
        message: 'DeprecationPlugin: "oldd" matches no token, so nothing is marked deprecated',
      },
    ]);
  });
});

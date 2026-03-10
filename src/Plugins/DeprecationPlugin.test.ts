import { describe, expect, test } from 'bun:test';

import type { Token } from '../Token';
import { DeprecationPlugin } from './DeprecationPlugin';

describe('DeprecationPlugin', () => {
  const plugin = new DeprecationPlugin({
    tokens: {
      oldColor: 'newColor',
      legacySpacing: true,
    },
  });

  test('tokenType and outputType match everything', () => {
    expect(plugin.tokenType.test('color')).toBe(true);
    expect(plugin.tokenType.test('spacing')).toBe(true);
    expect(plugin.outputType.test('json')).toBe(true);
  });

  test('returns token unchanged when not in deprecation map', () => {
    const token: Token = { name: 'primary', type: 'color', value: '#000' };
    const result = plugin.toJSON(token);
    expect(result).toBe(token);
  });

  test('marks token as deprecated with replacement', () => {
    const token: Token = { name: 'oldColor', type: 'color', value: '#f00' };
    const result = plugin.toJSON(token) as Token & { deprecated: boolean; replacement: string };
    expect(result.deprecated).toBe(true);
    expect(result.replacement).toBe('newColor');
    expect(result.usage).toBe('DEPRECATED: use "newColor" instead.');
  });

  test('marks token as deprecated without replacement', () => {
    const token: Token = { name: 'legacySpacing', type: 'spacing', value: '8px' };
    const result = plugin.toJSON(token) as Token & { deprecated: boolean };
    expect(result.deprecated).toBe(true);
    expect((result as any).replacement).toBeUndefined();
    expect(result.usage).toBe('DEPRECATED.');
  });

  test('prepends deprecation notice to existing usage', () => {
    const token: Token = { name: 'oldColor', type: 'color', value: '#f00', usage: 'Use for headings' };
    const result = plugin.toJSON(token);
    expect(result.usage).toBe('DEPRECATED: use "newColor" instead. Use for headings');
  });

  test('preserves other token fields', () => {
    const token: Token = { name: 'oldColor', type: 'color', value: '#f00', group: 'brand' };
    const result = plugin.toJSON(token);
    expect(result.type).toBe('color');
    expect(result.value).toBe('#f00');
    expect(result.group).toBe('brand');
  });
});

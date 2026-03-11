import { describe, expect, test } from 'bun:test';

import type { Token } from '../Token';
import { Color } from '../TokenTypes/Color';
import { PerceptualDistancePlugin } from './PerceptualDistancePlugin';

describe('PerceptualDistancePlugin', () => {
  const makeToken = (name: string, value: string | Color): Token => ({
    name,
    type: 'color',
    value,
  });

  test('tokenType and outputType', () => {
    const plugin = new PerceptualDistancePlugin({});
    expect(plugin.tokenType).toBe('color');
    expect(plugin.outputType.test('css')).toBe(true);
  });

  test('toJSON returns token unchanged', () => {
    const plugin = new PerceptualDistancePlugin({});
    const token = makeToken('red', '#ff0000');
    expect(plugin.toJSON(token)).toBe(token);
  });

  test('passes when colors are sufficiently distinct', () => {
    const plugin = new PerceptualDistancePlugin({});
    const tokens = [makeToken('red', '#ff0000'), makeToken('blue', '#0000ff')];
    const issues = plugin.audit!(tokens);
    expect(issues).toHaveLength(0);
  });

  test('warns when colors are too similar', () => {
    const plugin = new PerceptualDistancePlugin({});
    const tokens = [makeToken('gray-a', '#808080'), makeToken('gray-b', '#828282')];
    const issues = plugin.audit!(tokens);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.severity).toBe('warning');
    expect(issues[0]!.message).toContain('ΔE');
    expect(issues[0]!.message).toContain('gray-a');
    expect(issues[0]!.message).toContain('gray-b');
  });

  test('respects custom minDeltaE', () => {
    const plugin = new PerceptualDistancePlugin({ minDeltaE: 50 });
    const tokens = [makeToken('red', '#ff0000'), makeToken('orange', '#ff8800')];
    const issues = plugin.audit!(tokens);
    expect(issues).toHaveLength(1);
  });

  test('compares only within specified groups', () => {
    const plugin = new PerceptualDistancePlugin({
      groups: [['gray-a', 'gray-b']],
    });
    const tokens = [
      makeToken('gray-a', '#808080'),
      makeToken('gray-b', '#828282'),
      makeToken('gray-c', '#838383'),
    ];
    const issues = plugin.audit!(tokens);
    // Only gray-a vs gray-b compared; gray-c is not in any group
    expect(issues).toHaveLength(1);
    expect(issues[0]!.message).toContain('gray-a');
    expect(issues[0]!.message).toContain('gray-b');
  });

  test('skips non-color tokens', () => {
    const plugin = new PerceptualDistancePlugin({});
    const tokens: Token[] = [
      makeToken('red', '#ff0000'),
      { name: 'spacing', type: 'spacing', value: '16px' },
    ];
    const issues = plugin.audit!(tokens);
    expect(issues).toHaveLength(0);
  });

  test('handles Color instances as values', () => {
    const plugin = new PerceptualDistancePlugin({});
    const tokens = [makeToken('a', new Color('#808080')), makeToken('b', new Color('#818181'))];
    const issues = plugin.audit!(tokens);
    expect(issues).toHaveLength(1);
  });

  test('skips invalid color values gracefully', () => {
    const plugin = new PerceptualDistancePlugin({});
    const tokens: Token[] = [
      makeToken('red', '#ff0000'),
      { name: 'bad', type: 'color', value: 'not-a-color' },
    ];
    // Should not throw; skips the invalid token
    const issues = plugin.audit!(tokens);
    expect(issues).toHaveLength(0);
  });

  test('includes actual deltaE value in the message', () => {
    const plugin = new PerceptualDistancePlugin({});
    const tokens = [makeToken('a', '#808080'), makeToken('b', '#808081')];
    const issues = plugin.audit!(tokens);
    expect(issues).toHaveLength(1);
    // The message should contain a numeric ΔE value
    const match = issues[0]!.message.match(/ΔE = (\d+\.?\d*)/);
    expect(match).not.toBeNull();
    const deltaE = parseFloat(match![1]!);
    expect(deltaE).toBeGreaterThan(0);
    expect(deltaE).toBeLessThan(5);
  });

  test('compares all pairs when no groups specified', () => {
    const plugin = new PerceptualDistancePlugin({ minDeltaE: 100 });
    const tokens = [
      makeToken('a', '#ff0000'),
      makeToken('b', '#00ff00'),
      makeToken('c', '#0000ff'),
    ];
    // 3 tokens = 3 pairs (a-b, a-c, b-c), all likely below 100
    const issues = plugin.audit!(tokens);
    expect(issues).toHaveLength(3);
  });
});

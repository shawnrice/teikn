import { describe, expect, test } from 'bun:test';

import type { Token } from '../Token';
import { Color } from '../TokenTypes/Color';
import { ContrastValidatorPlugin } from './ContrastValidatorPlugin';

describe('ContrastValidatorPlugin', () => {
  const makeToken = (name: string, value: string | Color): Token => ({
    name,
    type: 'color',
    value,
  });

  test('tokenType and outputType', () => {
    const plugin = new ContrastValidatorPlugin({ pairs: [] });
    expect(plugin.tokenType).toBe('color');
    expect(plugin.outputType.test('css')).toBe(true);
  });

  test('toJSON returns token unchanged', () => {
    const plugin = new ContrastValidatorPlugin({ pairs: [] });
    const token = makeToken('fg', '#000');
    expect(plugin.toJSON(token)).toBe(token);
  });

  test('passes when contrast ratio meets AA threshold', () => {
    const plugin = new ContrastValidatorPlugin({
      pairs: [{ foreground: 'fg', background: 'bg' }],
    });
    const tokens = [makeToken('fg', '#000000'), makeToken('bg', '#ffffff')];
    const issues = plugin.audit!(tokens);
    expect(issues).toHaveLength(0);
  });

  test('reports error when contrast ratio is below AA threshold', () => {
    const plugin = new ContrastValidatorPlugin({
      pairs: [{ foreground: 'fg', background: 'bg' }],
    });
    const tokens = [makeToken('fg', '#777777'), makeToken('bg', '#888888')];
    const issues = plugin.audit!(tokens);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.severity).toBe('error');
    expect(issues[0]!.message).toContain('WCAG AA');
    expect(issues[0]!.message).toContain('4.5:1');
  });

  test('uses AAA threshold when specified', () => {
    const plugin = new ContrastValidatorPlugin({
      pairs: [{ foreground: 'fg', background: 'bg', level: 'AAA' }],
    });
    // Black on medium gray — passes AA (4.5:1) but fails AAA (7:1)
    const tokens = [makeToken('fg', '#000000'), makeToken('bg', '#767676')];
    const issues = plugin.audit!(tokens);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.message).toContain('WCAG AAA');
    expect(issues[0]!.message).toContain('7:1');
  });

  test('uses custom minRatio when specified', () => {
    const plugin = new ContrastValidatorPlugin({
      pairs: [{ foreground: 'fg', background: 'bg' }],
      minRatio: 3,
    });
    // A pair that meets 3:1 but not 4.5:1
    const tokens = [makeToken('fg', '#767676'), makeToken('bg', '#ffffff')];
    const issues = plugin.audit!(tokens);
    expect(issues).toHaveLength(0);
  });

  test('reports error when foreground token is not found', () => {
    const plugin = new ContrastValidatorPlugin({
      pairs: [{ foreground: 'missing-fg', background: 'bg' }],
    });
    const tokens = [makeToken('bg', '#fff')];
    const issues = plugin.audit!(tokens);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.severity).toBe('error');
    expect(issues[0]!.message).toContain('not found');
  });

  test('reports error when background token is not found', () => {
    const plugin = new ContrastValidatorPlugin({
      pairs: [{ foreground: 'fg', background: 'missing-bg' }],
    });
    const tokens = [makeToken('fg', '#000')];
    const issues = plugin.audit!(tokens);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.message).toContain('not found');
  });

  test('works with Color instances as values', () => {
    const plugin = new ContrastValidatorPlugin({
      pairs: [{ foreground: 'fg', background: 'bg' }],
    });
    const tokens = [makeToken('fg', new Color('#000000')), makeToken('bg', new Color('#ffffff'))];
    const issues = plugin.audit!(tokens);
    expect(issues).toHaveLength(0);
  });

  test('checks multiple pairs', () => {
    const plugin = new ContrastValidatorPlugin({
      pairs: [
        { foreground: 'fg', background: 'bg' },
        { foreground: 'low-fg', background: 'low-bg' },
      ],
    });
    const tokens = [
      makeToken('fg', '#000000'),
      makeToken('bg', '#ffffff'),
      makeToken('low-fg', '#aaaaaa'),
      makeToken('low-bg', '#bbbbbb'),
    ];
    const issues = plugin.audit!(tokens);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.token).toBe('low-fg');
  });
});

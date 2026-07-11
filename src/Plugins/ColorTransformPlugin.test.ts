import { describe, expect, test } from 'bun:test';

import type { Token } from '../Token.js';
import { Border } from '../TokenTypes/Border.js';
import { BoxShadow } from '../TokenTypes/BoxShadow.js';
import { Color } from '../TokenTypes/Color/index.js';
import { LinearGradient } from '../TokenTypes/Gradient.js';
import { ColorTransformPlugin } from './ColorTransformPlugin.js';

describe('ColorTransformPlugin', () => {
  const makeToken = (name: string, value: unknown): Token => ({ name, type: 'color', value });

  test('tokenType matches every type (colors can be nested in composites)', () => {
    const plugin = new ColorTransformPlugin({ type: 'hex' });
    expect(plugin.tokenType).toBeInstanceOf(RegExp);
    expect((plugin.tokenType as RegExp).test('shadow')).toBe(true);
    expect((plugin.tokenType as RegExp).test('color')).toBe(true);
  });

  test('transforms a color string to the specified format', () => {
    const plugin = new ColorTransformPlugin({ type: 'rgb' });
    const token = makeToken('primary', '#ff0000');
    const result = plugin.transform(token);
    expect(result.value).toBe('rgb(255, 0, 0)');
  });

  test('transforms a Color instance to the specified format', () => {
    const plugin = new ColorTransformPlugin({ type: 'hex' });
    const token = makeToken('primary', new Color(255, 0, 0));
    const result = plugin.transform(token);
    expect(result.value).toBe('#ff0000');
  });

  test('passes ref strings through unchanged', () => {
    const plugin = new ColorTransformPlugin({ type: 'hex' });
    const token = makeToken('alias', '{primary}');
    const result = plugin.transform(token);
    expect(result).toBe(token);
    expect(result.value).toBe('{primary}');
  });

  test('passes nested ref strings through unchanged', () => {
    const plugin = new ColorTransformPlugin({ type: 'rgb' });
    const token = makeToken('alias', '{colors.primary.500}');
    const result = plugin.transform(token);
    expect(result).toBe(token);
  });

  describe('colors nested in composites', () => {
    test('re-bases a color inside a BoxShadow into the target space', () => {
      const plugin = new ColorTransformPlugin({ type: 'hsl' });
      const shadow = new BoxShadow({ offsetY: 2, blur: 8, color: new Color(255, 0, 0) });
      const result = plugin.transform({ name: 'card', type: 'shadow', value: shadow });
      const { color } = result.value as BoxShadow;
      expect(color).toBeInstanceOf(Color);
      expect(String(color)).toBe('hsl(0, 100%, 50%)');
    });

    test('re-bases a color inside a Border', () => {
      const plugin = new ColorTransformPlugin({ type: 'rgb' });
      const border = new Border({
        width: '1px',
        style: 'solid',
        color: new Color('hsl(0, 100%, 50%)'),
      });
      const result = plugin.transform({ name: 'edge', type: 'border', value: border });
      expect(String((result.value as Border).color)).toBe('rgb(255, 0, 0)');
    });

    test('re-bases gradient stop colors', () => {
      const plugin = new ColorTransformPlugin({ type: 'rgb' });
      const grad = new LinearGradient(180, [
        [new Color('hsl(0, 100%, 50%)'), '0%'],
        [new Color('hsl(240, 100%, 50%)'), '100%'],
      ]);
      const result = plugin.transform({ name: 'sweep', type: 'gradient', value: grad });
      const { stops } = result.value as LinearGradient;
      expect(String(stops[0]!.color)).toBe('rgb(255, 0, 0)');
      expect(String(stops[1]!.color)).toBe('rgb(0, 0, 255)');
    });

    test('leaves an unresolved ref color inside a shadow untouched', () => {
      const plugin = new ColorTransformPlugin({ type: 'rgb' });
      const shadow = new BoxShadow({ offsetY: 2, blur: 8, color: '{ink}' });
      const result = plugin.transform({ name: 'card', type: 'shadow', value: shadow });
      expect((result.value as BoxShadow).color).toBe('{ink}');
    });

    test('leaves non-color tokens unchanged (referential identity)', () => {
      const plugin = new ColorTransformPlugin({ type: 'rgb' });
      const token: Token = { name: 'size', type: 'dimension', value: '16px' };
      expect(plugin.transform(token)).toBe(token);
    });
  });

  describe('audit', () => {
    test('returns no issues when format is not hex', () => {
      const plugin = new ColorTransformPlugin({ type: 'rgb' });
      const tokens = [makeToken('fade', 'rgba(255, 0, 0, 0.5)')];
      const issues = plugin.audit!(tokens);
      expect(issues).toHaveLength(0);
    });

    test('returns no issues for opaque hex colors', () => {
      const plugin = new ColorTransformPlugin({ type: 'hex' });
      const tokens = [makeToken('solid', '#ff0000')];
      const issues = plugin.audit!(tokens);
      expect(issues).toHaveLength(0);
    });

    test('warns when hex format would discard alpha', () => {
      const plugin = new ColorTransformPlugin({ type: 'hex' });
      const tokens = [makeToken('fade', 'rgba(255, 0, 0, 0.5)')];
      const issues = plugin.audit!(tokens);
      expect(issues).toHaveLength(1);
      expect(issues[0]!.severity).toBe('warning');
      expect(issues[0]!.token).toBe('fade');
      expect(issues[0]!.message).toContain('alpha');
      expect(issues[0]!.message).toContain('hex');
    });

    test('warns when hex3 format would discard alpha', () => {
      const plugin = new ColorTransformPlugin({ type: 'hex3' });
      const tokens = [makeToken('fade', new Color(255, 0, 0, 0.5))];
      const issues = plugin.audit!(tokens);
      expect(issues).toHaveLength(1);
      expect(issues[0]!.severity).toBe('warning');
    });

    test('skips ref strings during audit', () => {
      const plugin = new ColorTransformPlugin({ type: 'hex' });
      const tokens = [makeToken('alias', '{primary}')];
      const issues = plugin.audit!(tokens);
      expect(issues).toHaveLength(0);
    });

    test('skips non-color tokens during audit', () => {
      const plugin = new ColorTransformPlugin({ type: 'hex' });
      const tokens: Token[] = [{ name: 'size', type: 'dimension', value: '16px' }];
      const issues = plugin.audit!(tokens);
      expect(issues).toHaveLength(0);
    });

    test('warns for a translucent color nested in a shadow', () => {
      const plugin = new ColorTransformPlugin({ type: 'hex' });
      const shadow = new BoxShadow({ offsetY: 2, blur: 8, color: new Color(0, 0, 0, 0.5) });
      const issues = plugin.audit!([{ name: 'card', type: 'shadow', value: shadow }]);
      expect(issues).toHaveLength(1);
      expect(issues[0]!.token).toBe('card');
      expect(issues[0]!.message).toContain('alpha');
    });
  });
});

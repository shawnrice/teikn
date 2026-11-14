import { describe, expect, test } from 'bun:test';

import { ref, scale } from '../builders.js';
import type { Token } from '../Token.js';
import { Dimension } from '../TokenTypes/Dimension.js';
import { ClampPlugin } from './ClampPlugin.js';

describe('ClampPlugin', () => {
  const plugin = new ClampPlugin({
    pairs: [{ min: 'fontSize-100', max: 'fontSize-400', output: 'fontSize-fluid' }],
  });

  test('tokenType matches anything', () => {
    expect(plugin.tokenType.test('dimension')).toBe(true);
    expect(plugin.tokenType.test('color')).toBe(true);
  });

  test('outputType matches anything', () => {
    expect(plugin.outputType.test('css')).toBe(true);
    expect(plugin.outputType.test('json')).toBe(true);
  });

  test('transform returns token unchanged', () => {
    const token: Token = { name: 'fontSize-100', type: 'dimension', value: '1rem' };
    const result = plugin.transform(token);
    expect(result).toBe(token);
  });

  test('expand with no pairs returns tokens unchanged', () => {
    const emptyPlugin = new ClampPlugin();
    const tokens: Token[] = [{ name: 'fontSize-100', type: 'dimension', value: '1rem' }];
    const result = emptyPlugin.expand(tokens);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(tokens[0]);
  });

  test('expand generates clamp token from rem pairs', () => {
    const tokens: Token[] = [
      { name: 'fontSize-100', type: 'dimension', value: new Dimension(1, 'rem') },
      { name: 'fontSize-400', type: 'dimension', value: new Dimension(2, 'rem') },
    ];
    const result = plugin.expand(tokens);

    expect(result).toHaveLength(3);
    const fluid = result[2]!;
    expect(fluid.name).toBe('fontSize-fluid');
    expect(fluid.type).toBe('dimension');
    expect(fluid.value).toContain('clamp(');
    expect(fluid.value).toContain('1rem');
    expect(fluid.value).toContain('2rem');
    expect(fluid.value).toContain('vw');
  });

  test('expand generates clamp token from px pairs', () => {
    const tokens: Token[] = [
      { name: 'fontSize-100', type: 'dimension', value: new Dimension(16, 'px') },
      { name: 'fontSize-400', type: 'dimension', value: new Dimension(32, 'px') },
    ];
    const result = plugin.expand(tokens);

    const fluid = result[2]!;
    expect(fluid.name).toBe('fontSize-fluid');
    expect(fluid.value).toContain('clamp(');
    expect(fluid.value).toContain('1rem');
    expect(fluid.value).toContain('2rem');
  });

  test('expand generates clamp token from string values', () => {
    const tokens: Token[] = [
      { name: 'fontSize-100', type: 'dimension', value: '1rem' },
      { name: 'fontSize-400', type: 'dimension', value: '2.5rem' },
    ];
    const result = plugin.expand(tokens);

    const fluid = result[2]!;
    expect(fluid.name).toBe('fontSize-fluid');
    expect(fluid.value).toContain('clamp(');
    expect(fluid.value).toContain('1rem');
    expect(fluid.value).toContain('2.5rem');
  });

  test('expand throws when a pair names a missing token', () => {
    const pluginWithMissing = new ClampPlugin({
      pairs: [{ min: 'fontSize-100', max: 'missing-max', output: 'missing-fluid' }],
    });
    const tokens: Token[] = [{ name: 'fontSize-100', type: 'dimension', value: '1rem' }];
    expect(() => pluginWithMissing.expand(tokens)).toThrow(
      'ClampPlugin pair "missing-fluid": max token "missing-max" was not found',
    );
  });

  test.each([
    ['bare', '100', '700'],
    ['qualified', 'fontSize.100', 'fontSize.700'],
    ['prefixed', 'fontSize-100', 'fontSize-700'],
  ])('expand accepts %s names for builder tokens', (_label, min, max) => {
    const fluid = new ClampPlugin({ pairs: [{ min, max, output: 'fluid' }] })
      .expand(scale('fontSize', { 100: '16px', 700: '32px' }))
      .at(-1)!;
    expect(fluid).toMatchObject({ name: 'fluid', type: 'fontSize' });
    expect(fluid.value).toBe('clamp(1rem, 0.6667rem + 1.6667vw, 2rem)');
  });

  test('expand throws on a bare name shared by two groups', () => {
    const tokens = [
      ...scale('fontSize', { 100: '16px', 700: '32px' }),
      ...scale('spacing', { 100: '4px' }),
    ];
    const ambiguous = new ClampPlugin({ pairs: [{ min: '100', max: '700', output: 'fluid' }] });
    expect(() => ambiguous.expand(tokens)).toThrow(
      'min token "100" is ambiguous — matches fontSize.100, spacing.100',
    );
  });

  test('expand follows a reference to its length', () => {
    const tokens = scale('fontSize', { base: '16px', 100: ref('base'), 700: '32px' });
    const fluid = new ClampPlugin({ pairs: [{ min: '100', max: '700', output: 'fluid' }] })
      .expand(tokens)
      .at(-1)!;
    expect(fluid.value).toBe('clamp(1rem, 0.6667rem + 1.6667vw, 2rem)');
  });

  test('expand throws on a value that is not a length', () => {
    const tokens: Token[] = [
      { name: 'a', type: 'dimension', value: 'auto' },
      { name: 'b', type: 'dimension', value: '2rem' },
    ];
    const bad = new ClampPlugin({ pairs: [{ min: 'a', max: 'b', output: 'c' }] });
    expect(() => bad.expand(tokens)).toThrow('ClampPlugin pair "c": min token "a" is not a length');
  });

  test.each([
    ['1em', 'em'],
    ['50%', '%'],
  ])('expand names the pair and unit for %s', (value, unit) => {
    const tokens: Token[] = [
      { name: 'a', type: 'dimension', value: '16px' },
      { name: 'b', type: 'dimension', value },
    ];
    const bad = new ClampPlugin({ pairs: [{ min: 'a', max: 'b', output: 'c' }] });
    expect(() => bad.expand(tokens)).toThrow(
      `ClampPlugin pair "c": max token "b" uses unit "${unit}", which cannot be converted to rem`,
    );
  });

  test.each([
    [320, 320],
    [1280, 320],
  ])('rejects viewportMin %d with viewportMax %d', (viewportMin, viewportMax) => {
    expect(() => new ClampPlugin({ viewportMin, viewportMax })).toThrow(
      'must be less than viewportMax',
    );
  });

  test('custom viewport options', () => {
    const customPlugin = new ClampPlugin({
      viewportMin: 375,
      viewportMax: 1440,
      pairs: [{ min: 'size-sm', max: 'size-lg', output: 'size-fluid' }],
    });
    const tokens: Token[] = [
      { name: 'size-sm', type: 'dimension', value: new Dimension(1, 'rem') },
      { name: 'size-lg', type: 'dimension', value: new Dimension(3, 'rem') },
    ];
    const result = customPlugin.expand(tokens);

    expect(result).toHaveLength(3);
    const fluid = result[2]!;
    expect(fluid.value).toContain('clamp(');
    expect(fluid.value).toContain('1rem');
    expect(fluid.value).toContain('3rem');
  });

  test('multiple pairs generate multiple clamp tokens', () => {
    const multiPlugin = new ClampPlugin({
      pairs: [
        { min: 'fs-sm', max: 'fs-lg', output: 'fs-fluid' },
        { min: 'sp-sm', max: 'sp-lg', output: 'sp-fluid' },
      ],
    });
    const tokens: Token[] = [
      { name: 'fs-sm', type: 'dimension', value: '0.875rem' },
      { name: 'fs-lg', type: 'dimension', value: '1.25rem' },
      { name: 'sp-sm', type: 'spacing', value: '1rem' },
      { name: 'sp-lg', type: 'spacing', value: '2rem' },
    ];
    const result = multiPlugin.expand(tokens);

    expect(result).toHaveLength(6);
    expect(result[4]!.name).toBe('fs-fluid');
    expect(result[5]!.name).toBe('sp-fluid');
  });

  test('generated token inherits type from min token', () => {
    const tokens: Token[] = [
      { name: 'fontSize-100', type: 'fontSize', value: '1rem' },
      { name: 'fontSize-400', type: 'fontSize', value: '2rem' },
    ];
    const result = plugin.expand(tokens);

    const fluid = result[2]!;
    expect(fluid.type).toBe('fontSize');
  });

  test('numeric values are treated as px', () => {
    const numPlugin = new ClampPlugin({ pairs: [{ min: 'a', max: 'b', output: 'c' }] });
    const tokens: Token[] = [
      { name: 'a', type: 'dimension', value: 16 },
      { name: 'b', type: 'dimension', value: 32 },
    ];
    const result = numPlugin.expand(tokens);

    const fluid = result[2]!;
    expect(fluid.value).toContain('clamp(');
    expect(fluid.value).toContain('1rem');
    expect(fluid.value).toContain('2rem');
  });
});

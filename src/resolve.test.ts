import { describe, expect, test } from 'bun:test';

import { BoxShadow } from './BoxShadow';
import { Color } from './Color';
import { CubicBezier } from './CubicBezier';
import { LinearGradient, RadialGradient } from './Gradient';
import { resolveReferences } from './resolve';
import type { Token } from './Token';
import { Transition } from './Transition';

describe('resolveReferences', () => {
  test('resolves simple references', () => {
    const tokens: Token[] = [
      { name: 'primary', type: 'color', value: '#0066cc' },
      { name: 'link', type: 'color', value: '{primary}' },
    ];

    const result = resolveReferences(tokens);
    expect(result[1]!.value).toBe('#0066cc');
  });

  test('resolves chained references', () => {
    const tokens: Token[] = [
      { name: 'base', type: 'color', value: '#0066cc' },
      { name: 'primary', type: 'color', value: '{base}' },
      { name: 'link', type: 'color', value: '{primary}' },
    ];

    const result = resolveReferences(tokens);
    expect(result[2]!.value).toBe('#0066cc');
  });

  test('leaves non-reference values unchanged', () => {
    const tokens: Token[] = [
      { name: 'primary', type: 'color', value: '#0066cc' },
      { name: 'size', type: 'spacing', value: '1rem' },
    ];

    const result = resolveReferences(tokens);
    expect(result[0]!.value).toBe('#0066cc');
    expect(result[1]!.value).toBe('1rem');
  });

  test('throws on circular references', () => {
    const tokens: Token[] = [
      { name: 'a', type: 'color', value: '{b}' },
      { name: 'b', type: 'color', value: '{a}' },
    ];

    expect(() => resolveReferences(tokens)).toThrow('Circular reference');
  });

  test('throws on unresolved references', () => {
    const tokens: Token[] = [{ name: 'link', type: 'color', value: '{nonexistent}' }];

    expect(() => resolveReferences(tokens)).toThrow('Unresolved reference');
  });

  test('does not mutate original tokens', () => {
    const tokens: Token[] = [
      { name: 'primary', type: 'color', value: '#0066cc' },
      { name: 'link', type: 'color', value: '{primary}' },
    ];

    const result = resolveReferences(tokens);
    expect(tokens[1]!.value).toBe('{primary}');
    expect(result[1]!.value).toBe('#0066cc');
  });

  test('CubicBezier values are NOT destructured as composites', () => {
    const cb = new CubicBezier(0.4, 0, 0.2, 1);
    const tokens: Token[] = [
      { name: 'easing', type: 'timing', value: cb },
    ];
    const result = resolveReferences(tokens);
    expect(result[0]!.value).toBe(cb);
  });

  test('BoxShadow values are NOT destructured as composites', () => {
    const shadow = new BoxShadow(0, 2, 8, 0, new Color(0, 0, 0));
    const tokens: Token[] = [
      { name: 'shadow', type: 'shadow', value: shadow },
    ];
    const result = resolveReferences(tokens);
    expect(result[0]!.value).toBe(shadow);
  });

  test('Transition values are NOT destructured as composites', () => {
    const t = new Transition('0.2s', 'ease');
    const tokens: Token[] = [
      { name: 'fade', type: 'transition', value: t },
    ];
    const result = resolveReferences(tokens);
    expect(result[0]!.value).toBe(t);
  });

  test('LinearGradient values are NOT destructured as composites', () => {
    const lg = new LinearGradient(180, [[new Color(255, 0, 0), '0%'], [new Color(0, 0, 255), '100%']]);
    const tokens: Token[] = [
      { name: 'grad', type: 'gradient', value: lg },
    ];
    const result = resolveReferences(tokens);
    expect(result[0]!.value).toBe(lg);
  });

  test('RadialGradient values are NOT destructured as composites', () => {
    const rg = new RadialGradient({ shape: 'circle' }, [new Color(255, 0, 0), new Color(0, 0, 255)]);
    const tokens: Token[] = [
      { name: 'radGrad', type: 'gradient', value: rg },
    ];
    const result = resolveReferences(tokens);
    expect(result[0]!.value).toBe(rg);
  });

  test('Color values are NOT destructured as composites', () => {
    const c = new Color(255, 0, 0);
    const tokens: Token[] = [
      { name: 'red', type: 'color', value: c },
    ];
    const result = resolveReferences(tokens);
    expect(result[0]!.value).toBe(c);
  });

  test('composite values with nested references get resolved', () => {
    const tokens: Token[] = [
      { name: 'bodyFont', type: 'font-family', value: 'Inter' },
      {
        name: 'bodyText',
        type: 'typography',
        value: { fontFamily: '{bodyFont}', fontSize: '2rem' },
      },
    ];
    const result = resolveReferences(tokens);
    expect(result[1]!.value).toEqual({ fontFamily: 'Inter', fontSize: '2rem' });
  });

  test('deeply nested composite references get resolved', () => {
    const tokens: Token[] = [
      { name: 'base', type: 'color', value: '#333' },
      {
        name: 'card',
        type: 'border',
        value: { width: '1px', style: 'solid', color: '{base}' },
      },
    ];
    const result = resolveReferences(tokens);
    expect(result[1]!.value).toEqual({ width: '1px', style: 'solid', color: '#333' });
  });
});

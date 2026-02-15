import { describe, expect, test } from 'bun:test';

import { BoxShadow } from '../BoxShadow';
import { Color } from '../Color';
import { CubicBezier } from '../CubicBezier';
import { LinearGradient } from '../Gradient';
import type { Token } from '../Token';
import { parseDTCG } from './parse';
import { serializeDTCG } from './serialize';

describe('serializeDTCG', () => {
  test('serializes a simple color token', () => {
    const tokens: Token[] = [
      { name: 'primary', value: new Color(255, 0, 0), type: 'color' },
    ];
    const doc = serializeDTCG(tokens);
    const primary = doc.primary as any;
    expect(primary.$value).toEqual({
      colorSpace: 'srgb',
      components: [1, 0, 0],
    });
    expect(primary.$type).toBe('color');
  });

  test('serializes a color with alpha', () => {
    const tokens: Token[] = [
      { name: 'overlay', value: new Color(0, 0, 0).setAlpha(0.5), type: 'color' },
    ];
    const doc = serializeDTCG(tokens);
    const overlay = doc.overlay as any;
    expect(overlay.$value.alpha).toBe(0.5);
  });

  test('serializes CubicBezier to array', () => {
    const tokens: Token[] = [
      { name: 'ease', value: new CubicBezier(0.42, 0, 0.58, 1), type: 'timing' },
    ];
    const doc = serializeDTCG(tokens);
    const ease = doc.ease as any;
    expect(ease.$value).toEqual([0.42, 0, 0.58, 1]);
    expect(ease.$type).toBe('cubicBezier');
  });

  test('serializes BoxShadow to DTCG shadow', () => {
    const tokens: Token[] = [
      { name: 'shadow', value: new BoxShadow(0, 4, 8, 0, new Color(0, 0, 0)), type: 'shadow' },
    ];
    const doc = serializeDTCG(tokens);
    const shadow = doc.shadow as any;
    expect(shadow.$value.offsetY).toEqual({ value: 4, unit: 'px' });
    expect(shadow.$value.blur).toEqual({ value: 8, unit: 'px' });
    expect(shadow.$value.color.colorSpace).toBe('srgb');
  });

  test('serializes LinearGradient to DTCG gradient stops', () => {
    const tokens: Token[] = [
      {
        name: 'bg',
        value: new LinearGradient(180, [
          [new Color(255, 0, 0), '0%'],
          [new Color(0, 0, 255), '100%'],
        ]),
        type: 'gradient',
      },
    ];
    const doc = serializeDTCG(tokens);
    const bg = doc.bg as any;
    expect(bg.$value).toHaveLength(2);
    expect(bg.$value[0].position).toBe(0);
    expect(bg.$value[1].position).toBe(1);
  });

  test('hierarchical mode reconstructs groups', () => {
    const tokens: Token[] = [
      { name: 'color.primary', value: new Color(255, 0, 0), type: 'color' },
      { name: 'color.secondary', value: new Color(0, 0, 255), type: 'color' },
    ];
    const doc = serializeDTCG(tokens, { hierarchical: true });
    const color = doc.color as any;
    expect(color).toBeDefined();
    expect(color.$type).toBe('color');
    expect(color.primary.$value).toBeDefined();
    expect(color.secondary.$value).toBeDefined();
    // Type should be hoisted to group, not on children
    expect(color.primary.$type).toBeUndefined();
  });

  test('flat mode puts all tokens at root', () => {
    const tokens: Token[] = [
      { name: 'color.primary', value: new Color(255, 0, 0), type: 'color' },
      { name: 'color.secondary', value: new Color(0, 0, 255), type: 'color' },
    ];
    const doc = serializeDTCG(tokens, { hierarchical: false });
    expect(doc['color.primary']).toBeDefined();
    expect(doc['color.secondary']).toBeDefined();
    expect(doc.color).toBeUndefined();
  });

  test('preserves usage as $description', () => {
    const tokens: Token[] = [
      { name: 'primary', value: new Color(255, 0, 0), type: 'color', usage: 'Brand color' },
    ];
    const doc = serializeDTCG(tokens);
    expect((doc.primary as any).$description).toBe('Brand color');
  });

  test('maps teikn type names to DTCG', () => {
    const tokens: Token[] = [
      { name: 'sm', value: '8px', type: 'spacing' },
    ];
    const doc = serializeDTCG(tokens);
    const sm = doc.sm as any;
    expect(sm.$type).toBe('dimension');
    expect(sm.$value).toEqual({ value: 8, unit: 'px' });
  });

  test('maps font-family to fontFamily', () => {
    const tokens: Token[] = [
      { name: 'body', value: 'Arial, sans-serif', type: 'font-family' },
    ];
    const doc = serializeDTCG(tokens);
    expect((doc.body as any).$type).toBe('fontFamily');
  });

  test('maps font-weight to fontWeight', () => {
    const tokens: Token[] = [
      { name: 'bold', value: 700, type: 'font-weight' },
    ];
    const doc = serializeDTCG(tokens);
    expect((doc.bold as any).$type).toBe('fontWeight');
    expect((doc.bold as any).$value).toBe(700);
  });

  test('serializes string dimension values', () => {
    const tokens: Token[] = [
      { name: 'gap', value: '1rem', type: 'spacing' },
    ];
    const doc = serializeDTCG(tokens);
    expect((doc.gap as any).$value).toEqual({ value: 1, unit: 'rem' });
  });

  test('serializes number values', () => {
    const tokens: Token[] = [
      { name: 'opacity', value: 0.5, type: 'opacity' },
    ];
    const doc = serializeDTCG(tokens);
    expect((doc.opacity as any).$value).toBe(0.5);
    expect((doc.opacity as any).$type).toBe('number');
  });

  test('round-trip: parse then serialize produces equivalent data', () => {
    const original = {
      color: {
        $type: 'color',
        red: {
          $value: { colorSpace: 'srgb', components: [1, 0, 0] },
          $description: 'Pure red',
        },
        blue: {
          $value: { colorSpace: 'srgb', components: [0, 0, 1] },
        },
      },
      spacing: {
        $type: 'dimension',
        sm: {
          $value: { value: 8, unit: 'px' },
        },
      },
    };

    const tokens = parseDTCG(original);
    const result = serializeDTCG(tokens);

    // Color group should be reconstructed
    const colorGroup = result.color as any;
    expect(colorGroup.$type).toBe('color');
    expect(colorGroup.red.$value.components[0]).toBeCloseTo(1, 2);
    expect(colorGroup.red.$description).toBe('Pure red');
    expect(colorGroup.blue.$value.components[2]).toBeCloseTo(1, 2);

    // Spacing group should be reconstructed
    const spacingGroup = result.spacing as any;
    expect(spacingGroup.$type).toBe('dimension');
    expect(spacingGroup.sm.$value).toEqual({ value: 8, unit: 'px' });
  });

  test('does not hoist $type when children have different types', () => {
    const tokens: Token[] = [
      { name: 'theme.primary', value: new Color(255, 0, 0), type: 'color' },
      { name: 'theme.spacing', value: '8px', type: 'spacing' },
    ];
    const doc = serializeDTCG(tokens, { hierarchical: true });
    const theme = doc.theme as any;
    // Different types → no hoisting
    expect(theme.$type).toBeUndefined();
    expect(theme.primary.$type).toBe('color');
    expect(theme.spacing.$type).toBe('dimension');
  });
});

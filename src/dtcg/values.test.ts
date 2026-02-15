import { describe, expect, test } from 'bun:test';

import { BoxShadow } from '../BoxShadow';
import { Color } from '../Color';
import { CubicBezier } from '../CubicBezier';
import { LinearGradient, RadialGradient } from '../Gradient';
import { dtcgTypeToTeikn, dtcgValueToTeikn, teiknTypeToDTCG, teiknValueToDTCG } from './values';

describe('teiknValueToDTCG', () => {
  test('Color instance converts to structured DTCG color', () => {
    const result = teiknValueToDTCG(new Color(255, 0, 0), 'color');
    expect(result).toEqual({ colorSpace: 'srgb', components: [1, 0, 0] });
  });

  test('Color with alpha !== 1 includes alpha field', () => {
    const result = teiknValueToDTCG(Color.fromRGB(255, 0, 0, 0.5), 'color');
    expect(result).toEqual({ colorSpace: 'srgb', components: [1, 0, 0], alpha: 0.5 });
  });

  test('color string converts via string recovery fallback', () => {
    const result = teiknValueToDTCG('steelblue', 'color') as any;
    expect(result.colorSpace).toBe('srgb');
    expect(result.components).toHaveLength(3);
  });

  test('CubicBezier converts to 4-element array', () => {
    const result = teiknValueToDTCG(new CubicBezier(0.4, 0, 0.2, 1), 'timing');
    expect(result).toEqual([0.4, 0, 0.2, 1]);
  });

  test('BoxShadow converts to structured shadow', () => {
    const result = teiknValueToDTCG(new BoxShadow(0, 2, 8, 0, new Color(0, 0, 0)), 'shadow') as any;
    expect(result.offsetX).toEqual({ value: 0, unit: 'px' });
    expect(result.offsetY).toEqual({ value: 2, unit: 'px' });
    expect(result.blur).toEqual({ value: 8, unit: 'px' });
    expect(result.spread).toEqual({ value: 0, unit: 'px' });
    expect(result.color).toEqual({ colorSpace: 'srgb', components: [0, 0, 0] });
  });

  test('LinearGradient converts to gradient stops', () => {
    const lg = new LinearGradient(180, [
      [new Color(255, 0, 0), '0%'],
      [new Color(0, 0, 255), '100%'],
    ]);
    const result = teiknValueToDTCG(lg, 'gradient') as any[];
    expect(result).toHaveLength(2);
    expect(result[0].color.components).toEqual([1, 0, 0]);
    expect(result[0].position).toBe(0);
    expect(result[1].color.components).toEqual([0, 0, 1]);
    expect(result[1].position).toBe(1);
  });

  test('RadialGradient converts to gradient stops', () => {
    const rg = new RadialGradient({ shape: 'circle' }, [
      [new Color(255, 0, 0), '0%'],
      [new Color(0, 255, 0), '50%'],
    ]);
    const result = teiknValueToDTCG(rg, 'gradient') as any[];
    expect(result).toHaveLength(2);
    expect(result[0].position).toBe(0);
    expect(result[1].position).toBe(0.5);
  });

  test('string dimension like 16px converts to structured dimension', () => {
    const result = teiknValueToDTCG('16px', 'spacing');
    expect(result).toEqual({ value: 16, unit: 'px' });
  });

  test('string dimension like 1rem converts to structured dimension', () => {
    const result = teiknValueToDTCG('1rem', 'font-size');
    expect(result).toEqual({ value: 1, unit: 'rem' });
  });

  test('duration string 0.2s converts to structured duration', () => {
    const result = teiknValueToDTCG('0.2s', 'duration');
    expect(result).toEqual({ value: 0.2, unit: 's' });
  });

  test('duration string 200ms converts to structured duration', () => {
    const result = teiknValueToDTCG('200ms', 'duration');
    expect(result).toEqual({ value: 200, unit: 'ms' });
  });

  test('number values pass through', () => {
    expect(teiknValueToDTCG(42, 'opacity')).toBe(42);
  });

  test('alias string passes through unchanged', () => {
    expect(teiknValueToDTCG('{primary}', 'color')).toBe('{primary}');
  });

  test('composite object with nested Color gets color converted', () => {
    const result = teiknValueToDTCG(
      { color: new Color(255, 0, 0), width: '1px' },
      'border',
    ) as any;
    expect(result.color).toEqual({ colorSpace: 'srgb', components: [1, 0, 0] });
    expect(result.width).toEqual({ value: 1, unit: 'px' });
  });

  test('composite object with CubicBezier gets converted', () => {
    const result = teiknValueToDTCG(
      { timing: new CubicBezier(0.4, 0, 0.2, 1), duration: '0.3s' },
      'transition',
    ) as any;
    expect(result.timing).toEqual([0.4, 0, 0.2, 1]);
    expect(result.duration).toEqual({ value: 0.3, unit: 's' });
  });

  test('composite object with BoxShadow gets converted', () => {
    const result = teiknValueToDTCG(
      { shadow: new BoxShadow(0, 2, 4, 0, new Color(0, 0, 0)) },
      'border',
    ) as any;
    expect(result.shadow.offsetY).toEqual({ value: 2, unit: 'px' });
  });

  test('composite object with non-dimension string passes through', () => {
    const result = teiknValueToDTCG(
      { fontFamily: 'Arial', fontSize: '16px' },
      'typography',
    ) as any;
    expect(result.fontFamily).toBe('Arial');
    expect(result.fontSize).toEqual({ value: 16, unit: 'px' });
  });

  test('string that is not a valid dimension passes through for dimension type', () => {
    const result = teiknValueToDTCG('auto', 'spacing');
    expect(result).toBe('auto');
  });

  test('string that is not a color passes through for color type', () => {
    const result = teiknValueToDTCG('not-a-color-zzz', 'color');
    expect(result).toBe('not-a-color-zzz');
  });
});

describe('dtcgValueToTeikn', () => {
  test('structured color converts to Color instance', () => {
    const result = dtcgValueToTeikn(
      { colorSpace: 'srgb', components: [1, 0, 0] },
      'color',
    );
    expect(result).toBeInstanceOf(Color);
    expect(result.red).toBe(255);
  });

  test('structured dimension converts to string', () => {
    const result = dtcgValueToTeikn({ value: 16, unit: 'px' }, 'dimension');
    expect(result).toBe('16px');
  });

  test('structured duration converts to string', () => {
    const result = dtcgValueToTeikn({ value: 200, unit: 'ms' }, 'duration');
    expect(result).toBe('200ms');
  });

  test('cubic bezier array converts to CubicBezier instance', () => {
    const result = dtcgValueToTeikn([0.4, 0, 0.2, 1], 'cubicBezier');
    expect(result).toBeInstanceOf(CubicBezier);
    expect(result.x1).toBe(0.4);
  });

  test('structured shadow converts to BoxShadow instance', () => {
    const result = dtcgValueToTeikn(
      {
        color: { colorSpace: 'srgb', components: [0, 0, 0] },
        offsetX: { value: 0, unit: 'px' },
        offsetY: { value: 2, unit: 'px' },
        blur: { value: 8, unit: 'px' },
        spread: { value: 0, unit: 'px' },
      },
      'shadow',
    );
    expect(result).toBeInstanceOf(BoxShadow);
    expect(result.offsetY).toBe(2);
    expect(result.blur).toBe(8);
  });

  test('gradient stops convert to LinearGradient instance', () => {
    const result = dtcgValueToTeikn(
      [
        { color: { colorSpace: 'srgb', components: [1, 0, 0] }, position: 0 },
        { color: { colorSpace: 'srgb', components: [0, 0, 1] }, position: 1 },
      ],
      'gradient',
    );
    expect(result).toBeInstanceOf(LinearGradient);
    expect(result.stops).toHaveLength(2);
  });

  test('alias values pass through', () => {
    expect(dtcgValueToTeikn('{primary}', 'color')).toBe('{primary}');
  });

  test('number type passes through', () => {
    expect(dtcgValueToTeikn(42, 'number')).toBe(42);
  });

  test('fontFamily array joins with comma', () => {
    const result = dtcgValueToTeikn(['Rubik', 'sans-serif'], 'fontFamily');
    expect(result).toBe('Rubik, sans-serif');
  });

  test('fontFamily string passes through', () => {
    const result = dtcgValueToTeikn('Rubik', 'fontFamily');
    expect(result).toBe('Rubik');
  });

  test('fontWeight passes through', () => {
    expect(dtcgValueToTeikn(700, 'fontWeight')).toBe(700);
  });

  test('strokeStyle passes through', () => {
    expect(dtcgValueToTeikn('dashed', 'strokeStyle')).toBe('dashed');
  });

  test('fontStyle passes through', () => {
    expect(dtcgValueToTeikn('italic', 'fontStyle')).toBe('italic');
  });

  test('convertCompositeFields with nested dimensions and colors', () => {
    const result = dtcgValueToTeikn(
      {
        color: { colorSpace: 'srgb', components: [1, 0, 0] },
        width: { value: 1, unit: 'px' },
        style: 'solid',
      },
      'border',
    );
    expect(result.color).toBeInstanceOf(Color);
    expect(result.width).toBe('1px');
    expect(result.style).toBe('solid');
  });

  test('convertCompositeFields with alias value', () => {
    const result = dtcgValueToTeikn(
      { color: '{brandColor}', width: { value: 2, unit: 'px' } },
      'border',
    );
    expect(result.color).toBe('{brandColor}');
    expect(result.width).toBe('2px');
  });

  test('convertCompositeFields with cubic bezier array', () => {
    const result = dtcgValueToTeikn(
      { timingFunction: [0.4, 0, 0.2, 1], duration: { value: 300, unit: 'ms' } },
      'transition',
    );
    expect(result.timingFunction).toBeInstanceOf(CubicBezier);
    expect(result.duration).toBe('300ms');
  });

  test('unknown type passes through', () => {
    expect(dtcgValueToTeikn('hello', 'unknown-type')).toBe('hello');
  });

  test('shadow with string-based dimensions and color', () => {
    const result = dtcgValueToTeikn(
      {
        color: 'rgba(0,0,0,0.5)',
        offsetX: '0px',
        offsetY: '4px',
        blur: '12px',
        spread: '0px',
      },
      'shadow',
    );
    expect(result).toBeInstanceOf(BoxShadow);
    expect(result.offsetY).toBe(4);
  });
});

describe('type mapping', () => {
  test('dtcgTypeToTeikn maps fontFamily to font-family', () => {
    expect(dtcgTypeToTeikn('fontFamily')).toBe('font-family');
  });

  test('dtcgTypeToTeikn maps fontWeight to font-weight', () => {
    expect(dtcgTypeToTeikn('fontWeight')).toBe('font-weight');
  });

  test('dtcgTypeToTeikn maps cubicBezier to timing', () => {
    expect(dtcgTypeToTeikn('cubicBezier')).toBe('timing');
  });

  test('dtcgTypeToTeikn passes unknown types through', () => {
    expect(dtcgTypeToTeikn('color')).toBe('color');
    expect(dtcgTypeToTeikn('unknown')).toBe('unknown');
  });

  test('teiknTypeToDTCG maps spacing to dimension', () => {
    expect(teiknTypeToDTCG('spacing')).toBe('dimension');
  });

  test('teiknTypeToDTCG maps font-family to fontFamily', () => {
    expect(teiknTypeToDTCG('font-family')).toBe('fontFamily');
  });

  test('teiknTypeToDTCG maps timing to cubicBezier', () => {
    expect(teiknTypeToDTCG('timing')).toBe('cubicBezier');
  });

  test('teiknTypeToDTCG passes unknown types through', () => {
    expect(teiknTypeToDTCG('color')).toBe('color');
    expect(teiknTypeToDTCG('unknown')).toBe('unknown');
  });
});

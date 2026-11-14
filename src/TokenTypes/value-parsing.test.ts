import { describe, expect, test } from 'bun:test';

import { Border } from './Border.js';
import { BoxShadow, BoxShadowList } from './BoxShadow.js';
import { CubicBezier } from './CubicBezier.js';
import { Dimension } from './Dimension.js';
import { Duration } from './Duration.js';
import { isRefString } from './ref-guard.js';
import { Transition, TransitionList } from './Transition.js';
import { Typography } from './Typography.js';

describe('Transition shorthand', () => {
  test('accepts leading-dot and case-insensitive times', () => {
    const t = new Transition('.3s ease');
    expect(t.property).toBe('all');
    expect(String(t.duration)).toBe('0.3s');
    expect(t.toString()).toBe('0.3s ease');
    expect(new Transition('opacity 0.3S EASE-IN 100MS').toString()).toBe(
      'opacity 0.3s ease-in 100ms',
    );
  });

  test.each([
    'all 0.3s steps(4, end)',
    'opacity 300ms step-end',
    '1s step-start',
    '1s linear(0, 1)',
  ])('throws for the unrepresentable timing function in "%s"', css => {
    expect(() => new Transition(css)).toThrow(/unsupported timing function/);
  });

  test('throws instead of overwriting the property', () => {
    expect(() => new Transition('opacity transform 1s')).toThrow(/Invalid transition.*"transform"/);
    expect(() => new Transition('opacity 1s 3x')).toThrow(/Invalid transition.*"3x"/);
    expect(() => new Transition('1s ease linear')).toThrow(/more than one timing function/);
    expect(() => new Transition('1s 2s 3s')).toThrow(/at most 2 times/);
  });

  test('still accepts custom and vendor-prefixed properties', () => {
    expect(new Transition('--my-var 1s ease').property).toBe('--my-var');
    expect(new Transition('-webkit-transform 1s ease').property).toBe('-webkit-transform');
  });
});

describe('BoxShadow shorthand', () => {
  test('throws on mixed length units', () => {
    expect(() => new BoxShadow('0.5rem 4px 8px red')).toThrow(/mixed length units \(rem, px\)/);
    expect(() => new BoxShadow('1em 2em 3rem blue')).toThrow(/mixed length units/);
  });

  test('unitless 0 is compatible with any unit', () => {
    expect(new BoxShadow('0 0.5rem 1rem red').toString()).toBe('0 0.5rem 1rem rgb(255, 0, 0)');
  });

  test('accepts the color first', () => {
    expect(new BoxShadow('red 0 2px 4px').toString()).toBe('0 2px 4px rgb(255, 0, 0)');
    expect(new BoxShadow('rgb(255 0 0) 0 2px 4px').toString()).toBe('0 2px 4px rgb(255, 0, 0)');
  });

  test('accepts inset in any position', () => {
    const expected = 'inset 2px 2px rgb(255, 0, 0)';
    expect(new BoxShadow('2px 2px inset red').toString()).toBe(expected);
    expect(new BoxShadow('2px 2px red inset').toString()).toBe(expected);
    expect(new BoxShadow('inset red 2px 2px').toString()).toBe(expected);
    expect(() => new BoxShadow('inset 2px 2px red inset')).toThrow(/duplicate `inset`/);
    expect(() => new BoxShadow('2px inset 2px red')).toThrow(/adjacent/);
  });

  test('accepts leading-dot numbers and other Dimension units', () => {
    expect(new BoxShadow('0 .5px 1px red').offsetY).toBe(0.5);
    const pt = new BoxShadow('0 2pt 4pt red');
    expect(pt.unit).toBe('pt');
    expect(pt.toString()).toBe('0 2pt 4pt rgb(255, 0, 0)');
    expect(new BoxShadow('0 1VW 2vw red').unit).toBe('vw');
    expect(() => new BoxShadow('0 2% 4% red')).toThrow(/unsupported length "2%"/);
    expect(() => new BoxShadow('0 2foo 4px red')).toThrow(/unsupported length "2foo"/);
  });

  test('throws on a fifth length or a second color', () => {
    expect(() => new BoxShadow('1px 2px 3px 4px 5px red')).toThrow(/at most 4 lengths/);
    expect(() => new BoxShadow('1px 2px red blue')).toThrow(/unexpected "blue"/);
  });

  test('throws clearly for currentColor and none', () => {
    expect(() => new BoxShadow('0 2px 4px currentColor')).toThrow(
      /Invalid box-shadow.*unsupported color "currentColor"/,
    );
    expect(() => new BoxShadow('none')).toThrow(/Invalid box-shadow.*unsupported color "none"/);
  });

  test('keeps a {ref} color and legacy unitless lengths', () => {
    expect(new BoxShadow('0 2px 8px {color.ink}').color).toBe('{color.ink}');
    expect(new BoxShadow('1 2 3 red').toString()).toBe('1px 2px 3px rgb(255, 0, 0)');
  });
});

describe('Dimension / Duration parsing', () => {
  test('accepts every CSS number form', () => {
    expect(new Dimension('.5rem').value).toBe(0.5);
    expect(new Dimension('+5px').value).toBe(5);
    expect(new Dimension('1e3px').value).toBe(1000);
    expect(new Dimension('-1.5E-1em').value).toBe(-0.15);
    expect(new Duration('.3s').value).toBe(0.3);
    expect(new Duration('+200ms').value).toBe(200);
    expect(new Duration('1e3ms').value).toBe(1000);
  });

  test('units are case-insensitive and canonicalised', () => {
    expect(new Dimension('1PX').unit).toBe('px');
    expect(new Dimension('4q').unit).toBe('Q');
    expect(new Dimension('10VMin').unit).toBe('vmin');
    expect(new Duration('0.3S').toString()).toBe('0.3s');
    expect(new Duration('200MS').unit).toBe('ms');
  });

  test('never serialise with exponent notation, and re-parse their own output', () => {
    const tiny = new Dimension(1e-7, 'px');
    expect(tiny.toString()).toBe('0.0000001px');
    expect(new Dimension(tiny.toString()).equals(tiny)).toBe(true);
    expect(new Dimension(1.5e-9, 'rem').toString()).toBe('0.0000000015rem');
    expect(new Dimension(1e21, 'px').toString()).toBe('1000000000000000000000px');
    expect(new Dimension(1, 'px').scale(1e-8).toString()).toBe('0.00000001px');
    expect(new Duration(1e-7, 's').toString()).toBe('0.0000001s');
    expect(new Duration(new Duration(1e-7, 's').toString()).value).toBe(1e-7);
  });

  test('unitless zero is a Dimension but not a Duration', () => {
    expect(new Dimension('0').toString()).toBe('0px');
    expect(new Dimension('-0.0').value).toBe(-0);
    expect(() => new Dimension('5')).toThrow('Invalid dimension');
    expect(() => new Duration('0')).toThrow('Invalid duration');
    expect(
      String(
        new Typography({ fontFamily: 'Inter', fontSize: '1rem', letterSpacing: '0' }).letterSpacing,
      ),
    ).toBe('0px');
    expect(new Border('0 solid red').toString()).toBe('0px solid rgb(255, 0, 0)');
  });

  test('every constructor path validates unit and finiteness', () => {
    expect(() => new Dimension({ value: 1, unit: 'foo' as never })).toThrow(
      /Invalid dimension unit/,
    );
    expect(() => new Dimension(1, 'PX' as never)).toThrow(/Invalid dimension unit/);
    expect(() => new Dimension(NaN, 'px')).toThrow(/Invalid dimension value/);
    expect(() => new Dimension({ value: Infinity, unit: 'px' })).toThrow(/Invalid dimension value/);
    expect(() => new Dimension('1e999px')).toThrow('Invalid dimension');
    expect(() => new Duration({ value: 1, unit: 'min' as never })).toThrow(/Invalid duration unit/);
    expect(() => new Duration(NaN, 'ms')).toThrow(/Invalid duration value/);
    expect(() => new Duration(Infinity, 's')).toThrow(/Invalid duration value/);
    expect(() => new Duration('1e999s')).toThrow('Invalid duration');
  });
});

describe('CubicBezier string parsing', () => {
  test.each(['constructor', '__proto__', 'toString'])('"%s" is an invalid cubic-bezier', name => {
    expect(() => new CubicBezier(name)).toThrow('Invalid cubic-bezier');
  });

  test.each([
    'xcubic-bezier(1,2,3,4) junk',
    'cubic-bezier(1-2,0,1,1)',
    'cubic-bezier(0.1.2,0,1,1)',
    'cubic-bezier(e,0,1,1)',
    'cubic-bezier(0,0,1,1) junk',
    'cubic-bezier(1e999,0,1,1)',
    'cubic-bezier(0,1e999,1,1)',
    'cubic-bezier(1.5,0,1,1)',
    'cubic-bezier(0,0,-0.1,1)',
  ])('rejects "%s"', css => {
    expect(() => new CubicBezier(css)).toThrow('Invalid cubic-bezier');
  });

  test('parses real CSS numbers', () => {
    expect(new CubicBezier(' CUBIC-BEZIER( .4 , -1e-1 , +0.2 , 1.5 ) ').controlPoints).toEqual([
      0.4, -0.1, 0.2, 1.5,
    ]);
  });

  test('numeric construction rejects non-finite points', () => {
    expect(() => new CubicBezier(NaN, 0, 1, 1)).toThrow('Invalid cubic-bezier');
    expect(() => new CubicBezier({ x1: 0, y1: Infinity, x2: 1, y2: 1 })).toThrow(
      'Invalid cubic-bezier',
    );
  });
});

describe('float noise', () => {
  test('CubicBezier.reverse() is clean and keeps keyword matching', () => {
    const reversed = CubicBezier.easeIn.reverse();
    expect(reversed.toString()).toBe('cubic-bezier(0, 0, 0.58, 1)');
    expect(reversed.keyword).toBe('ease-out');
    expect(CubicBezier.ease.reverse().reverse().controlPoints).toEqual([0.25, 0.1, 0.25, 1]);
    expect(CubicBezier.ease.reverse().reverse().keyword).toBe('ease');
    expect(new CubicBezier(0.4, 0.1, 0.2, 1).scaleY(3).y1).toBe(0.3);
  });

  test('Duration and Transition arithmetic is clean', () => {
    expect(new Transition('0.3s', 'ease', '0.2s').shift('100ms').toString()).toBe('0.3s ease 0.3s');
    expect(new Transition('0.3s', 'ease').scale(1 / 3).toString()).toBe('0.1s ease');
    expect(new Duration(0.1, 's').add(new Duration(0.2, 's')).value).toBe(0.3);
    expect(new Duration(0.3, 's').subtract(new Duration(0.1, 's')).value).toBe(0.2);
    expect(new Duration(0.07, 's').ms()).toBe(70);
    expect(new Duration(1.1, 's').toMs().value).toBe(1100);
  });

  test('BoxShadow and Dimension scaling is clean', () => {
    const shadow = new BoxShadow({
      offsetX: 0.1,
      offsetY: 0.1,
      blur: 0.1,
      unit: 'rem',
      color: 'red',
    });
    expect(shadow.scale(3).toString()).toBe('0.3rem 0.3rem 0.3rem rgb(255, 0, 0)');
    expect(new Dimension(0.1, 'rem').scale(3).toString()).toBe('0.3rem');
    expect(new Dimension(0.1, 'rem').add(new Dimension(0.2, 'rem')).value).toBe(0.3);
  });
});

describe('list immutability', () => {
  test('BoxShadowList layers cannot be mutated through the getter or a copy', () => {
    const list = new BoxShadowList([new BoxShadow(0, 1, 2)]);
    const copy = new BoxShadowList(list);
    expect(() => (copy.layers as BoxShadow[]).push(new BoxShadow(0, 4, 8))).toThrow(TypeError);
    expect(() => (list.layers as BoxShadow[]).pop()).toThrow(TypeError);
    expect(list.length).toBe(1);
    expect(copy.length).toBe(1);
  });

  test('TransitionList layers cannot be mutated through the getter or a copy', () => {
    const list = new TransitionList('opacity 1s ease, transform 2s linear');
    const copy = new TransitionList(list);
    expect(() => (copy.layers as Transition[]).push(Transition.fade)).toThrow(TypeError);
    expect(list.length).toBe(2);
  });

  test('the source array is not frozen or shared', () => {
    const source = [new BoxShadow(0, 1, 2)];
    const list = new BoxShadowList(source);
    source.push(new BoxShadow(0, 4, 8));
    expect(list.length).toBe(1);
  });
});

describe('whitespace-padded {ref} strings', () => {
  test('isRefString is strict', () => {
    expect(isRefString('{ink}')).toBe(true);
    expect(isRefString(' {ink} ')).toBe(false);
    expect(isRefString('{ink}\n')).toBe(false);
  });

  test('Border fields reject a padded ref', () => {
    expect(() => new Border({ width: '1px', style: 'solid', color: ' {ink} ' })).toThrow();
    expect(() => new Border({ width: ' {w} ', style: 'solid', color: 'red' })).toThrow(
      'Invalid dimension',
    );
    expect(() => new Border({ width: '1px', style: ' {s} ', color: 'red' })).toThrow(
      'Invalid border style',
    );
  });

  test('BoxShadow color rejects a padded ref', () => {
    expect(() => new BoxShadow({ offsetY: 1, color: ' {ink} ' })).toThrow();
  });

  test('Transition fields reject a padded ref', () => {
    expect(() => new Transition({ duration: ' {d} ', timingFunction: 'ease' })).toThrow(
      'Invalid duration',
    );
    expect(() => new Transition({ duration: '1s', timingFunction: ' {e} ' })).toThrow(
      'Invalid cubic-bezier',
    );
    expect(
      () => new Transition({ duration: '1s', timingFunction: 'ease', delay: ' {d} ' }),
    ).toThrow('Invalid duration');
    expect(
      () => new Transition({ duration: '1s', timingFunction: 'ease', property: ' {p} ' }),
    ).toThrow(/surrounding whitespace/);
    expect(() => new Transition('1s', 'ease', '0s', '{p} ')).toThrow(/surrounding whitespace/);
  });

  test('Typography fields reject a padded ref', () => {
    const base = { fontFamily: 'Inter', fontSize: '1rem' };
    expect(() => new Typography({ ...base, fontFamily: ' {font.body} ' })).toThrow(
      /surrounding whitespace/,
    );
    expect(() => new Typography({ ...base, fontSize: ' {size} ' })).toThrow('Invalid dimension');
    expect(() => new Typography({ ...base, fontWeight: ' {w} ' })).toThrow(/finite number/);
    expect(() => new Typography({ ...base, lineHeight: ' {lh} ' })).toThrow(/finite number/);
    expect(() => new Typography({ ...base, letterSpacing: ' {ls} ' })).toThrow('Invalid dimension');
  });

  test('exact refs still pass through', () => {
    expect(new Border({ width: '{w}', style: 'solid', color: '{ink}' }).toString()).toBe(
      '{w} solid {ink}',
    );
  });
});

describe('Typography numbers', () => {
  const base = { fontFamily: 'Inter', fontSize: '1rem' };

  test.each(['', ' ', '0x10', '1e', 'bold', 'Infinity'])('rejects fontWeight "%s"', value => {
    expect(() => new Typography({ ...base, fontWeight: value })).toThrow(/finite number/);
  });

  test('still accepts decimal number strings', () => {
    expect(new Typography({ ...base, fontWeight: '400', lineHeight: ' 1.5 ' }).toString()).toBe(
      '400 1rem/1.5 Inter',
    );
  });
});

describe('Border shorthand', () => {
  test.each(['1px 2px solid red', '1px solid red blue', '1px solid dashed red', '1foo solid red'])(
    'rejects "%s"',
    css => {
      expect(() => new Border(css)).toThrow(/Invalid border/);
    },
  );

  test('units are case-insensitive', () => {
    expect(new Border('1PX solid red').toString()).toBe('1px solid rgb(255, 0, 0)');
    expect(new Border('.5px solid red').toString()).toBe('0.5px solid rgb(255, 0, 0)');
  });
});

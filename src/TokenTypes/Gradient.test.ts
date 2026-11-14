import { describe, expect, it } from 'bun:test';

import { Color } from './Color/index.js';
import type { GradientStop } from './Gradient.js';
import { GradientList, LinearGradient, RadialGradient } from './Gradient.js';

describe('LinearGradient', () => {
  // ─── Construction ────────────────────────────────────────────

  it('creates from angle and color strings', () => {
    const g = new LinearGradient(90, ['red', 'blue']);
    expect(g.angle).toBe(90);
    expect(g.stops).toHaveLength(2);
    expect(g.stops[0]!.color.red).toBe(255);
    expect(g.stops[1]!.color.blue).toBe(255);
  });

  it('creates from angle and Color instances', () => {
    const g = new LinearGradient(45, [new Color('red'), new Color('blue')]);
    expect(g.angle).toBe(45);
    expect(g.stops).toHaveLength(2);
  });

  it('creates from angle and tuple stops', () => {
    const g = new LinearGradient(0, [
      ['red', '0%'],
      ['blue', '100%'],
    ]);
    expect(g.stops[0]!.position).toBe('0%');
    expect(g.stops[1]!.position).toBe('100%');
  });

  it('creates from angle and GradientStop objects', () => {
    const g = new LinearGradient(180, [
      { color: new Color('red'), position: '25%' },
      { color: new Color('blue') },
    ]);
    expect(g.stops[0]!.position).toBe('25%');
    expect(g.stops[1]!.position).toBeUndefined();
  });

  it('creates from options object', () => {
    const g = new LinearGradient({ angle: 90, stops: ['red', 'blue'] });
    expect(g.angle).toBe(90);
    expect(g.stops).toHaveLength(2);
  });

  it('from() accepts a CSS string', () => {
    const g = LinearGradient.from('linear-gradient(90deg, red, blue)');
    expect(g.angle).toBe(90);
    expect(g.stops).toHaveLength(2);
  });

  it('from() accepts an options object', () => {
    const g = LinearGradient.from({ angle: 45, stops: ['red', 'blue'] });
    expect(g.angle).toBe(45);
    expect(g.stops).toHaveLength(2);
  });

  it('from() accepts a LinearGradient instance', () => {
    const a = new LinearGradient(45, ['red', 'blue']);
    const b = LinearGradient.from(a);
    expect(b.angle).toBe(45);
    expect(b).not.toBe(a);
  });

  it('normalizes angle to [0, 360)', () => {
    expect(new LinearGradient(400, ['red', 'blue']).angle).toBe(40);
    expect(new LinearGradient(-90, ['red', 'blue']).angle).toBe(270);
    expect(new LinearGradient(720, ['red', 'blue']).angle).toBe(0);
  });

  it('creates from CSS string with angle', () => {
    const g = new LinearGradient('linear-gradient(90deg, red, blue)');
    expect(g.angle).toBe(90);
    expect(g.stops).toHaveLength(2);
  });

  it('creates from CSS string with keyword direction', () => {
    const g = new LinearGradient('linear-gradient(to right, red, blue)');
    expect(g.angle).toBe(90);
  });

  it('creates from CSS string with no direction', () => {
    const g = new LinearGradient('linear-gradient(red, blue)');
    expect(g.angle).toBe(180); // default: to bottom
  });

  it('creates from CSS string with position percentages', () => {
    const g = new LinearGradient('linear-gradient(90deg, red 0%, green 50%, blue 100%)');
    expect(g.stops).toHaveLength(3);
    expect(g.stops[0]!.position).toBe('0%');
    expect(g.stops[1]!.position).toBe('50%');
    expect(g.stops[2]!.position).toBe('100%');
  });

  it('creates from CSS string with rgba colors', () => {
    const g = new LinearGradient('linear-gradient(45deg, rgba(255, 0, 0, 0.5) 0%, blue 100%)');
    expect(g.stops[0]!.color.alpha).toBe(0.5);
  });

  it('creates as a copy', () => {
    const a = new LinearGradient(90, ['red', 'blue']);
    const b = new LinearGradient(a);
    expect(b.angle).toBe(a.angle);
    expect(b.stops).toHaveLength(a.stops.length);
  });

  it('throws on invalid CSS string', () => {
    expect(() => new LinearGradient('not-a-gradient')).toThrow('Invalid linear-gradient');
  });

  // ─── Manipulation ────────────────────────────────────────────

  it('rotate() changes angle', () => {
    const g = new LinearGradient(90, ['red', 'blue']);
    const rotated = g.rotate(45);
    expect(rotated.angle).toBe(135);
    expect(g.angle).toBe(90); // original unchanged
  });

  it('rotate() wraps around 360', () => {
    const g = new LinearGradient(350, ['red', 'blue']);
    expect(g.rotate(20).angle).toBe(10);
  });

  it('reverse() flips direction and stops', () => {
    const g = new LinearGradient(90, [
      ['red', '0%'],
      ['blue', '100%'],
    ]);
    const reversed = g.reverse();
    expect(reversed.angle).toBe(270);
    expect(reversed.stops[0]!.position).toBe('0%');
    expect(reversed.stops[1]!.position).toBe('100%');
    expect(reversed.stops[0]!.color.blue).toBe(255); // blue first now
  });

  it('addStop() appends a stop', () => {
    const g = new LinearGradient(90, ['red', 'blue']);
    const added = g.addStop('green', '50%');
    expect(added.stops).toHaveLength(3);
    expect(added.stops[2]!.position).toBe('50%');
    expect(g.stops).toHaveLength(2); // original unchanged
  });

  // ─── Serialization ──────────────────────────────────────────

  it('toString() outputs CSS linear-gradient with keyword direction', () => {
    const g = new LinearGradient(90, ['red', 'blue']);
    const str = g.toString();
    expect(str).toMatch(/^linear-gradient\(to right,/);
  });

  it('toString() outputs CSS linear-gradient with degree angle', () => {
    const g = new LinearGradient(137, ['red', 'blue']);
    const str = g.toString();
    expect(str).toMatch(/^linear-gradient\(137deg,/);
  });

  it('toJSON() equals toString()', () => {
    const g = new LinearGradient(90, ['red', 'blue']);
    expect(g.toJSON()).toBe(g.toString());
  });

  it('round-trips through CSS string', () => {
    const css = 'linear-gradient(to right, rgb(255, 0, 0) 0%, rgb(0, 0, 255) 100%)';
    const g = new LinearGradient(css);
    expect(g.toString()).toBe(css);
  });
});

describe('RadialGradient', () => {
  // ─── Construction ────────────────────────────────────────────

  it('creates from options and stops', () => {
    const g = new RadialGradient({ shape: 'circle' }, ['red', 'blue']);
    expect(g.shape).toBe('circle');
    expect(g.stops).toHaveLength(2);
  });

  it('from() accepts a CSS string', () => {
    const g = RadialGradient.from('radial-gradient(circle, red, blue)');
    expect(g.shape).toBe('circle');
    expect(g.stops).toHaveLength(2);
  });

  it('from() accepts a RadialGradient instance', () => {
    const a = new RadialGradient({ shape: 'circle' }, ['red', 'blue']);
    const b = RadialGradient.from(a);
    expect(b.shape).toBe('circle');
    expect(b).not.toBe(a);
  });

  it('defaults to ellipse/farthest-corner/center', () => {
    const g = new RadialGradient({}, ['red', 'blue']);
    expect(g.shape).toBe('ellipse');
    expect(g.size).toBe('farthest-corner');
    expect(g.position).toBe('center');
  });

  it('creates with custom position', () => {
    const g = new RadialGradient({ shape: 'circle', position: '50% 25%' }, ['red', 'blue']);
    expect(g.position).toBe('50% 25%');
  });

  it('creates from CSS string with circle', () => {
    const g = new RadialGradient('radial-gradient(circle, red, blue)');
    expect(g.shape).toBe('circle');
    expect(g.stops).toHaveLength(2);
  });

  it('creates from CSS string with position', () => {
    const g = new RadialGradient('radial-gradient(circle at center, red, blue)');
    expect(g.shape).toBe('circle');
    expect(g.position).toBe('center');
  });

  it('creates from CSS string with default shape', () => {
    const g = new RadialGradient('radial-gradient(red, blue)');
    expect(g.shape).toBe('ellipse');
    expect(g.stops).toHaveLength(2);
  });

  it('creates as a copy', () => {
    const a = new RadialGradient({ shape: 'circle' }, ['red', 'blue']);
    const b = new RadialGradient(a);
    expect(b.shape).toBe(a.shape);
  });

  it('throws on invalid CSS string', () => {
    expect(() => new RadialGradient('not-a-gradient')).toThrow('Invalid radial-gradient');
  });

  // ─── Manipulation ────────────────────────────────────────────

  it('setShape() returns new instance', () => {
    const g = new RadialGradient({ shape: 'circle' }, ['red', 'blue']);
    const e = g.setShape('ellipse');
    expect(e.shape).toBe('ellipse');
    expect(g.shape).toBe('circle');
  });

  it('setPosition() returns new instance', () => {
    const g = new RadialGradient({}, ['red', 'blue']);
    const p = g.setPosition('top left');
    expect(p.position).toBe('top left');
    expect(g.position).toBe('center');
  });

  it('addStop() appends a stop', () => {
    const g = new RadialGradient({}, ['red', 'blue']);
    const added = g.addStop('green', '50%');
    expect(added.stops).toHaveLength(3);
    expect(g.stops).toHaveLength(2);
  });

  it('reverse() flips stop order and positions', () => {
    const g = new RadialGradient({}, [
      ['red', '0%'],
      ['blue', '100%'],
    ]);
    const r = g.reverse();
    expect(r.stops[0]!.color.blue).toBe(255);
    expect(r.stops[0]!.position).toBe('0%');
    expect(r.stops[1]!.color.red).toBe(255);
    expect(r.stops[1]!.position).toBe('100%');
  });

  // ─── Serialization ──────────────────────────────────────────

  it('toString() omits defaults for ellipse', () => {
    const g = new RadialGradient({}, ['red', 'blue']);
    expect(g.toString()).toMatch(/^radial-gradient\(rgb/);
  });

  it('toString() includes circle', () => {
    const g = new RadialGradient({ shape: 'circle' }, ['red', 'blue']);
    expect(g.toString()).toMatch(/^radial-gradient\(circle,/);
  });

  it('toString() includes position', () => {
    const g = new RadialGradient({ shape: 'circle', position: '50% 25%' }, ['red', 'blue']);
    expect(g.toString()).toContain('at 50% 25%');
  });

  it('toJSON() equals toString()', () => {
    const g = new RadialGradient({}, ['red', 'blue']);
    expect(g.toJSON()).toBe(g.toString());
  });
});

describe('GradientList', () => {
  const lg = new LinearGradient(90, ['red', 'blue']);
  const rg = new RadialGradient({ shape: 'circle' }, ['green', 'yellow']);

  it('from() accepts an array of gradients', () => {
    const list = GradientList.from([lg, rg]);
    expect(list.length).toBe(2);
  });

  it('from() accepts a CSS string', () => {
    const list = GradientList.from(
      'linear-gradient(90deg, red, blue), radial-gradient(circle, green, yellow)',
    );
    expect(list.length).toBe(2);
  });

  it('creates from an array of gradients', () => {
    const list = new GradientList([lg, rg]);
    expect(list.length).toBe(2);
    expect(list.at(0)).toBeInstanceOf(LinearGradient);
    expect(list.at(1)).toBeInstanceOf(RadialGradient);
  });

  it('creates from a CSS string with multiple gradients', () => {
    const css = 'linear-gradient(to right, red, blue), radial-gradient(circle, green, yellow)';
    const list = new GradientList(css);
    expect(list.length).toBe(2);
    expect(list.at(0)).toBeInstanceOf(LinearGradient);
    expect(list.at(1)).toBeInstanceOf(RadialGradient);
  });

  it('creates as a copy', () => {
    const a = new GradientList([lg, rg]);
    const b = new GradientList(a);
    expect(b.length).toBe(2);
    expect(b.toString()).toBe(a.toString());
  });

  it('layers returns readonly array', () => {
    const list = new GradientList([lg]);
    expect(list.layers).toHaveLength(1);
  });

  it('at() returns undefined for out-of-bounds', () => {
    const list = new GradientList([lg]);
    expect(list.at(5)).toBeUndefined();
  });

  it('map() transforms each gradient', () => {
    const list = new GradientList([lg]);
    const mapped = list.map(g => {
      if (g instanceof LinearGradient) {
        return g.rotate(90);
      }

      return g;
    });
    expect(mapped.at(0)!.toString()).toContain('to bottom');
  });

  it('toString() joins with comma', () => {
    const list = new GradientList([lg, rg]);
    const str = list.toString();
    expect(str).toContain('linear-gradient(');
    expect(str).toContain('radial-gradient(');
    expect(str.split(', radial-gradient').length).toBe(2);
  });

  it('toJSON() equals toString()', () => {
    const list = new GradientList([lg, rg]);
    expect(list.toJSON()).toBe(list.toString());
  });

  it('handles CSS with nested parentheses correctly', () => {
    const css =
      'linear-gradient(90deg, rgba(255, 0, 0, 0.5), blue), radial-gradient(circle, green, yellow)';
    const list = new GradientList(css);
    expect(list.length).toBe(2);
  });
});

describe('per-field {ref} colors (RefFields protocol)', () => {
  it('LinearGradient holds a {ref} stop color instead of throwing', () => {
    const g = new LinearGradient(180, [
      ['{color.brand}', '0%'],
      ['#000', '100%'],
    ]);
    expect(g.stops[0]!.color).toBe('{color.brand}');
    expect(g.toString()).toBe('linear-gradient(to bottom, {color.brand} 0%, rgb(0, 0, 0) 100%)');
  });

  it('accepts a {ref} via addStop and a bare string stop', () => {
    const g = new LinearGradient(90, ['#fff']).addStop('{color.brand}', '50%');
    expect(g.stops[1]!.color).toBe('{color.brand}');
  });

  it('RadialGradient holds a {ref} stop color', () => {
    const g = new RadialGradient({ shape: 'circle' }, [
      ['{color.brand}', '0%'],
      ['#000', '100%'],
    ]);
    expect(g.stops[0]!.color).toBe('{color.brand}');
    expect(g.toString()).toContain('{color.brand} 0%');
  });

  it('exposes stops through the RefFields protocol and rebuilds from them', () => {
    const g = new LinearGradient(180, [
      ['{color.brand}', '0%'],
      ['#000', '100%'],
    ]);
    const fields = g.__teikn_fields__();
    expect(Array.isArray(fields.stops)).toBe(true);
    const rebuilt = g.__teikn_fromFields__(fields);
    expect(rebuilt.toString()).toBe(g.toString());
  });
});

describe('RadialGradient prelude parsing', () => {
  const parse = (prelude: string) => {
    const g = new RadialGradient(`radial-gradient(${prelude}, red, blue)`);

    return { shape: g.shape, size: g.size, position: g.position, stops: g.stops.length };
  };

  it.each([
    ['at top left', 'ellipse', 'farthest-corner', 'top left'],
    ['circle 100px', 'circle', '100px', 'center'],
    ['100px circle', 'circle', '100px', 'center'],
    ['100px', 'circle', '100px', 'center'],
    ['ellipse 50% 30% at 20% 40%', 'ellipse', '50% 30%', '20% 40%'],
    ['50% 30%', 'ellipse', '50% 30%', 'center'],
    ['circle  at  top', 'circle', 'farthest-corner', 'top'],
    ['circle at\ttop', 'circle', 'farthest-corner', 'top'],
    ['CIRCLE Closest-Side AT 10px 20px', 'circle', 'closest-side', '10px 20px'],
  ])('parses "%s"', (prelude, shape, size, position) => {
    expect(parse(prelude)).toEqual({ shape, size, position, stops: 2 });
  });

  it('tolerates whitespace around the whole string', () => {
    expect(new RadialGradient('  radial-gradient(circle, red, blue)\n').shape).toBe('circle');
  });

  it('rejects a dangling "at"', () => {
    expect(() => new RadialGradient('radial-gradient(circle at, red, blue)')).toThrow(
      'Invalid radial-gradient shape',
    );
  });
});

describe('LinearGradient direction', () => {
  it.each([45, 135, 225, 315])('emits the diagonal %ddeg as an angle, not a corner', angle => {
    expect(new LinearGradient(angle, ['red', 'blue']).toString()).toContain(
      `linear-gradient(${angle}deg,`,
    );
  });

  it.each([
    ['to top', 0],
    ['to right', 90],
    ['to bottom', 180],
    ['to left', 270],
  ])('keeps the exact side keyword "%s"', (keyword, angle) => {
    const g = new LinearGradient(angle, ['red', 'blue']);
    expect(g.toString()).toContain(`linear-gradient(${keyword},`);
    expect(new LinearGradient(g.toString()).angle).toBe(angle);
  });

  it.each([
    ['to top right', 45],
    ['to right top', 45],
    ['to bottom right', 135],
    ['to left bottom', 225],
    ['TO  Top   Left', 315],
  ])('preserves the corner "%s"', (keyword, nominal) => {
    const g = new LinearGradient(`linear-gradient(${keyword}, red, blue)`);
    expect(g.angle).toBe(nominal);
    expect(g.toString()).not.toContain('deg');
    expect(new LinearGradient(g.toString()).toString()).toBe(g.toString());
  });

  it('keeps a corner through copy, addStop, the RefFields rebuild and GradientList', () => {
    const g = new LinearGradient('linear-gradient(to top right, red, blue)');
    const dir = 'linear-gradient(to top right,';
    expect(new LinearGradient(g).toString()).toContain(dir);
    expect(g.addStop('green').toString()).toContain(dir);
    expect(g.__teikn_fromFields__(g.__teikn_fields__()).toString()).toBe(g.toString());
    expect(new GradientList(g.toString()).toString()).toBe(g.toString());
  });

  it('reverse() flips a corner to the opposite corner', () => {
    const g = new LinearGradient('linear-gradient(to top right, red, blue)');
    expect(g.reverse().toString()).toBe(
      'linear-gradient(to bottom left, rgb(0, 0, 255), rgb(255, 0, 0))',
    );
  });

  it('rotate() turns a corner into a plain angle', () => {
    const g = new LinearGradient('linear-gradient(to top right, red, blue)');
    expect(g.rotate(10).toString()).toContain('linear-gradient(55deg,');
  });

  it.each([
    ['to  right', 90],
    ['.25turn', 90],
    ['0.1turn', 36],
    ['-90DEG', 270],
    ['100grad', 90],
  ])('parses the direction "%s"', (dir, angle) => {
    expect(new LinearGradient(`  linear-gradient(${dir}, red, blue)\n`).angle).toBe(angle);
  });

  it('rejects an invalid keyword direction', () => {
    expect(() => new LinearGradient('linear-gradient(to top bottom, red, blue)')).toThrow(
      'Invalid linear-gradient direction',
    );
  });
});

describe('reverse() stop positions', () => {
  it('mirrors percentages without float noise', () => {
    const g = new LinearGradient(90, [
      ['red', '0%'],
      ['green', '66.6%'],
      ['blue', '100%'],
    ]);
    expect(g.reverse().stops.map(s => s.position)).toEqual(['0%', '33.4%', '100%']);
  });

  it('mirrors and swaps a two-position stop, and a unitless zero', () => {
    const g = new RadialGradient('radial-gradient(red 0, blue 10% 30%)');
    expect(g.reverse().stops.map(s => s.position)).toEqual(['70% 90%', '100%']);
  });

  it('leaves unpositioned stops unpositioned', () => {
    const g = new LinearGradient(90, ['red', ['green', '30%'], 'blue']);
    expect(g.reverse().stops.map(s => s.position)).toEqual([undefined, '70%', undefined]);
  });

  it('throws rather than emit descending non-percentage stops', () => {
    const stops: [string, string][] = [
      ['red', '10px'],
      ['blue', '50px'],
    ];
    expect(() => new LinearGradient(90, stops).reverse()).toThrow('non-percentage stop position');
    expect(() => new RadialGradient({}, stops).reverse()).toThrow('non-percentage stop position');
  });
});

describe('stop color coercion', () => {
  it('coerces a string color in a GradientStop object', () => {
    const g = new LinearGradient(90, [{ color: 'red', position: '0%' }, 'blue']);
    expect(g.stops[0]!.color).toBeInstanceOf(Color);
    expect(g.toString()).toBe('linear-gradient(to right, rgb(255, 0, 0) 0%, rgb(0, 0, 255))');
    expect(new RadialGradient({}, [{ color: 'red' }]).stops[0]!.color).toBeInstanceOf(Color);
  });

  it('validates a string color in a GradientStop object', () => {
    expect(() => new LinearGradient(90, [{ color: 'not-a-color' }])).toThrow();
  });

  it('leaves a {ref} in a GradientStop object untouched', () => {
    const g = new LinearGradient(90, [{ color: '{ink}', position: '0%' }, 'blue']);
    expect(g.stops[0]!.color).toBe('{ink}');
  });

  it('coerces a raw string color when rebuilt from resolved fields', () => {
    const ink = new Color('#336699');
    const fields = { stops: [{ color: '#336699' }, { color: ink, position: '100%' }] };
    const linear = new LinearGradient(90, ['{ink}']).__teikn_fromFields__({ angle: 90, ...fields });
    const radial = new RadialGradient({}, ['{ink}']).__teikn_fromFields__(fields);

    for (const g of [linear, radial]) {
      expect(g.stops[0]!.color).toBeInstanceOf(Color);
      expect(String(g.stops[0]!.color)).toBe(String(ink));
      expect(g.stops[1]!.color).toBe(ink);
    }
  });
});

describe('stop parsing', () => {
  const positions = (stops: string) =>
    new LinearGradient(`linear-gradient(${stops})`).stops.map(s => s.position);

  it.each([
    ['red 10% 30%, blue', ['10% 30%', undefined]],
    ['red -10%, blue', ['-10%', undefined]],
    ['red 0, blue 100%', ['0', '100%']],
    ['red .5%, blue', ['.5%', undefined]],
    ['red 5pt, blue 2ch', ['5pt', '2ch']],
    ['rgba(255, 0, 0, 0.5)  10%   30%,blue', ['10% 30%', undefined]],
  ])('parses "%s"', (stops, expected) => {
    expect(positions(stops)).toEqual(expected);
  });

  it('reports color hints as unsupported', () => {
    expect(() => new LinearGradient('linear-gradient(red, 30%, blue)')).toThrow(
      'color hints are not supported',
    );
  });

  it('reports calc() positions as unsupported', () => {
    expect(() => new LinearGradient('linear-gradient(red calc(10% + 5px), blue)')).toThrow(
      'calc() positions are not supported',
    );
  });
});

describe('immutability', () => {
  const stops: [string, string][] = [
    ['red', '0%'],
    ['blue', '100%'],
  ];
  const mutate = (g: LinearGradient | RadialGradient) => {
    expect(() => (g.stops as GradientStop[]).push({ color: 'green' })).toThrow();
    expect(() => {
      (g.stops[0] as GradientStop).position = '99%';
    }).toThrow();
  };

  it.each([
    ['LinearGradient', new LinearGradient(90, stops)],
    ['parsed LinearGradient', new LinearGradient('linear-gradient(red 0%, blue 100%)')],
    ['RadialGradient', new RadialGradient({}, stops)],
    ['parsed RadialGradient', new RadialGradient('radial-gradient(red 0%, blue 100%)')],
  ])('%s stops cannot be mutated', (_name, g) => {
    const before = g.toString();
    mutate(g);
    mutate(g instanceof LinearGradient ? g.rotate(10) : g.setShape('circle'));
    expect(g.toString()).toBe(before);
  });

  it('does not alias the caller’s stop objects or array', () => {
    const stop = { color: new Color('red'), position: '0%' };
    const input = [stop];
    const g = new LinearGradient(90, input);
    stop.position = '50%';
    input.push(stop);
    expect(g.toString()).toBe('linear-gradient(to right, rgb(255, 0, 0) 0%)');
  });

  it('GradientList layers cannot be mutated', () => {
    const layer = new LinearGradient(90, stops);
    const input = [layer];
    const list = new GradientList(input);
    input.push(layer);
    expect(list.length).toBe(1);
    expect(() => (list.layers as LinearGradient[]).push(layer)).toThrow();
    expect(() => (new GradientList(String(list)).layers as LinearGradient[]).pop()).toThrow();
  });
});

describe('string round trip', () => {
  const linear = [
    new LinearGradient(0, ['red', 'blue']),
    new LinearGradient(45, ['red', 'blue']),
    new LinearGradient(90, [{ color: 'red', position: '0%' }, 'blue']),
    new LinearGradient(137.5, [
      ['red', '-10%'],
      ['rgba(0, 0, 0, 0.5)', '10% 30%'],
      ['blue', '5pt'],
    ]),
    new LinearGradient(315, ['red']).addStop('blue', '0'),
    new LinearGradient('linear-gradient(to right top, red, blue .5%)'),
    new LinearGradient('linear-gradient(to bottom left, red, blue)').reverse(),
    new LinearGradient('linear-gradient(1rad, red, blue)'),
  ];
  const radial = [
    new RadialGradient({}, ['red', 'blue']),
    new RadialGradient({ position: 'top left' }, ['red', 'blue']),
    new RadialGradient({ shape: 'circle' }, ['red', 'blue']),
    new RadialGradient({ shape: 'circle', size: '100px' }, ['red', 'blue']),
    new RadialGradient({ shape: 'circle', size: 'closest-side', position: '10px 20%' }, ['red']),
    new RadialGradient({ shape: 'ellipse', size: '50% 30%', position: '20% 40%' }, ['red']),
    new RadialGradient({ size: 'closest-corner' }, [
      ['red', '10%'],
      ['blue', '90%'],
    ]),
    new RadialGradient({ shape: 'ellipse', size: '100px' }, ['red', 'blue']),
    new RadialGradient({ position: 'center' }, ['red', 'blue']).setPosition('bottom'),
  ];

  it.each(linear.map(g => [String(g), g] as const))('LinearGradient %s', (css, g) => {
    const parsed = new LinearGradient(css);
    expect(String(parsed)).toBe(css);
    expect(parsed.angle).toBe(g.angle);
    expect(parsed.stops).toEqual(g.stops);
  });

  it.each(radial.map(g => [String(g), g] as const))('RadialGradient %s', (css, g) => {
    const parsed = new RadialGradient(css);
    expect(String(parsed)).toBe(css);
    expect([parsed.shape, parsed.size, parsed.position]).toEqual([g.shape, g.size, g.position]);
    expect(parsed.stops).toEqual(g.stops);
  });

  it('GradientList', () => {
    const css = [...linear, ...radial].map(String).join(', ');
    const list = new GradientList(css);
    expect(list.length).toBe(linear.length + radial.length);
    expect(String(list)).toBe(css);
  });
});

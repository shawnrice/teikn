import { describe, expect, it } from 'bun:test';
import { Color } from './Color';
import { LinearGradient, RadialGradient } from './Gradient';

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

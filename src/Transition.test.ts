import { describe, expect, it } from 'bun:test';
import { CubicBezier } from './CubicBezier';
import { Transition } from './Transition';

describe('Transition', () => {
  // ─── Construction ────────────────────────────────────────────

  it('constructs from duration and timing string', () => {
    const t = new Transition('0.2s', 'ease');
    expect(t.duration).toBe('0.2s');
    expect(t.timingFunction).toBeInstanceOf(CubicBezier);
    expect(t.timingFunction.keyword).toBe('ease');
  });

  it('constructs from duration and CubicBezier', () => {
    const t = new Transition('300ms', CubicBezier.standard);
    expect(t.duration).toBe('300ms');
    expect(t.timingFunction.x1).toBe(0.4);
  });

  it('constructs with delay', () => {
    const t = new Transition('0.2s', 'ease', '50ms');
    expect(t.delay).toBe('50ms');
  });

  it('constructs with property', () => {
    const t = new Transition('0.2s', 'ease', '0s', 'opacity');
    expect(t.property).toBe('opacity');
  });

  it('constructs with all parameters', () => {
    const t = new Transition('200ms', CubicBezier.standard, '50ms', 'transform');
    expect(t.duration).toBe('200ms');
    expect(t.timingFunction.x1).toBe(0.4);
    expect(t.delay).toBe('50ms');
    expect(t.property).toBe('transform');
  });

  it('defaults delay to 0s', () => {
    const t = new Transition('0.2s', 'ease');
    expect(t.delay).toBe('0s');
  });

  it('defaults property to all', () => {
    const t = new Transition('0.2s', 'ease');
    expect(t.property).toBe('all');
  });

  // ─── CSS string parsing ──────────────────────────────────────

  it('parses simple CSS: "0.2s ease"', () => {
    const t = new Transition('0.2s ease');
    expect(t.duration).toBe('0.2s');
    expect(t.timingFunction.keyword).toBe('ease');
    expect(t.delay).toBe('0s');
    expect(t.property).toBe('all');
  });

  it('parses with property: "opacity 0.2s ease"', () => {
    const t = new Transition('opacity 0.2s ease');
    expect(t.property).toBe('opacity');
    expect(t.duration).toBe('0.2s');
    expect(t.timingFunction.keyword).toBe('ease');
  });

  it('parses with delay: "all 200ms ease 50ms"', () => {
    const t = new Transition('all 200ms ease 50ms');
    expect(t.property).toBe('all');
    expect(t.duration).toBe('200ms');
    expect(t.timingFunction.keyword).toBe('ease');
    expect(t.delay).toBe('50ms');
  });

  it('parses cubic-bezier: "0.3s cubic-bezier(0.4, 0, 0.2, 1)"', () => {
    const t = new Transition('0.3s cubic-bezier(0.4, 0, 0.2, 1)');
    expect(t.duration).toBe('0.3s');
    expect(t.timingFunction.x1).toBe(0.4);
    expect(t.timingFunction.y1).toBe(0);
    expect(t.timingFunction.x2).toBe(0.2);
    expect(t.timingFunction.y2).toBe(1);
  });

  it('parses full: "transform 200ms cubic-bezier(0.4, 0, 0.2, 1) 50ms"', () => {
    const t = new Transition('transform 200ms cubic-bezier(0.4, 0, 0.2, 1) 50ms');
    expect(t.property).toBe('transform');
    expect(t.duration).toBe('200ms');
    expect(t.timingFunction.x1).toBe(0.4);
    expect(t.delay).toBe('50ms');
  });

  it('parses keyword timings: ease-in, ease-out, ease-in-out, linear', () => {
    expect(new Transition('0.2s ease-in').timingFunction.keyword).toBe('ease-in');
    expect(new Transition('0.2s ease-out').timingFunction.keyword).toBe('ease-out');
    expect(new Transition('0.2s ease-in-out').timingFunction.keyword).toBe('ease-in-out');
    expect(new Transition('0.2s linear').timingFunction.keyword).toBe('linear');
  });

  // ─── Copy constructor ────────────────────────────────────────

  it('copies from existing Transition', () => {
    const a = new Transition('200ms', CubicBezier.standard, '50ms', 'transform');
    const b = new Transition(a);
    expect(b.duration).toBe(a.duration);
    expect(b.timingFunction.controlPoints).toEqual(a.timingFunction.controlPoints);
    expect(b.delay).toBe(a.delay);
    expect(b.property).toBe(a.property);
    expect(b).not.toBe(a);
  });

  // ─── Getters ─────────────────────────────────────────────────

  it('duration getter returns duration string', () => {
    expect(new Transition('0.3s', 'ease').duration).toBe('0.3s');
  });

  it('timingFunction getter returns CubicBezier', () => {
    const t = new Transition('0.2s', CubicBezier.easeIn);
    expect(t.timingFunction).toBeInstanceOf(CubicBezier);
    expect(t.timingFunction.keyword).toBe('ease-in');
  });

  it('delay getter returns delay string', () => {
    expect(new Transition('0.2s', 'ease', '100ms').delay).toBe('100ms');
  });

  it('property getter returns property string', () => {
    expect(new Transition('0.2s', 'ease', '0s', 'opacity').property).toBe('opacity');
  });

  // ─── Immutable setters ───────────────────────────────────────

  it('setDuration returns new instance', () => {
    const a = new Transition('0.2s', 'ease');
    const b = a.setDuration('0.5s');
    expect(b.duration).toBe('0.5s');
    expect(a.duration).toBe('0.2s');
  });

  it('setTimingFunction with CubicBezier', () => {
    const a = new Transition('0.2s', 'ease');
    const b = a.setTimingFunction(CubicBezier.standard);
    expect(b.timingFunction.x1).toBe(0.4);
    expect(a.timingFunction.keyword).toBe('ease');
  });

  it('setTimingFunction with string', () => {
    const a = new Transition('0.2s', 'ease');
    const b = a.setTimingFunction('ease-in-out');
    expect(b.timingFunction.keyword).toBe('ease-in-out');
    expect(a.timingFunction.keyword).toBe('ease');
  });

  it('setDelay returns new instance', () => {
    const a = new Transition('0.2s', 'ease');
    const b = a.setDelay('100ms');
    expect(b.delay).toBe('100ms');
    expect(a.delay).toBe('0s');
  });

  it('setProperty returns new instance', () => {
    const a = new Transition('0.2s', 'ease');
    const b = a.setProperty('opacity');
    expect(b.property).toBe('opacity');
    expect(a.property).toBe('all');
  });

  // ─── Serialization ──────────────────────────────────────────

  it('toString with defaults omits property and delay', () => {
    const t = new Transition('0.2s', 'ease');
    expect(t.toString()).toBe('0.2s ease');
  });

  it('toString includes property when not "all"', () => {
    const t = new Transition('0.2s', 'ease', '0s', 'opacity');
    expect(t.toString()).toBe('opacity 0.2s ease');
  });

  it('toString includes delay when not "0s"', () => {
    const t = new Transition('0.2s', 'ease', '50ms');
    expect(t.toString()).toBe('0.2s ease 50ms');
  });

  it('toString with cubic-bezier timing', () => {
    const t = new Transition('200ms', CubicBezier.standard, '50ms', 'transform');
    expect(t.toString()).toBe('transform 200ms cubic-bezier(0.4, 0, 0.2, 1) 50ms');
  });

  it('toJSON returns same as toString', () => {
    const t = new Transition('0.2s', 'ease', '50ms', 'opacity');
    expect(t.toJSON()).toBe(t.toString());
  });

  // ─── Static presets ──────────────────────────────────────────

  it('Transition.fade exists', () => {
    expect(Transition.fade.duration).toBe('0.2s');
    expect(Transition.fade.timingFunction.keyword).toBe('ease');
    expect(Transition.fade.toString()).toBe('0.2s ease');
  });

  it('Transition.slide uses Material standard curve', () => {
    expect(Transition.slide.duration).toBe('0.3s');
    expect(Transition.slide.timingFunction.x1).toBe(0.4);
    expect(Transition.slide.timingFunction.y2).toBe(1);
  });

  it('Transition.quick is fast', () => {
    expect(Transition.quick.duration).toBe('0.1s');
    expect(Transition.quick.timingFunction.keyword).toBe('ease');
  });

  // ─── Round-trip ──────────────────────────────────────────────

  it('parsing toString output produces equivalent Transition', () => {
    const original = new Transition('200ms', CubicBezier.standard, '50ms', 'transform');
    const roundTripped = new Transition(original.toString());
    expect(roundTripped.duration).toBe(original.duration);
    expect(roundTripped.timingFunction.controlPoints).toEqual(original.timingFunction.controlPoints);
    expect(roundTripped.delay).toBe(original.delay);
    expect(roundTripped.property).toBe(original.property);
  });
});

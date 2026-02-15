import { describe, expect, it } from 'bun:test';
import { BoxShadow } from './BoxShadow';
import { Color } from './Color';

describe('BoxShadow', () => {
  // ─── Construction ────────────────────────────────────────────

  it('creates from numbers', () => {
    const s = new BoxShadow(0, 2, 8, 0, 'rgba(0,0,0,.12)');
    expect(s.offsetX).toBe(0);
    expect(s.offsetY).toBe(2);
    expect(s.blur).toBe(8);
    expect(s.spread).toBe(0);
    expect(s.color).toBeInstanceOf(Color);
    expect(s.inset).toBe(false);
  });

  it('creates from numbers with defaults', () => {
    const s = new BoxShadow(1, 2);
    expect(s.blur).toBe(0);
    expect(s.spread).toBe(0);
    expect(s.inset).toBe(false);
  });

  it('creates from a Color instance', () => {
    const c = new Color(255, 0, 0);
    const s = new BoxShadow(0, 4, 8, 0, c);
    expect(s.color.red).toBe(255);
  });

  it('creates with inset flag', () => {
    const s = new BoxShadow(0, 2, 4, 0, '#000', true);
    expect(s.inset).toBe(true);
  });

  it('creates from a CSS string', () => {
    const s = new BoxShadow('0 1px 2px rgba(0,0,0,.1)');
    expect(s.offsetX).toBe(0);
    expect(s.offsetY).toBe(1);
    expect(s.blur).toBe(2);
    expect(s.spread).toBe(0);
  });

  it('creates from a CSS string with spread', () => {
    const s = new BoxShadow('0 2px 8px 4px rgba(0,0,0,.12)');
    expect(s.offsetX).toBe(0);
    expect(s.offsetY).toBe(2);
    expect(s.blur).toBe(8);
    expect(s.spread).toBe(4);
  });

  it('creates from a CSS string with inset at start', () => {
    const s = new BoxShadow('inset 0 2px 4px #000');
    expect(s.inset).toBe(true);
    expect(s.offsetX).toBe(0);
    expect(s.offsetY).toBe(2);
    expect(s.blur).toBe(4);
  });

  it('creates from a CSS string with inset at end', () => {
    const s = new BoxShadow('0 2px 4px #000 inset');
    expect(s.inset).toBe(true);
  });

  it('creates from a CSS string with hex color', () => {
    const s = new BoxShadow('0 1px 2px #ff0000');
    expect(s.color.red).toBe(255);
    expect(s.color.green).toBe(0);
    expect(s.color.blue).toBe(0);
  });

  it('creates from a CSS string with negative offsets', () => {
    const s = new BoxShadow('-2px 4px 8px #000');
    expect(s.offsetX).toBe(-2);
    expect(s.offsetY).toBe(4);
  });

  it('creates as a copy', () => {
    const a = new BoxShadow(0, 4, 12, 2, '#333');
    const b = new BoxShadow(a);
    expect(b.offsetX).toBe(a.offsetX);
    expect(b.offsetY).toBe(a.offsetY);
    expect(b.blur).toBe(a.blur);
    expect(b.spread).toBe(a.spread);
  });

  // ─── Setters ─────────────────────────────────────────────────

  it('setOffsetX returns new instance', () => {
    const a = new BoxShadow(0, 2, 4);
    const b = a.setOffsetX(5);
    expect(b.offsetX).toBe(5);
    expect(a.offsetX).toBe(0);
  });

  it('setOffsetY returns new instance', () => {
    const a = new BoxShadow(0, 2, 4);
    const b = a.setOffsetY(10);
    expect(b.offsetY).toBe(10);
    expect(a.offsetY).toBe(2);
  });

  it('setBlur returns new instance', () => {
    const a = new BoxShadow(0, 2, 4);
    const b = a.setBlur(16);
    expect(b.blur).toBe(16);
    expect(a.blur).toBe(4);
  });

  it('setSpread returns new instance', () => {
    const a = new BoxShadow(0, 2, 4);
    const b = a.setSpread(8);
    expect(b.spread).toBe(8);
    expect(a.spread).toBe(0);
  });

  it('setColor accepts a string', () => {
    const a = new BoxShadow(0, 2, 4, 0, '#000');
    const b = a.setColor('red');
    expect(b.color.red).toBe(255);
  });

  it('setColor accepts a Color', () => {
    const a = new BoxShadow(0, 2, 4, 0, '#000');
    const b = a.setColor(new Color(0, 255, 0));
    expect(b.color.green).toBe(255);
  });

  it('setInset returns new instance', () => {
    const a = new BoxShadow(0, 2, 4);
    const b = a.setInset(true);
    expect(b.inset).toBe(true);
    expect(a.inset).toBe(false);
  });

  // ─── Manipulation ────────────────────────────────────────────

  it('scale multiplies all numeric values', () => {
    const a = new BoxShadow(1, 2, 4, 1, '#000');
    const b = a.scale(2);
    expect(b.offsetX).toBe(2);
    expect(b.offsetY).toBe(4);
    expect(b.blur).toBe(8);
    expect(b.spread).toBe(2);
  });

  // ─── Serialization ──────────────────────────────────────────

  it('toString() outputs CSS box-shadow value', () => {
    const s = new BoxShadow(0, 2, 8, 0, new Color(0, 0, 0, 0.12));
    const str = s.toString();
    expect(str).toContain('0 2px 8px');
    expect(str).toContain('rgba');
  });

  it('toString() omits blur and spread when both zero', () => {
    const s = new BoxShadow(0, 0, 0, 0, '#000');
    const str = s.toString();
    expect(str).toBe('0 0 rgb(0, 0, 0)');
  });

  it('toString() includes spread when non-zero', () => {
    const s = new BoxShadow(0, 0, 0, 4, '#000');
    const str = s.toString();
    expect(str).toBe('0 0 0 4px rgb(0, 0, 0)');
  });

  it('toString() includes inset keyword', () => {
    const s = new BoxShadow(0, 2, 4, 0, '#000', true);
    expect(s.toString()).toMatch(/^inset /);
  });

  it('toJSON() equals toString()', () => {
    const s = new BoxShadow(0, 2, 4, 0, '#000');
    expect(s.toJSON()).toBe(s.toString());
  });

  // ─── Static methods ─────────────────────────────────────────

  it('combine() joins multiple shadows', () => {
    const a = new BoxShadow(0, 1, 2, 0, '#000');
    const b = new BoxShadow(0, 4, 8, 0, '#000');
    const combined = BoxShadow.combine(a, b);
    expect(combined).toBe(`${a.toString()}, ${b.toString()}`);
  });
});

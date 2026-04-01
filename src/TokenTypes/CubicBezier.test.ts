import { describe, expect, it } from "bun:test";
import { CubicBezier } from "./CubicBezier";

describe("CubicBezier", () => {
  // ─── Construction ────────────────────────────────────────────

  it("creates from four numbers", () => {
    const b = new CubicBezier(0.4, 0, 0.2, 1);
    expect(b.x1).toBe(0.4);
    expect(b.y1).toBe(0);
    expect(b.x2).toBe(0.2);
    expect(b.y2).toBe(1);
  });

  it("creates from a CSS string", () => {
    const b = new CubicBezier("cubic-bezier(0.42, 0, 0.58, 1)");
    expect(b.x1).toBe(0.42);
    expect(b.y1).toBe(0);
    expect(b.x2).toBe(0.58);
    expect(b.y2).toBe(1);
  });

  it("creates from a named timing keyword", () => {
    const b = new CubicBezier("ease");
    expect(b.controlPoints).toEqual([0.25, 0.1, 0.25, 1]);
  });

  it("creates from a named keyword (case-insensitive)", () => {
    const b = new CubicBezier("Ease-In-Out");
    expect(b.controlPoints).toEqual([0.42, 0, 0.58, 1]);
  });

  it("creates as a copy", () => {
    const a = new CubicBezier(0.4, 0, 0.2, 1);
    const b = new CubicBezier(a);
    expect(b.controlPoints).toEqual(a.controlPoints);
  });

  it("creates from an options object", () => {
    const b = new CubicBezier({ x1: 0.4, y1: 0, x2: 0.2, y2: 1 });
    expect(b.x1).toBe(0.4);
    expect(b.y1).toBe(0);
    expect(b.x2).toBe(0.2);
    expect(b.y2).toBe(1);
  });

  it("from() accepts a string", () => {
    const b = CubicBezier.from("ease-in");
    expect(b.keyword).toBe("ease-in");
  });

  it("from() accepts an options object", () => {
    const b = CubicBezier.from({ x1: 0.4, y1: 0, x2: 0.2, y2: 1 });
    expect(b.x1).toBe(0.4);
    expect(b.y2).toBe(1);
  });

  it("from() accepts a CubicBezier", () => {
    const a = new CubicBezier(0.4, 0, 0.2, 1);
    const b = CubicBezier.from(a);
    expect(b.x1).toBe(0.4);
    expect(b).not.toBe(a);
  });

  it("throws on invalid string", () => {
    expect(() => new CubicBezier("not-a-timing")).toThrow("Invalid cubic-bezier");
  });

  it("clamps x values to [0, 1]", () => {
    const b = new CubicBezier(-0.5, 0.2, 1.5, 0.8);
    expect(b.x1).toBe(0);
    expect(b.x2).toBe(1);
  });

  it("allows y values outside [0, 1]", () => {
    const b = new CubicBezier(0.3, -0.5, 0.7, 1.5);
    expect(b.y1).toBe(-0.5);
    expect(b.y2).toBe(1.5);
  });

  // ─── Evaluation ──────────────────────────────────────────────

  it("at(0) returns 0", () => {
    expect(CubicBezier.ease.at(0)).toBe(0);
  });

  it("at(1) returns 1", () => {
    expect(CubicBezier.ease.at(1)).toBe(1);
  });

  it("linear at(0.5) returns ~0.5", () => {
    expect(CubicBezier.linear.at(0.5)).toBeCloseTo(0.5, 4);
  });

  it("ease-in starts slow", () => {
    const val = CubicBezier.easeIn.at(0.25);
    expect(val).toBeLessThan(0.25);
  });

  it("ease-out starts fast", () => {
    const val = CubicBezier.easeOut.at(0.25);
    expect(val).toBeGreaterThan(0.25);
  });

  it("at() is monotonically increasing for standard curves", () => {
    const b = CubicBezier.standard;
    let prev = 0;
    for (let t = 0; t <= 1; t += 0.05) {
      const val = b.at(t);
      expect(val).toBeGreaterThanOrEqual(prev - EPSILON);
      prev = val;
    }
  });

  // ─── Manipulation ────────────────────────────────────────────

  it("reverse() produces the opposite curve", () => {
    const b = new CubicBezier(0.4, 0, 0.2, 1);
    const r = b.reverse();
    expect(r.x1).toBeCloseTo(0.8, 5);
    expect(r.y1).toBeCloseTo(0, 5);
    expect(r.x2).toBeCloseTo(0.6, 5);
    expect(r.y2).toBeCloseTo(1, 5);
  });

  it("scaleY() scales y control points", () => {
    const b = new CubicBezier(0.4, 0.5, 0.2, 0.8);
    const s = b.scaleY(2);
    expect(s.y1).toBe(1);
    expect(s.y2).toBe(1.6);
    expect(s.x1).toBe(0.4);
    expect(s.x2).toBe(0.2);
  });

  // ─── Keyword detection ──────────────────────────────────────

  it("keyword returns name for matching preset", () => {
    expect(CubicBezier.ease.keyword).toBe("ease");
    expect(CubicBezier.easeIn.keyword).toBe("ease-in");
    expect(CubicBezier.easeOut.keyword).toBe("ease-out");
    expect(CubicBezier.easeInOut.keyword).toBe("ease-in-out");
    expect(CubicBezier.linear.keyword).toBe("linear");
  });

  it("keyword returns null for non-preset curves", () => {
    expect(CubicBezier.standard.keyword).toBeNull();
    expect(new CubicBezier(0.1, 0.2, 0.3, 0.4).keyword).toBeNull();
  });

  // ─── Serialization ──────────────────────────────────────────

  it("toString() returns CSS cubic-bezier function", () => {
    expect(CubicBezier.standard.toString()).toBe("cubic-bezier(0.4, 0, 0.2, 1)");
  });

  it("toJSON() returns the same as toString()", () => {
    expect(CubicBezier.ease.toJSON()).toBe(CubicBezier.ease.toString());
  });

  // ─── Static presets ─────────────────────────────────────────

  it("provides Material Design curves", () => {
    expect(CubicBezier.standard.toString()).toBe("cubic-bezier(0.4, 0, 0.2, 1)");
    expect(CubicBezier.accelerate.toString()).toBe("cubic-bezier(0.4, 0, 1, 1)");
    expect(CubicBezier.decelerate.toString()).toBe("cubic-bezier(0, 0, 0.2, 1)");
  });

  // ─── Immutability ───────────────────────────────────────────

  it("reverse() returns a new instance", () => {
    const a = CubicBezier.ease;
    const b = a.reverse();
    expect(a).not.toBe(b);
    expect(a.controlPoints).toEqual([0.25, 0.1, 0.25, 1]);
  });
});

const EPSILON = 1e-4;

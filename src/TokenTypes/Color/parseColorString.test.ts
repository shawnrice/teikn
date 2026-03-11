import { describe, expect, test } from "bun:test";

import { parseColorString } from "./parseColorString";

describe("parseColorString", () => {
  // ─── Hex ──────────────────────────────────────────────────

  test("parses 6-digit hex", () => {
    const result = parseColorString("#ff0000");
    expect(result.space).toBe("rgb");
    expect(result.data).toEqual([255, 0, 0]);
    expect(result.alpha).toBe(1);
  });

  test("parses 3-digit hex", () => {
    const result = parseColorString("#f00");
    expect(result.space).toBe("rgb");
    expect(result.data).toEqual([255, 0, 0]);
    expect(result.alpha).toBe(1);
  });

  test("parses 4-digit hex with alpha", () => {
    const result = parseColorString("#f008");
    expect(result.space).toBe("rgb");
    expect(result.data).toEqual([255, 0, 0]);
    expect(result.alpha).toBeCloseTo(0x88 / 255);
  });

  test("parses 8-digit hex with alpha", () => {
    const result = parseColorString("#ff000080");
    expect(result.space).toBe("rgb");
    expect(result.data).toEqual([255, 0, 0]);
    expect(result.alpha).toBeCloseTo(128 / 255);
  });

  test("rejects 5-digit and 7-digit hex", () => {
    expect(() => parseColorString("#abcde")).toThrow();
    expect(() => parseColorString("#abcdeff")).toThrow();
  });

  // ─── RGB / RGBA ───────────────────────────────────────────

  test("parses rgb string", () => {
    const result = parseColorString("rgb(100, 150, 200)");
    expect(result.space).toBe("rgb");
    expect(result.data).toEqual([100, 150, 200]);
    expect(result.alpha).toBe(1);
  });

  test("parses rgba string", () => {
    const result = parseColorString("rgba(100, 150, 200, 0.5)");
    expect(result.space).toBe("rgb");
    expect(result.data).toEqual([100, 150, 200]);
    expect(result.alpha).toBe(0.5);
  });

  // ─── HSL / HSLA ───────────────────────────────────────────

  test("parses hsl string", () => {
    const result = parseColorString("hsl(120, 50%, 50%)");
    expect(result.space).toBe("hsl");
    expect(result.data[0]).toBeCloseTo(120);
    expect(result.data[1]).toBeCloseTo(0.5);
    expect(result.data[2]).toBeCloseTo(0.5);
    expect(result.alpha).toBe(1);
  });

  test("parses hsla string", () => {
    const result = parseColorString("hsla(120, 50%, 50%, 0.7)");
    expect(result.space).toBe("hsl");
    expect(result.alpha).toBeCloseTo(0.7);
  });

  test("parses hsl with hue > 360 by wrapping", () => {
    const result = parseColorString("hsl(361, 50%, 50%)");
    expect(result.space).toBe("hsl");
    expect(result.data[0]).toBeCloseTo(1);
  });

  test("parses hsl with negative hue by wrapping", () => {
    const result = parseColorString("hsl(-90, 50%, 50%)");
    expect(result.space).toBe("hsl");
    expect(result.data[0]).toBeCloseTo(270);
  });

  test("parses hsl with slash alpha", () => {
    const result = parseColorString("hsl(200, 60%, 40% / 0.3)");
    expect(result.space).toBe("hsl");
    expect(result.alpha).toBeCloseTo(0.3);
  });

  // ─── LAB ──────────────────────────────────────────────────

  test("parses LAB color string", () => {
    const result = parseColorString("lab(50 20 -30)");
    expect(result.space).toBe("lab");
    expect(result.data[0]).toBeCloseTo(50);
    expect(result.data[1]).toBeCloseTo(20);
    expect(result.data[2]).toBeCloseTo(-30);
    expect(result.alpha).toBe(1);
  });

  test("parses LAB with alpha", () => {
    const result = parseColorString("lab(50 20 -30 / 0.8)");
    expect(result.space).toBe("lab");
    expect(result.data[0]).toBeCloseTo(50);
    expect(result.data[1]).toBeCloseTo(20);
    expect(result.data[2]).toBeCloseTo(-30);
    expect(result.alpha).toBeCloseTo(0.8);
  });

  test("parses LAB with comma separators", () => {
    const result = parseColorString("lab(75, 10, -20)");
    expect(result.space).toBe("lab");
    expect(result.data[0]).toBeCloseTo(75);
    expect(result.data[1]).toBeCloseTo(10);
    expect(result.data[2]).toBeCloseTo(-20);
  });

  test("parses LAB with decimal values", () => {
    const result = parseColorString("lab(50.5 20.3 -30.7)");
    expect(result.space).toBe("lab");
    expect(result.data[0]).toBeCloseTo(50.5);
    expect(result.data[1]).toBeCloseTo(20.3);
    expect(result.data[2]).toBeCloseTo(-30.7);
  });

  // ─── LCH ──────────────────────────────────────────────────

  test("parses LCH color string", () => {
    const result = parseColorString("lch(50 30 120)");
    expect(result.space).toBe("lch");
    expect(result.data[0]).toBeCloseTo(50);
    expect(result.data[1]).toBeCloseTo(30);
    expect(result.data[2]).toBeCloseTo(120);
    expect(result.alpha).toBe(1);
  });

  test("parses LCH with alpha", () => {
    const result = parseColorString("lch(50 30 120 / 0.5)");
    expect(result.space).toBe("lch");
    expect(result.alpha).toBeCloseTo(0.5);
  });

  test("parses LCH with comma separators", () => {
    const result = parseColorString("lch(80, 40, 200)");
    expect(result.space).toBe("lch");
    expect(result.data[0]).toBeCloseTo(80);
    expect(result.data[1]).toBeCloseTo(40);
    expect(result.data[2]).toBeCloseTo(200);
  });

  test("parses LCH with decimal values", () => {
    const result = parseColorString("lch(50.5 30.2 120.8)");
    expect(result.space).toBe("lch");
    expect(result.data[0]).toBeCloseTo(50.5);
    expect(result.data[1]).toBeCloseTo(30.2);
    expect(result.data[2]).toBeCloseTo(120.8);
  });

  // ─── XYZ ──────────────────────────────────────────────────

  test("parses XYZ color string", () => {
    const result = parseColorString("xyz(0.5 0.3 0.2)");
    expect(result.space).toBe("xyz");
    expect(result.data[0]).toBeCloseTo(0.5);
    expect(result.data[1]).toBeCloseTo(0.3);
    expect(result.data[2]).toBeCloseTo(0.2);
    expect(result.alpha).toBe(1);
  });

  test("parses XYZ with alpha", () => {
    const result = parseColorString("xyz(0.5 0.3 0.2 / 0.9)");
    expect(result.space).toBe("xyz");
    expect(result.alpha).toBeCloseTo(0.9);
  });

  test("parses XYZ with comma separators", () => {
    const result = parseColorString("xyz(0.4, 0.5, 0.6)");
    expect(result.space).toBe("xyz");
    expect(result.data[0]).toBeCloseTo(0.4);
    expect(result.data[1]).toBeCloseTo(0.5);
    expect(result.data[2]).toBeCloseTo(0.6);
  });

  // ─── Named CSS colors ────────────────────────────────────

  test("parses named CSS color", () => {
    const result = parseColorString("red");
    expect(result.space).toBe("rgb");
    expect(result.data).toEqual([255, 0, 0]);
  });

  test("parses named CSS color case-insensitively", () => {
    const result = parseColorString("SteelBlue");
    expect(result.space).toBe("rgb");
    expect(result.alpha).toBe(1);
  });

  // ─── xkcd colors ─────────────────────────────────────────

  test("parses xkcd: prefixed color", () => {
    const result = parseColorString("xkcd:cerulean");
    expect(result.space).toBe("rgb");
    expect(result.alpha).toBe(1);
  });

  test("parses xkcd: color case-insensitively", () => {
    const result = parseColorString("XKCD:Cerulean");
    expect(result.space).toBe("rgb");
  });

  test("throws on unknown xkcd color", () => {
    expect(() => parseColorString("xkcd:notarealcolor")).toThrow("Unknown xkcd color");
  });

  // ─── Whitespace handling ──────────────────────────────────

  test("trims leading and trailing whitespace", () => {
    const result = parseColorString("  #ff0000  ");
    expect(result.space).toBe("rgb");
    expect(result.data).toEqual([255, 0, 0]);
  });

  // ─── Error cases ──────────────────────────────────────────

  test("throws on invalid color string", () => {
    expect(() => parseColorString("not-a-color")).toThrow("Cannot extract color");
  });

  test("throws on empty string", () => {
    expect(() => parseColorString("")).toThrow();
  });

  test("throws on rgb with out-of-range values", () => {
    expect(() => parseColorString("rgb(999, 999, 999)")).toThrow();
  });
});

import { describe, expect, test } from "bun:test";

import { composite, dim, dp, dur, group, ref, scale, theme } from "./builders.js";
import { Color } from "./TokenTypes/Color/index.js";
import { Dimension } from "./TokenTypes/Dimension.js";
import { Duration } from "./TokenTypes/Duration.js";

describe("builders edge cases: first-class value types", () => {
  test("tuple syntax with first-class Dimension value", () => {
    const result = group("spacing", { md: [dp(16), "Medium spacing"] });

    expect(result).toHaveLength(1);
    expect(result[0]!.value).toBeInstanceOf(Dimension);
    expect((result[0]!.value as Dimension).value).toBe(1);
    expect((result[0]!.value as Dimension).unit).toBe("rem");
    expect(result[0]!.usage).toBe("Medium spacing");
  });

  test("object syntax with first-class Dimension value and modes", () => {
    const result = group("spacing", {
      md: { value: dp(16), usage: "Medium", modes: { compact: dp(8) } },
    });

    expect(result).toHaveLength(1);
    expect(result[0]!.value).toBeInstanceOf(Dimension);
    expect((result[0]!.value as Dimension).value).toBe(1);
    expect(result[0]!.usage).toBe("Medium");
    expect(result[0]!.modes!.compact).toBeInstanceOf(Dimension);
    expect((result[0]!.modes!.compact as Dimension).value).toBe(0.5);
  });

  test("scale with numeric array and Dimension transform", () => {
    const result = scale("size", [10, 12, 14, 16], {
      transform: (n) => dp(n),
    });

    expect(result).toHaveLength(4);
    for (const token of result) {
      expect(token.value).toBeInstanceOf(Dimension);
      expect((token.value as Dimension).unit).toBe("rem");
    }
    expect((result[0]!.value as Dimension).value).toBe(10 / 16);
    expect((result[3]!.value as Dimension).value).toBe(1);
  });

  test("scale with record of Dimensions", () => {
    const result = scale("spacing", { sm: dp(8), md: dp(16) });

    expect(result).toHaveLength(2);
    expect(result[0]!.value).toBeInstanceOf(Dimension);
    expect((result[0]!.value as Dimension).value).toBe(0.5);
    expect(result[1]!.value).toBeInstanceOf(Dimension);
    expect((result[1]!.value as Dimension).value).toBe(1);
  });

  test("composite with nested first-class Dimension value", () => {
    const result = composite("typography", {
      heading: {
        fontFamily: "sans-serif",
        fontSize: dp(24),
        fontWeight: 700,
        lineHeight: 1.2,
      },
    });

    expect(result).toHaveLength(1);
    const value = result[0]!.value as Record<string, unknown>;
    expect(value.fontSize).toBeInstanceOf(Dimension);
    expect((value.fontSize as Dimension).value).toBe(1.5);
    expect(value.fontFamily).toBe("sans-serif");
    expect(value.fontWeight).toBe(700);
  });

  test("dur through group preserves Duration instances", () => {
    const result = group("duration", {
      fast: dur(150, "ms"),
      slow: dur(500, "ms"),
    });

    expect(result).toHaveLength(2);
    expect(result[0]!.value).toBeInstanceOf(Duration);
    expect((result[0]!.value as Duration).value).toBe(150);
    expect((result[0]!.value as Duration).unit).toBe("ms");
    expect(result[1]!.value).toBeInstanceOf(Duration);
    expect((result[1]!.value as Duration).value).toBe(500);
  });

  test("dim through group preserves Dimension instance", () => {
    const result = group("spacing", { gap: dim(1, "rem") });

    expect(result).toHaveLength(1);
    expect(result[0]!.value).toBeInstanceOf(Dimension);
    expect((result[0]!.value as Dimension).value).toBe(1);
    expect((result[0]!.value as Dimension).unit).toBe("rem");
  });

  test("theme with Color overrides preserves Color instances", () => {
    const colors = group("color", {
      primary: new Color("#0066cc"),
      secondary: new Color("#cc6600"),
    });

    const dark = theme("dark", colors, {
      primary: new Color("#fff"),
    });

    expect(dark.overrides["color.primary"]).toBeInstanceOf(Color);
    expect((dark.overrides["color.primary"] as Color).red).toBe(255);
  });

  test("mixed first-class and string values in same group", () => {
    const result = group("spacing", {
      sm: dp(8),
      custom: "2vw",
    });

    expect(result).toHaveLength(2);
    expect(result[0]!.value).toBeInstanceOf(Dimension);
    expect((result[0]!.value as Dimension).value).toBe(0.5);
    expect(result[1]!.value).toBe("2vw");
  });

  test("ref produces correct reference structure through group", () => {
    const result = group("color", {
      primary: "#0066cc",
      link: ref("primary"),
    });

    expect(result).toHaveLength(2);
    expect(result[0]!.value).toBe("#0066cc");
    expect(result[1]!.value).toBe("{primary}");
  });
});

import { describe, expect, test } from "bun:test";

import { Color } from "./TokenTypes/Color/index.js";
import { LinearGradient, RadialGradient } from "./TokenTypes/Gradient.js";
import { PalettePlugin } from "./Plugins/PalettePlugin.js";
import type { Token } from "./Token.js";

// ─── PalettePlugin edge cases ────────────────────────────────

describe("PalettePlugin edge cases", () => {
  const plugin = new PalettePlugin();

  test("generates palette from pure white without NaN/Infinity", () => {
    const tokens: Token[] = [{ name: "white", type: "color", value: "#ffffff" }];
    const result = plugin.expand(tokens);

    for (const token of result) {
      const color = new Color(token.value);
      expect(Number.isFinite(color.red)).toBe(true);
      expect(Number.isFinite(color.green)).toBe(true);
      expect(Number.isFinite(color.blue)).toBe(true);
    }
  });

  test("generates palette from pure black without NaN/Infinity", () => {
    const tokens: Token[] = [{ name: "black", type: "color", value: "#000000" }];
    const result = plugin.expand(tokens);

    for (const token of result) {
      const color = new Color(token.value);
      expect(Number.isFinite(color.red)).toBe(true);
      expect(Number.isFinite(color.green)).toBe(true);
      expect(Number.isFinite(color.blue)).toBe(true);
    }
  });
});

// ─── Gradient edge cases ─────────────────────────────────────

describe("Gradient edge cases", () => {
  test("LinearGradient with empty stops throws", () => {
    const g = new LinearGradient(90, []);
    expect(() => g.toString()).toThrow("at least one color stop");
  });

  test("RadialGradient with empty stops throws", () => {
    const g = new RadialGradient({}, []);
    expect(() => g.toString()).toThrow("at least one color stop");
  });
});

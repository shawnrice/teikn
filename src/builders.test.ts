import { describe, expect, test } from "bun:test";

import {
  composite,
  dim,
  dp,
  dur,
  group,
  onColor,
  onColors,
  ref,
  scale,
  theme,
  tokens,
} from "./builders";
import { Color } from "./TokenTypes/Color";
import { CubicBezier } from "./TokenTypes/CubicBezier";
import { Dimension } from "./TokenTypes/Dimension";
import { Duration } from "./TokenTypes/Duration";
import { Transition } from "./TokenTypes/Transition";

describe("builders", () => {
  describe("group", () => {
    test("creates tokens from plain values", () => {
      const result = group("color", {
        primary: "#0066cc",
        secondary: "#cc6600",
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        name: "primary",
        value: "#0066cc",
        type: "color",
        group: "color",
      });
      expect(result[1]).toEqual({
        name: "secondary",
        value: "#cc6600",
        type: "color",
        group: "color",
      });
    });

    test("creates tokens from [value, usage] tuples", () => {
      const result = group("color", {
        primary: ["#0066cc", "Main brand color"],
      });

      expect(result[0]).toEqual({
        name: "primary",
        value: "#0066cc",
        usage: "Main brand color",
        type: "color",
        group: "color",
      });
    });

    test("creates tokens from object inputs", () => {
      const result = group("color", {
        bg: { value: "#fff", usage: "Background", modes: { dark: "#1a1a1a" } },
      });

      expect(result[0]).toEqual({
        name: "bg",
        value: "#fff",
        usage: "Background",
        modes: { dark: "#1a1a1a" },
        type: "color",
        group: "color",
      });
    });

    test("handles Color instances", () => {
      const c = new Color(255, 0, 0);
      const result = group("color", { red: c });

      expect(result[0]!.value).toBe(c);
    });

    test("handles numeric values", () => {
      const result = group("zLayer", { modal: 5000 });
      expect(result[0]!.value).toBe(5000);
    });

    test("exposes named value properties on the returned array", () => {
      const fast = new Duration(100, "ms");
      const result = group("duration", { fast, slow: new Duration(300, "ms") });

      expect(result.fast).toBe(fast);
      expect(result.slow).toBeInstanceOf(Duration);
      expect(result.slow.toString()).toBe("300ms");
    });

    test("named properties unwrap tuple values", () => {
      const c = new Color(255, 0, 0);
      const result = group("color", { primary: [c, "Brand color"] });

      expect(result.primary).toBe(c);
    });

    test("named properties unwrap object input values", () => {
      const result = group("color", {
        surface: { value: "#fff", modes: { dark: "#1a1a1a" } },
      });

      expect(result.surface).toBe("#fff");
    });

    test("named properties work alongside array access", () => {
      const result = group("duration", {
        fast: new Duration(100, "ms"),
        slow: new Duration(300, "ms"),
      });

      // Still a Token[]
      expect(result).toHaveLength(2);
      expect(result[0]!.name).toBe("fast");

      // Also a named record
      expect(result.fast.toString()).toBe("100ms");
    });

    test("for...of iterates tokens only", () => {
      const result = group("duration", {
        fast: new Duration(100, "ms"),
        slow: new Duration(300, "ms"),
      });

      const names: string[] = [];
      for (const token of result) {
        names.push(token.name);
      }
      expect(names).toEqual(["fast", "slow"]);
    });

    test("for...in only sees array indices, not named properties", () => {
      const result = group("duration", {
        fast: new Duration(100, "ms"),
        slow: new Duration(300, "ms"),
      });

      const keys: string[] = [];
      for (const key in result) {
        keys.push(key);
      }
      // Only array indices — named properties are non-enumerable
      expect(keys).toEqual(["0", "1"]);
      expect(keys).not.toContain("fast");
      expect(keys).not.toContain("slow");
    });

    test("Object.keys only shows array indices", () => {
      const result = group("duration", {
        fast: new Duration(100, "ms"),
        slow: new Duration(300, "ms"),
      });
      expect(Object.keys(result)).toEqual(["0", "1"]);
    });

    test("JSON.stringify serializes as a plain array", () => {
      const result = group("color", { primary: "#000", secondary: "#fff" });
      const parsed = structuredClone(result);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(2);
    });

    test("spread produces plain Token[] without named props", () => {
      const result = group("duration", { fast: new Duration(100, "ms") });
      const spread = [...result];
      expect(spread).toHaveLength(1);
      expect((spread as any).fast).toBeUndefined();
    });

    test("throws when token name conflicts with Array.prototype", () => {
      expect(() => group("size", { length: "100px" })).toThrow("conflicts with Array.prototype");
      expect(() => group("size", { push: "100px" })).toThrow("conflicts with Array.prototype");
      expect(() => group("size", { map: "100px" })).toThrow("conflicts with Array.prototype");
    });

    test("named values compose into higher-level types", () => {
      const durations = group("duration", { fast: new Duration(100, "ms") });
      const easings = group("timing", { standard: CubicBezier.standard });

      const t = new Transition(durations.fast, easings.standard);
      expect(t.duration.toString()).toBe("100ms");
      expect(t.timingFunction.x1).toBe(0.4);
    });
  });

  describe("scale", () => {
    test("creates tokens from an object", () => {
      const result = scale("spacing", { xs: "0.25rem", sm: "0.5rem" });
      expect(result).toHaveLength(2);
      expect(result[0]!.name).toBe("xs");
      expect(result[0]!.value).toBe("0.25rem");
      expect(result[0]!.type).toBe("spacing");
    });

    test("creates tokens from a numeric array", () => {
      const result = scale("fontSize", [10, 12, 14], {
        names: ["100", "200", "300"],
        transform: (n) => `${n * 0.0625}rem`,
      });

      expect(result).toHaveLength(3);
      expect(result[0]!.name).toBe("100");
      expect(result[0]!.value).toBe("0.625rem");
      expect(result[2]!.name).toBe("300");
      expect(result[2]!.value).toBe("0.875rem");
    });

    test("uses index as name when names not provided", () => {
      const result = scale("size", [10, 20]);
      expect(result[0]!.name).toBe("0");
      expect(result[1]!.name).toBe("1");
    });

    test("uses identity transform when not provided", () => {
      const result = scale("zLayer", [1000, 2000]);
      expect(result[0]!.value).toBe(1000);
    });
  });

  describe("composite", () => {
    test("creates composite tokens", () => {
      const result = composite("typography", {
        heading: {
          fontFamily: "Rubik",
          fontSize: "2rem",
          fontWeight: 700,
          lineHeight: 1.2,
        },
      });

      expect(result).toHaveLength(1);
      expect(result[0]!.name).toBe("heading");
      expect(result[0]!.type).toBe("typography");
      expect(result[0]!.value).toEqual({
        fontFamily: "Rubik",
        fontSize: "2rem",
        fontWeight: 700,
        lineHeight: 1.2,
      });
    });

    test("creates composite with usage", () => {
      const result = composite("border", {
        card: [{ width: "1px", style: "solid", color: "#e0e0e0" }, "Card border"],
      });

      expect(result[0]!.usage).toBe("Card border");
    });

    test("creates composite with object-style input (value, usage, modes)", () => {
      const result = composite("typography", {
        heading: {
          value: { fontFamily: "Arial", fontSize: "2rem" },
          usage: "Page heading",
          modes: { dark: { fontFamily: "Helvetica" } },
        },
      });

      expect(result[0]!.value).toEqual({ fontFamily: "Arial", fontSize: "2rem" });
      expect(result[0]!.usage).toBe("Page heading");
      expect(result[0]!.modes).toEqual({ dark: { fontFamily: "Helvetica" } });
    });

    test("creates composite with object-style input without modes", () => {
      const result = composite("border", {
        card: {
          value: { width: "1px", style: "solid" },
          usage: "Card border",
        },
      });

      expect(result[0]!.value).toEqual({ width: "1px", style: "solid" });
      expect(result[0]!.usage).toBe("Card border");
      expect(result[0]!.modes).toBeUndefined();
    });
  });

  describe("onColor", () => {
    test("returns light color for dark backgrounds", () => {
      const result = onColor(new Color(0, 0, 0));
      expect(result.red).toBe(255);
      expect(result.green).toBe(255);
      expect(result.blue).toBe(255);
    });

    test("returns dark color for light backgrounds", () => {
      const result = onColor(new Color(255, 255, 255));
      expect(result.red).toBe(40);
      expect(result.green).toBe(50);
      expect(result.blue).toBe(56);
    });

    test("accepts string input", () => {
      const result = onColor("#ffffff");
      expect(result.luminance()).toBeLessThan(0.5);
    });

    test("accepts custom dark/light colors", () => {
      const result = onColor("#000000", { dark: "#111", light: "#eee" });
      const hex = result.toString("hex");
      expect(hex).toBe("#eeeeee");
    });

    test("picks dark text for yellow (mid-lightness, high luminance)", () => {
      // Yellow #ffe335 has high luminance — dark text should have better contrast
      const result = onColor("#ffe335");
      expect(result.red).toBe(40);
      expect(result.green).toBe(50);
      expect(result.blue).toBe(56);
    });

    test("picks light text for teal (mid-lightness, low luminance)", () => {
      // Teal #008080 has low luminance — light text should have better contrast
      const result = onColor("#008080");
      expect(result.red).toBe(255);
      expect(result.green).toBe(255);
      expect(result.blue).toBe(255);
    });

    test("picks dark text for orange (WCAG contrast improvement over luminance threshold)", () => {
      // Orange #ff8c00 — luminance is ~0.36, below 0.5 threshold, but WCAG contrast
      // ratio with dark text is higher than with white text
      const result = onColor("#ff8c00");
      expect(result.red).toBe(40);
      expect(result.green).toBe(50);
      expect(result.blue).toBe(56);
    });
  });

  describe("onColors", () => {
    test("generates on-color tokens", () => {
      const result = onColors("color", {
        primary: new Color(0, 0, 128),
        warning: new Color(255, 255, 0),
      });

      expect(result).toHaveLength(2);
      expect(result[0]!.name).toBe("onPrimary");
      expect(result[0]!.type).toBe("color");
      expect(result[1]!.name).toBe("onWarning");
    });
  });

  describe("dp", () => {
    test("converts px to rem Dimension", () => {
      const d = dp(16);
      expect(d).toBeInstanceOf(Dimension);
      expect(d.value).toBe(1);
      expect(d.unit).toBe("rem");
      expect(d.toString()).toBe("1rem");
    });

    test("converts various px values", () => {
      expect(dp(8).toString()).toBe("0.5rem");
      expect(dp(4).toString()).toBe("0.25rem");
      expect(dp(-16).toString()).toBe("-1rem");
    });
  });

  describe("dim", () => {
    test("creates a Dimension", () => {
      const d = dim(16, "px");
      expect(d).toBeInstanceOf(Dimension);
      expect(d.value).toBe(16);
      expect(d.unit).toBe("px");
    });
  });

  describe("dur", () => {
    test("creates a Duration", () => {
      const d = dur(200, "ms");
      expect(d).toBeInstanceOf(Duration);
      expect(d.value).toBe(200);
      expect(d.unit).toBe("ms");
    });
  });

  describe("tokens", () => {
    test("merges multiple groups", () => {
      const colors = group("color", { primary: "#000" });
      const spacing = group("spacing", { sm: "0.5rem" });
      const result = tokens(colors, spacing);

      expect(result).toHaveLength(2);
      expect(result[0]!.type).toBe("color");
      expect(result[1]!.type).toBe("spacing");
    });
  });

  describe("theme", () => {
    test("creates a theme layer from tokens", () => {
      const colors = group("color", {
        background: "#ffffff",
        text: "#333",
        primary: "#0066cc",
      });

      const dark = theme("dark", colors, {
        background: "#1a1a1a",
        text: "#eee",
      });

      expect(dark.name).toBe("dark");
      expect(dark.tokenNames).toEqual(["background", "text", "primary"]);
      expect(dark.overrides).toEqual({
        background: "#1a1a1a",
        text: "#eee",
      });
    });

    test("throws on unknown token name", () => {
      const colors = group("color", {
        background: "#ffffff",
        text: "#333",
      });

      expect(() =>
        theme("dark", colors, {
          background: "#1a1a1a",
          typo: "#red",
        } as any),
      ).toThrow('unknown token "typo"');
    });

    test("derives from another theme layer", () => {
      const colors = group("color", {
        background: "#ffffff",
        text: "#333",
        primary: "#0066cc",
      });

      const dark = theme("dark", colors, {
        background: "#1a1a1a",
        text: "#eee",
      });

      const colorblindDark = theme("colorblind-dark", dark, {
        primary: "#0077bb",
      });

      expect(colorblindDark.name).toBe("colorblind-dark");
      expect(colorblindDark.tokenNames).toEqual(["background", "text", "primary"]);
      // Merges parent overrides with own
      expect(colorblindDark.overrides).toEqual({
        background: "#1a1a1a",
        text: "#eee",
        primary: "#0077bb",
      });
    });

    test("derived theme can override parent values", () => {
      const colors = group("color", {
        background: "#ffffff",
        text: "#333",
      });

      const dark = theme("dark", colors, {
        background: "#1a1a1a",
        text: "#eee",
      });

      const darkHighContrast = theme("dark-hc", dark, {
        background: "#000000",
        text: "#ffffff",
      });

      expect(darkHighContrast.overrides).toEqual({
        background: "#000000",
        text: "#ffffff",
      });
    });

    test("derived theme throws on unknown token", () => {
      const colors = group("color", { primary: "#0066cc" });
      const dark = theme("dark", colors, { primary: "#3399ff" });

      expect(() =>
        theme("bad", dark, {
          nonexistent: "#red",
        } as any),
      ).toThrow('unknown token "nonexistent"');
    });

    test("works with merged tokens() output across groups", () => {
      const colors = group("color", {
        background: "#ffffff",
        textPrimary: "#333",
      });
      const spacing = group("spacing", {
        sm: "0.5rem",
        md: "1rem",
      });

      const allTokens = tokens(colors, spacing);

      const dark = theme("dark", allTokens, {
        background: "#1a1a1a",
        textPrimary: "#eee",
      });

      expect(dark.name).toBe("dark");
      expect(dark.tokenNames).toEqual(["background", "textPrimary", "sm", "md"]);
      expect(dark.overrides).toEqual({
        background: "#1a1a1a",
        textPrimary: "#eee",
      });
    });

    test("throws on unknown token when using merged tokens() output", () => {
      const colors = group("color", { primary: "#0066cc" });
      const spacing = group("spacing", { sm: "0.5rem" });
      const allTokens = tokens(colors, spacing);

      expect(() =>
        theme("dark", allTokens, {
          nonexistent: "#red",
        } as any),
      ).toThrow('unknown token "nonexistent"');
    });
  });

  describe("ref", () => {
    test("creates a reference token input", () => {
      const result = ref("primary");
      expect(result.value).toBe("{primary}");
    });

    test("creates a reference with usage", () => {
      const result = ref("primary", "Link color");
      expect(result.value).toBe("{primary}");
      expect(result.usage).toBe("Link color");
    });
  });
});

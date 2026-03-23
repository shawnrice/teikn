import { describe, expect, test } from "bun:test";

import { group, theme, tokens } from "./builders";
import { Json } from "./Generators";
import { PrefixTypePlugin, StripTypePrefixPlugin } from "./Plugins";
import { Teikn } from "./Teikn";

const parseOutput = (writer: Teikn, tokenList: any[]) => {
  const output = writer.generateToStrings(tokenList);
  return JSON.parse(output.get("tokens.json")!);
};

describe("Teikn", () => {
  describe("theme layers", () => {
    test("applies theme overrides as token modes", () => {
      const colors = group("color", {
        background: "#ffffff",
        text: "#333",
        primary: "#0066cc",
      });

      const dark = theme("dark", colors, {
        background: "#1a1a1a",
        text: "#eee",
      });

      const writer = new Teikn({
        generators: [new Json()],
        themes: [dark],
      });

      const json = parseOutput(writer, colors);

      expect(json.colorBackground.modes).toEqual({ dark: "#1a1a1a" });
      expect(json.colorText.modes).toEqual({ dark: "#eee" });
      expect(json.colorPrimary.modes).toBeUndefined();
    });

    test("applies multiple theme layers across groups", () => {
      const colors = group("color", {
        background: "#ffffff",
        primary: "#0066cc",
      });

      const spacing = group("spacing", {
        gap: "8px",
        padding: "16px",
      });

      const dark = theme("dark", colors, { background: "#1a1a1a" });
      const dense = theme("dense", spacing, { gap: "4px", padding: "8px" });

      const writer = new Teikn({
        generators: [new Json()],
        themes: [dark, dense],
      });

      const json = parseOutput(writer, tokens(colors, spacing));

      expect(json.colorBackground.modes).toEqual({ dark: "#1a1a1a" });
      expect(json.colorPrimary.modes).toBeUndefined();
      expect(json.spacingGap.modes).toEqual({ dense: "4px" });
      expect(json.spacingPadding.modes).toEqual({ dense: "8px" });
    });

    test("preserves existing modes on tokens", () => {
      const colorTokens = [
        { name: "bg", type: "color", value: "#fff", modes: { "high-contrast": "#000" } },
      ];

      const dark = theme("dark", colorTokens, { bg: "#1a1a1a" });

      const writer = new Teikn({
        generators: [new Json()],
        themes: [dark],
      });

      const json = parseOutput(writer, colorTokens);
      expect(json.colorBg.modes).toEqual({
        "high-contrast": "#000",
        dark: "#1a1a1a",
      });
    });

    test("does not mutate input tokens", () => {
      const colors = group("color", { bg: "#fff" });
      const dark = theme("dark", colors, { bg: "#000" });

      const writer = new Teikn({
        generators: [new Json()],
        themes: [dark],
      });

      writer.generateToStrings(colors);
      expect(colors[0]!.modes).toBeUndefined();
      expect(colors[0]!.name).toBe("bg");
    });

    test("returns tokens unchanged when no themes", () => {
      const colors = group("color", { bg: "#fff" });
      const writer = new Teikn({ generators: [new Json()] });

      const json = parseOutput(writer, colors);
      expect(json.colorBg.modes).toBeUndefined();
    });

    test("derived themes merge parent and own overrides", () => {
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

      const writer = new Teikn({
        generators: [new Json()],
        themes: [dark, colorblindDark],
      });

      const json = parseOutput(writer, colors);

      // background: dark + colorblind-dark (inherited)
      expect(json.colorBackground.modes).toEqual({
        dark: "#1a1a1a",
        "colorblind-dark": "#1a1a1a",
      });
      // text: dark + colorblind-dark (inherited)
      expect(json.colorText.modes).toEqual({
        dark: "#eee",
        "colorblind-dark": "#eee",
      });
      // primary: only colorblind-dark
      expect(json.colorPrimary.modes).toEqual({
        "colorblind-dark": "#0077bb",
      });
    });
  });

  describe("type prefixing", () => {
    test("prefixes token names by default", () => {
      const colors = group("color", { primary: "#0066cc" });
      const spacing = group("spacing", { sm: "4px" });

      const writer = new Teikn({ generators: [new Json()] });
      const json = parseOutput(writer, tokens(colors, spacing));

      expect(json.colorPrimary).toBeDefined();
      expect(json.spacingSm).toBeDefined();
      expect(json.primary).toBeUndefined();
      expect(json.sm).toBeUndefined();
    });

    test("overlapping keys across groups produce distinct tokens", () => {
      const spacing = group("spacing", { sm: "8px", md: "16px", lg: "24px" });
      const shadows = group("shadow", {
        sm: "0 1px 2px rgba(0,0,0,.1)",
        md: "0 2px 8px rgba(0,0,0,.12)",
        lg: "0 4px 16px rgba(0,0,0,.15)",
      });
      const breakpoints = group("breakpoint", { sm: "640px", md: "768px", lg: "1024px" });

      const writer = new Teikn({ generators: [new Json()] });
      const json = parseOutput(writer, tokens(spacing, shadows, breakpoints));

      const keys = Object.keys(json);
      expect(keys).toHaveLength(9);

      expect(json.spacingSm.value).toBe("8px");
      expect(json.shadowSm.value).toBe("0 1px 2px rgba(0,0,0,.1)");
      expect(json.breakpointSm.value).toBe("640px");

      expect(json.spacingLg.value).toBe("24px");
      expect(json.shadowLg.value).toBe("0 4px 16px rgba(0,0,0,.15)");
      expect(json.breakpointLg.value).toBe("1024px");
    });

    test("StripTypePrefixPlugin removes the type prefix", () => {
      const colors = group("color", { primary: "#0066cc" });

      const writer = new Teikn({
        generators: [new Json()],
        plugins: [new StripTypePrefixPlugin()],
      });
      const json = parseOutput(writer, colors);

      expect(json.primary).toBeDefined();
      expect(json.colorPrimary).toBeUndefined();
    });

    test("filters out PrefixTypePlugin to prevent double-prefixing", () => {
      const colors = group("color", { primary: "#0066cc" });

      const writer = new Teikn({
        generators: [new Json()],
        plugins: [new PrefixTypePlugin()],
      });
      const json = parseOutput(writer, colors);

      expect(json.colorPrimary).toBeDefined();
      expect(json.colorColorPrimary).toBeUndefined();
    });

    test("last-write-wins when the same prefixed name appears twice", () => {
      const first = group("color", { primary: "#0066cc" });
      const second = group("color", { primary: "#ff0000" });

      const writer = new Teikn({ generators: [new Json()] });
      const json = parseOutput(writer, tokens(first, second));

      expect(json.colorPrimary.value).toBe("#ff0000");
    });

    test("does not mutate input token names", () => {
      const colors = group("color", { bg: "#fff" });
      const writer = new Teikn({ generators: [new Json()] });

      writer.generateToStrings(colors);
      expect(colors[0]!.name).toBe("bg");
    });
  });
});

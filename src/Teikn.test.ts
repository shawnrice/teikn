import { describe, expect, test } from "bun:test";

import { group, theme, tokens } from "./builders";
import { Json } from "./Generators";
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

      expect(json.background.modes).toEqual({ dark: "#1a1a1a" });
      expect(json.text.modes).toEqual({ dark: "#eee" });
      expect(json.primary.modes).toBeUndefined();
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

      expect(json.background.modes).toEqual({ dark: "#1a1a1a" });
      expect(json.primary.modes).toBeUndefined();
      expect(json.gap.modes).toEqual({ dense: "4px" });
      expect(json.padding.modes).toEqual({ dense: "8px" });
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
      expect(json.bg.modes).toEqual({
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
    });

    test("returns tokens unchanged when no themes", () => {
      const colors = group("color", { bg: "#fff" });
      const writer = new Teikn({ generators: [new Json()] });

      const json = parseOutput(writer, colors);
      expect(json.bg.modes).toBeUndefined();
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
      expect(json.background.modes).toEqual({
        dark: "#1a1a1a",
        "colorblind-dark": "#1a1a1a",
      });
      // text: dark + colorblind-dark (inherited)
      expect(json.text.modes).toEqual({
        dark: "#eee",
        "colorblind-dark": "#eee",
      });
      // primary: only colorblind-dark
      expect(json.primary.modes).toEqual({
        "colorblind-dark": "#0077bb",
      });
    });
  });
});

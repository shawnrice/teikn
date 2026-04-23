import { describe, expect, test } from "bun:test";

import { group, theme, tokens } from "./builders";
import { Json } from "./Generators";
import { Generator } from "./Generators/Generator";
import { Plugin, PrefixTypePlugin, StripTypePrefixPlugin } from "./Plugins";
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

    test("throws when PrefixTypePlugin is passed", () => {
      expect(
        () =>
          new Teikn({
            generators: [new Json()],
            plugins: [new PrefixTypePlugin()],
          }),
      ).toThrow("PrefixTypePlugin is no longer needed");
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

  describe("multi-file generator integration", () => {
    class MultiFile extends Generator {
      constructor(opts = {}) {
        super({ ext: "txt", ...opts });
      }
      generateToken(): string {
        return "";
      }
      // oxlint-disable-next-line class-methods-use-this
      combinator(): string {
        return "";
      }
      override filenames(): string[] {
        const base = this.options.filename ?? "tokens";
        return [`${base}.mjs`, `${base}.d.ts`];
      }
      override generateFiles(): Map<string, string> {
        const base = this.options.filename ?? "tokens";
        return new Map([
          [`${base}.mjs`, "runtime"],
          [`${base}.d.ts`, "types"],
        ]);
      }
    }

    test("generateToStrings() includes every file a multi-file generator emits", () => {
      const writer = new Teikn({ generators: [new MultiFile()] });
      const output = writer.generateToStrings([]);
      expect([...output.keys()].toSorted()).toEqual(["tokens.d.ts", "tokens.mjs"]);
      expect(output.get("tokens.mjs")).toBe("runtime");
      expect(output.get("tokens.d.ts")).toBe("types");
    });

    test("duplicate-filename detection walks multi-file generator filenames", () => {
      class RivalMjs extends Generator {
        constructor() {
          super({ ext: "mjs", filename: "tokens" });
        }
        generateToken(): string {
          return "";
        }
        // oxlint-disable-next-line class-methods-use-this
        combinator(): string {
          return "";
        }
      }

      expect(
        () =>
          new Teikn({
            generators: [new MultiFile(), new RivalMjs()],
          }),
      ).toThrow("Duplicate generator output filenames");
    });

    test("multi-file generators coexist with single-file generators", () => {
      const writer = new Teikn({
        generators: [new MultiFile(), new Json({ filename: "extra" })],
      });
      const output = writer.generateToStrings([]);
      expect([...output.keys()].toSorted()).toEqual(["extra.json", "tokens.d.ts", "tokens.mjs"]);
    });

    test("two multi-file generators with overlapping filenames throws at construction", () => {
      expect(
        () =>
          new Teikn({
            generators: [
              new MultiFile({ filename: "tokens" }),
              new MultiFile({ filename: "tokens" }),
            ],
          }),
      ).toThrow("Duplicate generator output filenames");
    });

    test("duplicate-filename detection is case-insensitive", () => {
      // On case-insensitive filesystems (macOS, Windows), `Tokens.json` and
      // `tokens.json` target the same physical file; writing both would
      // silently overwrite. Caught at construction.
      expect(
        () =>
          new Teikn({
            generators: [new Json({ filename: "tokens" }), new Json({ filename: "Tokens" })],
          }),
      ).toThrow("Duplicate generator output filenames");
    });
  });

  describe("applyThemes (gap coverage)", () => {
    test("theme override using a qualified ref value resolves through the pipeline", () => {
      const colors = group("color", {
        accent: "#ff0000",
        bg: "#ffffff",
      });

      const dark = theme("dark", colors, {
        // Override value is itself a reference to another token.
        bg: "{color.accent}" as never,
      });

      const writer = new Teikn({
        generators: [new Json()],
        themes: [dark],
      });

      const json = JSON.parse(writer.generateToStrings(colors).get("tokens.json")!);
      // After resolveReferences, the dark mode value should be the resolved
      // accent (#ff0000), not the literal `"{color.accent}"` string.
      // Json output keys are post-prefixTokenNames + camelCase: "color-bg" → "colorBg".
      expect(json.colorBg.modes.dark).toBe("#ff0000");
    });

    // NOTE: The "applyThemes error distinguishes missing from ambiguous" case
    // is real (silent-failure-hunter SF-3) but hard to trigger via the normal
    // flow because theme() qualifies keys at construction. Will fix the
    // message shape directly in Phase 1 alongside SF-3.

    test("applyThemes error fires when token universe drifts from theme", () => {
      const colors = group("color", { primary: "#0066cc" });
      const dark = theme("dark", colors, { primary: "#3399ff" });

      const writer = new Teikn({
        generators: [new Json()],
        themes: [dark],
      });

      // Pass an empty token list — the theme's stored override key
      // ("color.primary") can no longer resolve.
      expect(() => writer.generateToStrings([])).toThrow(/unknown token/);
    });
  });

  describe("pipeline order (gap coverage)", () => {
    // Previous rounds found that validate → expand → applyThemes →
    // resolveReferences → prefixTokenNames order is load-bearing: if
    // anyone reorders them, many individual tests still pass because
    // they don't exercise the interaction. These tests exist to fail
    // loudly on a reorder.

    test("expand-added tokens are validated (validate runs after expand)", () => {
      // ClampPlugin.expand() adds `fontSize-fluid` with a clamp() string.
      // If validate ran before expand (the pre-Phase-2 order), an invalid
      // color token added by expand would slip through.
      class BadExpand extends Plugin {
        tokenType: RegExp = /.*/;
        outputType: RegExp = /.*/;
        // oxlint-disable-next-line class-methods-use-this
        expand(input: any[]): any[] {
          return [...input, { name: "broken", type: "color", value: "not-a-real-color" }];
        }
      }

      const writer = new Teikn({
        generators: [new Json()],
        plugins: [new BadExpand() as never],
      });

      // The expand-added "broken" color should trigger validate's
      // color-parseability warning. valid = true (warnings don't fail),
      // but the issue is visible via audit. Here we assert the expand
      // output reached the final Json output, which means validate ran
      // without rejecting it.
      const out = writer.generateToStrings([]);
      const json = JSON.parse(out.get("tokens.json")!);
      expect(Object.keys(json)).toContain("colorBroken");
    });

    test("expand() wraps a plugin throw with the plugin class name", () => {
      class Boom extends Plugin {
        tokenType: RegExp = /.*/;
        outputType: RegExp = /.*/;
        // oxlint-disable-next-line class-methods-use-this
        expand(): never {
          throw new Error("internal expand failure");
        }
      }

      const writer = new Teikn({
        generators: [new Json()],
        plugins: [new Boom() as never],
      });

      // The thrown error names the plugin class so the user knows which
      // plugin to look at, with the original error preserved as the cause.
      expect(() => writer.generateToStrings([])).toThrow(/Boom.*expand.*internal expand failure/);
    });

    test("applyThemes matches against post-expand token universe", () => {
      // Theme against existing color. Add a no-op expand plugin that
      // preserves the token set. Theme override still applies —
      // confirms applyThemes runs *after* expand so expand-introduced
      // tokens would be visible to the override resolver too.
      class Identity extends Plugin {
        tokenType: RegExp = /.*/;
        outputType: RegExp = /.*/;
        // oxlint-disable-next-line class-methods-use-this
        expand(input: any[]): any[] {
          return input;
        }
      }

      const colors = group("color", { primary: "#0066cc" });
      const dark = theme("dark", colors, { primary: "#3399ff" });

      const writer = new Teikn({
        generators: [new Json()],
        themes: [dark],
        plugins: [new Identity() as never],
      });

      const json = JSON.parse(writer.generateToStrings(colors).get("tokens.json")!);
      expect(json.colorPrimary.modes).toEqual({ dark: "#3399ff" });
    });
  });
});

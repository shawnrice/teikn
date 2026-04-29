import { describe, expect, test } from "bun:test";

import type { Token } from "../Token.js";
import { Color } from "../TokenTypes/Color/index.js";
import { CssVars } from "../Generators/CssVars.js";
import { Json } from "../Generators/Json.js";
import { Scss } from "../Generators/Scss.js";
import { ColorTransformPlugin } from "./ColorTransformPlugin.js";
import { RemUnitPlugin } from "./RemUnitPlugin.js";
import { AlphaMultiplyPlugin } from "./AlphaMultiplyPlugin.js";
import { NameConventionPlugin } from "./NameConventionPlugin.js";
import { ScssQuoteValuePlugin } from "./ScssQuoteValuePlugin.js";
import { DeprecationPlugin } from "./DeprecationPlugin.js";
import { testOpts } from "../fixtures/testOpts.js";

const opts = testOpts;

// ─── ColorTransformPlugin with modes ─────────────────────────

describe("ColorTransformPlugin with modes", () => {
  const plugin = new ColorTransformPlugin({ type: "rgba" });

  test("transforms color values in modes", () => {
    const tokens: Token[] = [
      { name: "bg", type: "color", value: "steelblue", modes: { dark: "crimson" } },
    ];
    const output = new CssVars(opts).generate(tokens, [plugin]);
    expect(output).not.toContain("steelblue");
    expect(output).not.toContain("crimson");
    expect(output).toContain("rgba(");
  });

  test("transforms Color instances in modes", () => {
    const tokens: Token[] = [
      {
        name: "bg",
        type: "color",
        value: new Color("steelblue"),
        modes: { dark: new Color("crimson") },
      },
    ];
    const output = new Json().generate(tokens, [plugin]);
    const json = JSON.parse(output);
    expect(json.bg.value).toContain("rgba(");
    expect(json.bg.modes.dark).toContain("rgba(");
  });

  test("handles multiple modes", () => {
    const tokens: Token[] = [
      {
        name: "surface",
        type: "color",
        value: "#ffffff",
        modes: { dark: "#1a1a1a", "high-contrast": "#000000" },
      },
    ];
    const output = new CssVars(opts).generate(tokens, [plugin]);
    expect(output).not.toContain("#1a1a1a");
    expect(output).not.toContain("#000000");
  });
});

// ─── RemUnitPlugin with modes ────────────────────────────────

describe("RemUnitPlugin with modes", () => {
  const plugin = new RemUnitPlugin({ base: 16 });

  test("converts px to rem in mode values", () => {
    const tokens: Token[] = [
      { name: "gap", type: "spacing", value: "16px", modes: { dense: "8px" } },
    ];
    const output = new CssVars(opts).generate(tokens, [plugin]);
    expect(output).toContain("1rem");
    expect(output).toContain("0.5rem");
    expect(output).not.toContain("16px");
    expect(output).not.toContain("8px");
  });

  test("converts composite values with px in modes", () => {
    const tokens: Token[] = [
      {
        name: "heading",
        type: "typography",
        value: {
          fontFamily: "Arial",
          fontSize: "32px",
          fontWeight: 700,
          lineHeight: 1.2,
          letterSpacing: "0",
        },
        modes: {
          mobile: {
            fontFamily: "Arial",
            fontSize: "24px",
            fontWeight: 700,
            lineHeight: 1.2,
            letterSpacing: "0",
          },
        },
      },
    ];
    const output = new Json().generate(tokens, [plugin]);
    const json = JSON.parse(output);
    expect(json.heading.value.fontSize).toBe("2rem");
    expect(json.heading.modes.mobile.fontSize).toBe("1.5rem");
  });

  test("leaves non-px values unchanged in modes", () => {
    const tokens: Token[] = [
      { name: "gap", type: "spacing", value: "1em", modes: { dense: "0.5em" } },
    ];
    const output = new CssVars(opts).generate(tokens, [plugin]);
    expect(output).toContain("1em");
    expect(output).toContain("0.5em");
  });
});

// ─── AlphaMultiplyPlugin with modes ──────────────────────────

describe("AlphaMultiplyPlugin with modes", () => {
  const plugin = new AlphaMultiplyPlugin({ background: "#ffffff" });

  test("flattens semi-transparent colors in modes", () => {
    const tokens: Token[] = [
      {
        name: "overlay",
        type: "color",
        value: "rgba(0, 0, 0, 0.5)",
        modes: { dark: "rgba(255, 255, 255, 0.5)" },
      },
    ];
    const output = new Json().generate(tokens, [plugin]);
    const json = JSON.parse(output);
    // Semi-transparent black on white → grey
    expect(json.overlay.value).not.toContain("0.5");
    // Semi-transparent white on white → white
    expect(json.overlay.modes.dark).not.toContain("0.5");
  });

  test("leaves fully opaque colors unchanged in modes", () => {
    const tokens: Token[] = [
      {
        name: "bg",
        type: "color",
        value: "#ff0000",
        modes: { dark: "#0000ff" },
      },
    ];
    const output = new Json().generate(tokens, [plugin]);
    const json = JSON.parse(output);
    // Opaque colors pass through unchanged
    expect(json.bg.modes.dark).toBe("#0000ff");
  });
});

// ─── ScssQuoteValuePlugin with modes ─────────────────────────

describe("ScssQuoteValuePlugin with modes", () => {
  const plugin = new ScssQuoteValuePlugin();

  test("quotes font-family values in modes", () => {
    const tokens: Token[] = [
      {
        name: "body",
        type: "font-family",
        value: '"Roboto", sans-serif',
        modes: { brand: '"Montserrat", sans-serif' },
      },
    ];
    const output = new Scss(opts).generate(tokens, [plugin]);
    // Both base and mode should be wrapped with unquote
    expect(output).toContain("unquote");
    // The mode value should also be quoted
    expect(output).not.toContain('brand: "Montserrat"');
  });
});

// ─── DeprecationPlugin with modes ────────────────────────────

describe("DeprecationPlugin with modes", () => {
  const plugin = new DeprecationPlugin({
    tokens: { oldColor: "newColor" },
  });

  test("marks deprecated tokens that have modes", () => {
    const tokens: Token[] = [
      {
        name: "oldColor",
        type: "color",
        value: "#000",
        modes: { dark: "#fff" },
      },
    ];
    const output = new Json().generate(tokens, [plugin]);
    const json = JSON.parse(output);
    expect(json.oldColor.deprecated).toBe(true);
    // Modes should survive
    expect(json.oldColor.modes.dark).toBe("#fff");
  });
});

// ─── NameConventionPlugin with modes ─────────────────────────

describe("NameConventionPlugin with modes", () => {
  test("transforms token name but preserves mode values", () => {
    const plugin = new NameConventionPlugin({ convention: "camelCase" });
    const tokens: Token[] = [
      {
        name: "my-color",
        type: "color",
        value: "#000",
        modes: { dark: "#fff" },
      },
    ];
    const output = new Json().generate(tokens, [plugin]);
    const json = JSON.parse(output);
    expect(json.myColor).toBeDefined();
    expect(json.myColor.modes.dark).toBe("#fff");
  });

  test("transforms mode keys to match convention", () => {
    const plugin = new NameConventionPlugin({ convention: "camelCase" });
    const tokens: Token[] = [
      {
        name: "surface",
        type: "color",
        value: "#fff",
        modes: { "high-contrast": "#000", "color-blind": "#111" },
      },
    ];
    const output = new Json().generate(tokens, [plugin]);
    const json = JSON.parse(output);
    expect(json.surface.modes.highContrast).toBe("#000");
    expect(json.surface.modes.colorBlind).toBe("#111");
    expect(json.surface.modes["high-contrast"]).toBeUndefined();
  });

  test("transforms mode keys to kebab-case", () => {
    const plugin = new NameConventionPlugin({ convention: "kebab-case" });
    const tokens: Token[] = [
      {
        name: "surface",
        type: "color",
        value: "#fff",
        modes: { darkMode: "#000" },
      },
    ];
    const output = new Json().generate(tokens, [plugin]);
    const json = JSON.parse(output);
    expect(json.surface.modes["dark-mode"]).toBe("#000");
    expect(json.surface.modes.darkMode).toBeUndefined();
  });
});

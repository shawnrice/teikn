import { describe, expect, test } from "bun:test";

import type { Token } from "../Token.js";
import { Color } from "../TokenTypes/Color/index.js";
import { Dimension } from "../TokenTypes/Dimension.js";
import { Duration } from "../TokenTypes/Duration.js";
import { ColorTransformPlugin } from "../Plugins/ColorTransformPlugin.js";
import { NameConventionPlugin } from "../Plugins/NameConventionPlugin.js";
import { ScssQuoteValuePlugin } from "../Plugins/ScssQuoteValuePlugin.js";
import { CssVars } from "./CssVars.js";
import { Scss } from "./Scss.js";
import { Json } from "./Json.js";
import { testOpts } from "../fixtures/testOpts.js";

// ─── Helpers ─────────────────────────────────────────────────

const opts = testOpts;

// ─── ScssQuoteValuePlugin with first-class values ───────────

describe("ScssQuoteValuePlugin preserves first-class values", () => {
  const quotePlugin = new ScssQuoteValuePlugin();

  test("Dimension values are not quoted in SCSS", () => {
    const tokens: Token[] = [{ name: "gap", type: "spacing", value: new Dimension(1, "rem") }];
    const output = new Scss(opts).generate(tokens, [quotePlugin]);
    expect(output).toContain("1rem");
    expect(output).not.toContain('"1rem"');
    expect(output).not.toContain("unquote");
  });

  test("Duration values are not quoted in SCSS", () => {
    const tokens: Token[] = [
      { name: "fade-speed", type: "duration", value: new Duration(200, "ms") },
    ];
    const output = new Scss(opts).generate(tokens, [quotePlugin]);
    expect(output).toContain("200ms");
    expect(output).not.toContain('"200ms"');
    expect(output).not.toContain("unquote");
  });

  test("only font/font-family string values get quoted, not Dimension or Duration", () => {
    const tokens: Token[] = [
      { name: "font-body", type: "font-family", value: "Inter, sans-serif" },
      { name: "gap", type: "spacing", value: new Dimension(1, "rem") },
      { name: "fade-speed", type: "duration", value: new Duration(200, "ms") },
      { name: "surface", type: "color", value: new Color("#ff0000") },
    ];
    const output = new Scss(opts).generate(tokens, [quotePlugin]);

    // Font value should be wrapped with unquote
    expect(output).toContain("unquote");

    // Dimension should appear as plain value
    expect(output).toContain("1rem");

    // Duration should appear as plain value
    expect(output).toContain("200ms");
  });
});

// ─── ColorTransformPlugin with mixed value types ────────────

describe("ColorTransformPlugin leaves non-color values untouched", () => {
  const colorPlugin = new ColorTransformPlugin({ type: "rgba" });

  test("Dimension values survive ColorTransformPlugin", () => {
    const tokens: Token[] = [
      { name: "primary", type: "color", value: "steelblue" },
      { name: "gap", type: "spacing", value: new Dimension(1, "rem") },
    ];
    const output = new CssVars(opts).generate(tokens, [colorPlugin]);

    // Color should be transformed to rgba
    expect(output).toContain("rgba(");
    // Dimension should remain as-is
    expect(output).toContain("1rem");
  });

  test("Duration values survive ColorTransformPlugin in Scss", () => {
    const tokens: Token[] = [
      { name: "primary", type: "color", value: "steelblue" },
      { name: "fade-speed", type: "duration", value: new Duration(300, "ms") },
    ];
    const output = new Scss(opts).generate(tokens, [colorPlugin]);

    expect(output).toContain("rgba(");
    expect(output).toContain("300ms");
  });

  test("Dimension values survive ColorTransformPlugin in Json", () => {
    const tokens: Token[] = [
      { name: "primary", type: "color", value: "steelblue" },
      { name: "gap", type: "spacing", value: new Dimension(2, "rem") },
    ];
    const output = new Json().generate(tokens, [colorPlugin]);
    const json = JSON.parse(output);

    expect(json.primary.value).toContain("rgba(");
    expect(json.gap.value).toBe("2rem");
  });
});

// ─── NameConventionPlugin with Dimension in modes ───────────

describe("NameConventionPlugin with Dimension tokens in modes", () => {
  const namePlugin = new NameConventionPlugin({ convention: "kebab-case" });

  test("Dimension base and mode values retain serialization through CssVars", () => {
    const tokens: Token[] = [
      {
        name: "contentGap",
        type: "spacing",
        value: new Dimension(1, "rem"),
        modes: { compact: new Dimension(0.5, "rem") },
      },
    ];
    const output = new CssVars(opts).generate(tokens, [namePlugin]);

    // Name should be kebab-cased
    expect(output).toContain("--content-gap:");
    // Base value
    expect(output).toContain("1rem");
    // Mode value
    expect(output).toContain("0.5rem");
  });

  test("Dimension base and mode values retain serialization through Scss", () => {
    const tokens: Token[] = [
      {
        name: "contentGap",
        type: "spacing",
        value: new Dimension(1, "rem"),
        modes: { compact: new Dimension(0.5, "rem") },
      },
    ];
    const output = new Scss(opts).generate(tokens, [namePlugin]);

    expect(output).toContain("content-gap:");
    expect(output).toContain("1rem");
    expect(output).toContain("0.5rem");
  });
});

// ─── Multiple plugins with Dimension/Duration ───────────────

describe("multiple plugins with first-class values", () => {
  const namePlugin = new NameConventionPlugin({ convention: "camelCase" });
  const quotePlugin = new ScssQuoteValuePlugin();

  test("NameConventionPlugin and ScssQuoteValuePlugin together with Dimension and Duration", () => {
    const tokens: Token[] = [
      { name: "content-gap", type: "spacing", value: new Dimension(1.5, "rem") },
      { name: "fade-speed", type: "duration", value: new Duration(200, "ms") },
      { name: "body-font", type: "font-family", value: "Inter, sans-serif" },
    ];
    // CssVars respects NameConventionPlugin output directly
    const cssOutput = new CssVars(opts).generate(tokens, [namePlugin, quotePlugin]);

    // Names should be camelCased (CssVars uses kebab by default, but plugin overrides token.name)
    expect(cssOutput).toContain("--content-gap:");
    expect(cssOutput).toContain("--fade-speed:");
    expect(cssOutput).toContain("--body-font:");

    // Dimension and Duration should be plain values
    expect(cssOutput).toContain("1.5rem");
    expect(cssOutput).toContain("200ms");

    // ScssQuoteValuePlugin only targets scss output, so font value is plain in CSS
    // Verify via Scss generator instead
    const scssOutput = new Scss(opts).generate(tokens, [namePlugin, quotePlugin]);

    // Dimension and Duration remain plain in SCSS too
    expect(scssOutput).toContain("1.5rem");
    expect(scssOutput).toContain("200ms");

    // Font value should be quoted in SCSS
    expect(scssOutput).toContain("unquote");
  });
});

// ─── Plugin on mode values containing Duration ──────────────

describe("plugin on mode values containing Duration", () => {
  test("Duration mode value appears correctly in CssVars", () => {
    const tokens: Token[] = [
      {
        name: "animation-speed",
        type: "duration",
        value: new Duration(300, "ms"),
        modes: { reduced: new Duration(0, "ms") },
      },
    ];
    const namePlugin = new NameConventionPlugin({ convention: "kebab-case" });
    const output = new CssVars(opts).generate(tokens, [namePlugin]);

    expect(output).toContain("--animation-speed:");
    expect(output).toContain("300ms");
    expect(output).toContain("0ms");
    expect(output).not.toContain("[object Object]");
  });

  test("Duration mode value appears correctly in Scss", () => {
    const tokens: Token[] = [
      {
        name: "animation-speed",
        type: "duration",
        value: new Duration(300, "ms"),
        modes: { reduced: new Duration(0, "ms") },
      },
    ];
    const output = new Scss(opts).generate(tokens, [new ScssQuoteValuePlugin()]);

    expect(output).toContain("300ms");
    expect(output).toContain("0ms");
    expect(output).not.toContain("[object Object]");
  });

  test("Duration mode value appears correctly in Json", () => {
    const tokens: Token[] = [
      {
        name: "animation-speed",
        type: "duration",
        value: new Duration(300, "ms"),
        modes: { reduced: new Duration(0, "ms") },
      },
    ];
    const output = new Json().generate(tokens);
    const json = JSON.parse(output);

    expect(json.animationSpeed.value).toBe("300ms");
    expect(json.animationSpeed.modes.reduced).toBe("0ms");
  });
});

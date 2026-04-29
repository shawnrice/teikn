import { describe, expect, test } from "bun:test";

import { group, scale, composite, tokens, theme, dp, dur } from "./builders.js";
import { Color } from "./TokenTypes/Color/index.js";
import { Teikn } from "./Teikn.js";
import { testOpts } from "./fixtures/testOpts.js";

// ─── Shared token sets ─────────────────────────────────────

const colors = group("color", {
  primary: new Color("#4a90d9"),
  secondary: new Color("#cc6600"),
  border: new Color("#cccccc"),
});

const spacing = scale("spacing", {
  sm: dp(8),
  md: dp(16),
  lg: dp(24),
});

const typography = composite("typography", {
  heading: {
    fontFamily: '"Inter", sans-serif',
    fontSize: dp(24),
    fontWeight: 700,
    lineHeight: 1.3,
  },
  body: {
    fontFamily: '"Inter", sans-serif',
    fontSize: dp(16),
    fontWeight: 400,
    lineHeight: 1.5,
  },
});

const borders = composite("border", {
  thin: {
    width: dp(1),
    style: "solid",
    color: new Color("#cccccc"),
  },
});

const durations = group("duration", {
  fast: dur(200, "ms"),
  slow: dur(500, "ms"),
});

const allTokens = tokens(colors, spacing, typography, borders, durations);

// ─── Composite with mode overrides containing first-class values ───

describe("composite with first-class values through theming", () => {
  const dark = theme("dark", colors, {
    primary: new Color("#6db3f8"),
    border: new Color("#444444"),
  });

  const writer = new Teikn({
    generators: [new Teikn.generators.CssVars(testOpts), new Teikn.generators.Json()],
    themes: [dark],
    plugins: [new Teikn.plugins.NameConventionPlugin({ convention: "kebab-case" })],
  });

  const output = writer.generateToStrings(allTokens);
  const css = output.get("tokens.css")!;
  const json = JSON.parse(output.get("tokens.json")!);

  test("typography composite Dimension values survive theming", () => {
    // The typography tokens should still have their Dimension-based fontSize
    // even though the parent color group got themed
    expect(json.typographyHeading.value.fontSize).toBe("1.5rem");
    expect(json.typographyBody.value.fontSize).toBe("1rem");
    expect(css).toContain("1.5rem");
    expect(css).toContain("1rem");
  });

  test("border composite renders correctly in CSS", () => {
    // border shorthand: width style color
    const borderMatch = css.match(/--border-thin:\s*(.+?);/);
    expect(borderMatch).not.toBeNull();
    const [, borderValue] = borderMatch!;
    // Should contain the dimension, style keyword, and color
    expect(borderValue).toContain("0.0625rem");
    expect(borderValue).toContain("solid");
    // The color should be serialized, not [object Object]
    expect(borderValue).not.toContain("[object Object]");
  });
});

// ─── Theme with first-class value overrides ─────────────────

describe("theme with Color object overrides", () => {
  const dark = theme("dark", colors, {
    primary: new Color("#6db3f8"),
  });

  test("Color object serializes to color string in all generators", () => {
    const generatorConfigs = [
      { Gen: Teikn.generators.CssVars, file: "tokens.css" },
      { Gen: Teikn.generators.Json, file: "tokens.json" },
      { Gen: Teikn.generators.JavaScript, file: "tokens.mjs" },
    ] as const;

    for (const { Gen, file } of generatorConfigs) {
      const writer = new Teikn({
        generators: [new Gen(testOpts)],
        themes: [dark],
        plugins: [new Teikn.plugins.NameConventionPlugin({ convention: "kebab-case" })],
      });

      const content = writer.generateToStrings(allTokens).get(file)!;
      // Color may serialize as rgb() or hex depending on generator
      expect(content.includes("6db3f8") || content.includes("rgb(109, 179, 248)")).toBe(true);
      expect(content).not.toContain("[object Object]");
    }
  });

  test("theme overrides do not mutate original Color tokens", () => {
    const originalPrimary = colors.find((t) => t.name === "primary")!;
    const originalValue = originalPrimary.value;

    // Run through the pipeline
    const writer = new Teikn({
      generators: [new Teikn.generators.Json()],
      themes: [dark],
    });
    writer.generateToStrings(allTokens);

    // Original token should be unchanged
    expect(originalPrimary.value).toBe(originalValue);
    expect(originalPrimary.value).toBeInstanceOf(Color);
    // No modes should have leaked onto the source token
    expect(originalPrimary.modes).toBeUndefined();
  });
});

// ─── Round-trip JSON ────────────────────────────────────────

describe("round-trip JSON integrity", () => {
  const writer = new Teikn({
    generators: [new Teikn.generators.Json()],
    plugins: [new Teikn.plugins.NameConventionPlugin({ convention: "kebab-case" })],
  });

  const json = JSON.parse(writer.generateToStrings(allTokens).get("tokens.json")!);

  test("every token has a non-empty value field", () => {
    for (const [_key, entry] of Object.entries(json)) {
      const token = entry as { value: unknown };
      expect(token.value).toBeDefined();
      // Non-empty: strings must have length, objects must have keys
      if (typeof token.value === "string") {
        expect(token.value.length).toBeGreaterThan(0);
      } else if (typeof token.value === "object" && token.value !== null) {
        expect(Object.keys(token.value).length).toBeGreaterThan(0);
      }
    }
  });

  test("Dimension values are strings like '1rem', not numbers", () => {
    expect(typeof json.spacingSm.value).toBe("string");
    expect(json.spacingSm.value).toBe("0.5rem");
    expect(typeof json.spacingMd.value).toBe("string");
    expect(json.spacingMd.value).toBe("1rem");
    expect(typeof json.spacingLg.value).toBe("string");
    expect(json.spacingLg.value).toBe("1.5rem");
  });

  test("Duration values are strings like '200ms', not numbers", () => {
    expect(typeof json.durationFast.value).toBe("string");
    expect(json.durationFast.value).toBe("200ms");
    expect(typeof json.durationSlow.value).toBe("string");
    expect(json.durationSlow.value).toBe("500ms");
  });

  test("composite values have nested Dimension fields as strings", () => {
    const heading = json.typographyHeading.value;
    expect(typeof heading.fontSize).toBe("string");
    expect(heading.fontSize).toBe("1.5rem");

    const body = json.typographyBody.value;
    expect(typeof body.fontSize).toBe("string");
    expect(body.fontSize).toBe("1rem");

    const border = json.borderThin.value;
    expect(typeof border.width).toBe("string");
    expect(border.width).toBe("0.0625rem");
  });
});

// ─── Round-trip JS/ESM ──────────────────────────────────────

describe("round-trip JavaScript (ESM) integrity", () => {
  const writer = new Teikn({
    generators: [new Teikn.generators.JavaScript(testOpts)],
    plugins: [new Teikn.plugins.NameConventionPlugin({ convention: "camelCase" })],
  });

  const esm = writer.generateToStrings(allTokens).get("tokens.mjs")!;

  test("Dimension values are serialized as strings, not numbers", () => {
    // dp(16) = 1rem — should appear as '1rem' not bare 16
    expect(esm).toContain("'1rem'");
    expect(esm).toContain("'0.5rem'");
    expect(esm).toContain("'1.5rem'");
  });

  test("composite values have correctly serialized nested fields", () => {
    // Typography composites should have fontSize as a string dimension
    expect(esm).toContain('"fontSize":"1.5rem"');
    expect(esm).toContain('"fontSize":"1rem"');
    // Border composite should have width as a string dimension
    expect(esm).toContain('"width":"0.0625rem"');
  });
});

// ─── Cross-generator consistency ────────────────────────────

describe("cross-generator value consistency", () => {
  const writer = new Teikn({
    generators: [
      new Teikn.generators.CssVars(testOpts),
      new Teikn.generators.Json(),
      new Teikn.generators.JavaScript(testOpts),
    ],
    plugins: [new Teikn.plugins.NameConventionPlugin({ convention: "kebab-case" })],
  });

  const output = writer.generateToStrings(allTokens);
  const css = output.get("tokens.css")!;
  const json = JSON.parse(output.get("tokens.json")!);
  const esm = output.get("tokens.mjs")!;

  test("all generators agree on spacing-md value (dp(16) = 1rem)", () => {
    // CSS: --spacing-md: 1rem;
    expect(css).toContain("--spacing-md: 1rem;");
    // JSON: spacingMd.value === "1rem"
    expect(json.spacingMd.value).toBe("1rem");
    // ESM: contains '1rem' for spacing
    expect(esm).toContain("'1rem'");
  });

  test("all generators agree on duration-fast value (dur(200, 'ms') = 200ms)", () => {
    expect(css).toContain("--duration-fast: 200ms;");
    expect(json.durationFast.value).toBe("200ms");
    expect(esm).toContain("'200ms'");
  });

  test("all generators agree on spacing-sm value (dp(8) = 0.5rem)", () => {
    expect(css).toContain("--spacing-sm: 0.5rem;");
    expect(json.spacingSm.value).toBe("0.5rem");
    expect(esm).toContain("'0.5rem'");
  });
});

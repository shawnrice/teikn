import { describe, expect, test } from "bun:test";

import { group, scale, composite, tokens, theme, dp, dim, dur } from "./builders";
import { Color } from "./TokenTypes/Color";
import { BoxShadow } from "./TokenTypes/BoxShadow";
import { Teikn } from "./Teikn";
import { validate } from "./validate";
import { testOpts } from "./fixtures/testOpts";

// ─── Realistic token set ────────────────────────────────────
// Modeled on actual consumer usage from the docs.

const colors = group("color", {
  background: "#fafafa",
  surface: "#ffffff",
  textPrimary: "rgba(0, 0, 0, 0.87)",
  textSecondary: "rgba(0, 0, 0, 0.60)",
  primary: [new Color("#4a90d9"), "Primary interactive color"],
  primaryHover: new Color("#3a7bc8"),
  error: new Color("#f44336"),
  border: "rgba(0, 0, 0, 0.12)",
  borderFocus: "#4a90d9",
});

const spacing = scale("spacing", {
  xs: dp(4),
  sm: dp(8),
  md: dp(16),
  lg: dp(24),
  xl: dp(32),
  xxl: dp(48),
});

const typography = composite("typography", {
  displayLg: {
    fontFamily: '"Quicksand", sans-serif',
    fontSize: dp(36),
    fontWeight: 700,
    lineHeight: 1.2,
  },
  headingMd: {
    fontFamily: '"Quicksand", sans-serif',
    fontSize: dp(18),
    fontWeight: 600,
    lineHeight: 1.4,
  },
  bodyMd: {
    fontFamily: '"Quicksand", sans-serif',
    fontSize: dp(14),
    fontWeight: 400,
    lineHeight: 1.5,
  },
});

const shadows = group("shadow", {
  sm: new BoxShadow(0, 1, 2, 0, new Color(0, 0, 0, 0.06)),
  md: new BoxShadow(0, 4, 6, 0, new Color(0, 0, 0, 0.07)),
});

const radius = scale("radius", {
  sm: dp(4),
  md: dp(8),
  lg: dp(12),
  full: "9999px",
});

const timing = group("duration", {
  fast: dur(150, "ms"),
  normal: dur(300, "ms"),
});

const allTokens = tokens(colors, spacing, typography, shadows, radius, timing);

// ─── Themes ────────────────────────────────────────────────

const dark = theme("dark", colors, {
  background: "#121212",
  surface: "#1e1e1e",
  textPrimary: "rgba(255, 255, 255, 0.87)",
  textSecondary: "rgba(255, 255, 255, 0.60)",
  primary: "#6db3f8",
  primaryHover: "#8ec5fa",
  border: "rgba(255, 255, 255, 0.12)",
  borderFocus: "#6db3f8",
});

// ─── Validation ─────────────────────────────────────────────

describe("integration: validate", () => {
  test("all tokens pass validation", () => {
    const result = validate(allTokens);
    expect(result.valid).toBe(true);
    expect(result.issues.filter((i) => i.severity === "error")).toHaveLength(0);
  });
});

// ─── Full pipeline per generator ────────────────────────────

const generatorConfigs = [
  { name: "CssVars", Gen: Teikn.generators.CssVars, file: "tokens.css" },
  { name: "Scss", Gen: Teikn.generators.Scss, file: "tokens.scss" },
  { name: "ScssVars", Gen: Teikn.generators.ScssVars, file: "tokens.scss" },
  { name: "Json", Gen: Teikn.generators.Json, file: "tokens.json" },
  { name: "JavaScript", Gen: Teikn.generators.JavaScript, file: "tokens.js" },
  { name: "EsModule", Gen: Teikn.generators.EsModule, file: "tokens.mjs" },
  { name: "TypeScript", Gen: Teikn.generators.TypeScript, file: "tokens.d.ts" },
] as const;

describe("integration: full pipeline", () => {
  for (const { name, Gen, file } of generatorConfigs) {
    describe(name, () => {
      const writer = new Teikn({
        generators: [new Gen(testOpts)],
        themes: [dark],
        plugins: [new Teikn.plugins.NameConventionPlugin({ convention: "kebab-case" })],
      });

      const output = writer.generateToStrings(allTokens);
      const content = output.get(file)!;

      test("produces output", () => {
        expect(content).toBeDefined();
        expect(content.length).toBeGreaterThan(0);
      });

      test("contains no [object Object]", () => {
        expect(content).not.toContain("[object Object]");
      });

      test("contains no empty values", () => {
        // Match CSS-style empty values like ": ;" or ": ,"
        const emptyValuePattern = /:\s*[;,}\n]/;
        const lines = content.split("\n");
        const emptyLines = lines.filter(
          (line) =>
            emptyValuePattern.test(line) &&
            // Exclude lines that are just closing braces or structure
            !line.trim().startsWith("}") &&
            !line.trim().startsWith(")") &&
            !line.trim().startsWith("*") &&
            !line.trim().startsWith("//") &&
            !line.trim().startsWith("/**"),
        );
        expect(emptyLines).toEqual([]);
      });

      if (name !== "TypeScript") {
        test("contains Dimension values from dp()", () => {
          // dp(16) = 1rem, dp(8) = 0.5rem
          expect(content).toContain("1rem");
          expect(content).toContain("0.5rem");
        });

        test("contains Duration values from dur()", () => {
          expect(content).toContain("150ms");
          expect(content).toContain("300ms");
        });
      }
    });
  }
});

// ─── JSON deep assertions ───────────────────────────────────

describe("integration: JSON output structure", () => {
  const writer = new Teikn({
    generators: [new Teikn.generators.Json()],
    themes: [dark],
    plugins: [new Teikn.plugins.NameConventionPlugin({ convention: "kebab-case" })],
  });

  const json = JSON.parse(writer.generateToStrings(allTokens).get("tokens.json")!);

  test("spacing tokens have rem values from dp()", () => {
    expect(json.spacingXs.value).toBe("0.25rem");
    expect(json.spacingSm.value).toBe("0.5rem");
    expect(json.spacingMd.value).toBe("1rem");
    expect(json.spacingLg.value).toBe("1.5rem");
    expect(json.spacingXl.value).toBe("2rem");
    expect(json.spacingXxl.value).toBe("3rem");
  });

  test("typography composites have rem fontSize from dp()", () => {
    expect(json.typographyDisplayLg.value.fontSize).toBe("2.25rem");
    expect(json.typographyHeadingMd.value.fontSize).toBe("1.125rem");
    expect(json.typographyBodyMd.value.fontSize).toBe("0.875rem");
  });

  test("radius tokens have rem values from dp()", () => {
    expect(json.radiusSm.value).toBe("0.25rem");
    expect(json.radiusMd.value).toBe("0.5rem");
    expect(json.radiusLg.value).toBe("0.75rem");
    expect(json.radiusFull.value).toBe("9999px");
  });

  test("duration tokens have ms values from dur()", () => {
    expect(json.durationFast.value).toBe("150ms");
    expect(json.durationNormal.value).toBe("300ms");
  });

  test("color tokens from Color objects are strings", () => {
    const primaryValue = json.colorPrimary.value;
    expect(typeof primaryValue).toBe("string");
    expect(primaryValue).not.toBe("");
  });

  test("dark mode overrides are present", () => {
    expect(json.colorBackground.modes.dark).toBe("#121212");
    expect(json.colorSurface.modes.dark).toBe("#1e1e1e");
    expect(json.colorPrimary.modes.dark).toBe("#6db3f8");
  });

  test("tokens without dark overrides have no modes", () => {
    expect(json.spacingMd.modes).toBeUndefined();
    expect(json.colorError.modes).toBeUndefined();
  });

  test("shadow tokens serialize BoxShadow objects", () => {
    const smValue = json.shadowSm.value;
    expect(typeof smValue).toBe("string");
    expect(smValue).not.toBe("");
    expect(smValue).not.toBe("[object Object]");
  });
});

// ─── CSS output assertions ──────────────────────────────────

describe("integration: CSS output", () => {
  const writer = new Teikn({
    generators: [new Teikn.generators.CssVars(testOpts)],
    themes: [dark],
    plugins: [new Teikn.plugins.NameConventionPlugin({ convention: "kebab-case" })],
  });

  const css = writer.generateToStrings(allTokens).get("tokens.css")!;

  test("has :root block", () => {
    expect(css).toContain(":root {");
  });

  test("has dark theme block", () => {
    expect(css).toContain('[data-theme="dark"]');
  });

  test("spacing custom properties use rem from dp()", () => {
    expect(css).toContain("--spacing-md: 1rem;");
    expect(css).toContain("--spacing-sm: 0.5rem;");
  });

  test("duration custom properties use ms from dur()", () => {
    expect(css).toContain("--duration-fast: 150ms;");
    expect(css).toContain("--duration-normal: 300ms;");
  });

  test("dark mode overrides are in theme block", () => {
    expect(css).toContain("--color-background: #121212;");
  });
});

// ─── Multi-generator pipeline ───────────────────────────────

describe("integration: multi-generator output", () => {
  const writer = new Teikn({
    generators: [
      new Teikn.generators.CssVars(testOpts),
      new Teikn.generators.Json(),
      new Teikn.generators.EsModule(testOpts),
    ],
    themes: [dark],
    plugins: [
      new Teikn.plugins.NameConventionPlugin({ convention: "kebab-case" }),
      new Teikn.plugins.ScssQuoteValuePlugin(),
    ],
  });

  const output = writer.generateToStrings(allTokens);

  test("produces output for each generator", () => {
    expect(output.size).toBe(3);
    expect(output.has("tokens.css")).toBe(true);
    expect(output.has("tokens.json")).toBe(true);
    expect(output.has("tokens.mjs")).toBe(true);
  });

  test("all outputs contain spacing values", () => {
    for (const [, content] of output) {
      expect(content).toContain("1rem");
    }
  });

  test("all outputs contain duration values", () => {
    for (const [, content] of output) {
      expect(content).toContain("150ms");
    }
  });
});

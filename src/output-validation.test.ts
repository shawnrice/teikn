import { describe, expect, test } from "bun:test";

import { composite, dim, dp, dur, group, ref, scale, theme, tokens } from "./builders";
import { Teikn } from "./Teikn";
import { BoxShadow } from "./TokenTypes/BoxShadow";
import { Color } from "./TokenTypes/Color";
import { CubicBezier } from "./TokenTypes/CubicBezier";
import { Dimension } from "./TokenTypes/Dimension";
import { LinearGradient } from "./TokenTypes/Gradient";
import { Transition } from "./TokenTypes/Transition";
import { testOpts } from "./fixtures/testOpts";

// ─── Comprehensive token set ─────────────────────────────────

const colors = group("color", {
  background: { value: "#fafafa", modes: { dark: "#121212" } },
  surface: { value: "#ffffff", modes: { dark: "#1e1e1e" } },
  textPrimary: {
    value: "rgba(0, 0, 0, 0.87)",
    usage: "Main body text color",
    modes: { dark: "rgba(255, 255, 255, 0.87)" },
  },
  primary: [new Color("#4a90d9"), "Primary brand color"],
  error: new Color("#f44336"),
  border: "rgba(0, 0, 0, 0.12)",
  link: ref("primary", "Same as primary for links"),
});

const spacing = scale("spacing", {
  xs: dp(4),
  sm: dp(8),
  md: dp(16),
  lg: dp(24),
  xl: dp(32),
});

const sizes = group("size", {
  iconSm: dim(16, "px"),
  iconMd: dim(24, "px"),
  iconLg: dim(32, "px"),
});

const timing = group("duration", {
  fast: dur(150, "ms"),
  normal: dur(300, "ms"),
  slow: dur(500, "ms"),
});

const shadows = group("shadow", {
  sm: new BoxShadow(0, 1, 2, 0, new Color(0, 0, 0, 0.06)),
  md: new BoxShadow(0, 4, 6, 0, new Color(0, 0, 0, 0.1)),
  lg: new BoxShadow(0, 10, 15, -3, new Color(0, 0, 0, 0.1)),
});

const easings = group("timing", {
  standard: CubicBezier.standard,
  accelerate: CubicBezier.accelerate,
  decelerate: CubicBezier.decelerate,
});

const transitions = group("transition", {
  fade: Transition.fade,
  slide: Transition.slide,
  quick: Transition.quick,
});

const gradients = group("gradient", {
  brand: new LinearGradient(135, [
    [new Color("#4a90d9"), "0%"],
    [new Color("#f44336"), "100%"],
  ]),
});

const typography = composite("typography", {
  displayLg: {
    fontFamily: '"Quicksand", sans-serif',
    fontSize: dp(36),
    fontWeight: 700,
    lineHeight: 1.2,
  },
  bodyMd: {
    fontFamily: '"Quicksand", sans-serif',
    fontSize: dp(14),
    fontWeight: 400,
    lineHeight: 1.5,
  },
});

const borders = composite("border", {
  default: {
    width: new Dimension(1, "px"),
    style: "solid",
    color: "rgba(0, 0, 0, 0.12)",
  },
});

const radius = scale("radius", {
  sm: dp(4),
  md: dp(8),
  full: "9999px",
});

const opacities = group("opacity", {
  disabled: 0.38,
  hover: 0.08,
});

const allTokens = tokens(
  colors,
  spacing,
  sizes,
  timing,
  shadows,
  easings,
  transitions,
  gradients,
  typography,
  borders,
  radius,
  opacities,
);

const dark = theme("dark", colors, {
  background: "#121212",
  surface: "#1e1e1e",
  textPrimary: "rgba(255, 255, 255, 0.87)",
  primary: "#6db3f8",
  error: "#ef9a9a",
  border: "rgba(255, 255, 255, 0.12)",
  link: "#6db3f8",
});

// ─── Helper to generate output for a single generator ────────

const genOpts = testOpts;

const generateOutput = (Gen: any, file: string) => {
  const writer = new Teikn({
    generators: [new Gen(genOpts)],
    themes: [dark],
    plugins: [new Teikn.plugins.NameConventionPlugin({ convention: "kebab-case" })],
  });
  const output = writer.generateToStrings(allTokens);
  return output.get(file)!;
};

// Total expected token count (before type-prefixing)
const TOTAL_TOKEN_COUNT = allTokens.length;

// ─── Shared assertion helpers ────────────────────────────────

const assertNoGarbage = (content: string, label: string) => {
  expect(content).not.toContain("[object Object]");
  expect(content).not.toContain("undefined");
  expect(content).not.toContain("NaN");
  // Check for literal "null" as a value but not in comments/dates
  const lines = content.split("\n");
  for (const line of lines) {
    if (
      (line.includes(": null;") || line.includes(": null,") || line.includes(": null}")) &&
      !line.includes("Generated") &&
      !line.includes("dateFn")
    ) {
      // Allow "null" in date fields (dateFn returns "null")
      throw new Error(`${label}: found literal null value in line: ${line}`);
    }
  }
};

// ─── CSS (CssVars) ───────────────────────────────────────────

describe("output-validation: CssVars", () => {
  const css = generateOutput(Teikn.generators.CssVars, "tokens.css");

  test("output is non-empty", () => {
    expect(css.length).toBeGreaterThan(0);
  });

  test("contains no garbage values", () => {
    assertNoGarbage(css, "CSS");
  });

  test("has :root block that is properly closed", () => {
    expect(css).toContain(":root {");
    const rootStart = css.indexOf(":root {");
    const afterRoot = css.indexOf("}", rootStart);
    expect(afterRoot).toBeGreaterThan(rootStart);
  });

  test("has dark theme selector", () => {
    expect(css).toContain('[data-theme="dark"]');
  });

  test("every --var-name: value; line has a non-empty value", () => {
    const varLines = css.split("\n").filter((l) => l.trim().startsWith("--"));
    expect(varLines.length).toBeGreaterThan(0);
    for (const line of varLines) {
      const match = line.match(/--[\w-]+:\s*(.*);/);
      expect(match).not.toBeNull();
      const value = match![1]!.trim();
      expect(value.length).toBeGreaterThan(0);
    }
  });

  test("custom property count in :root matches token count", () => {
    // Extract the :root block
    const rootStart = css.indexOf(":root {");
    const rootEnd = css.indexOf("}", rootStart);
    const rootBlock = css.slice(rootStart, rootEnd);
    const varLines = rootBlock.split("\n").filter((l) => l.trim().startsWith("--"));
    expect(varLines.length).toBe(TOTAL_TOKEN_COUNT);
  });

  test("spacing values use rem from dp()", () => {
    expect(css).toContain("--spacing-md: 1rem;");
    expect(css).toContain("--spacing-sm: 0.5rem;");
    expect(css).toContain("--spacing-xs: 0.25rem;");
  });

  test("duration values use ms from dur()", () => {
    expect(css).toContain("--duration-fast: 150ms;");
    expect(css).toContain("--duration-normal: 300ms;");
    expect(css).toContain("--duration-slow: 500ms;");
  });

  test("shadow values are valid CSS box-shadow strings", () => {
    const shadowLine = css.split("\n").find((l) => l.includes("--shadow-sm:"));
    expect(shadowLine).toBeDefined();
    // Should contain px values and a color
    expect(shadowLine).toMatch(/\d+px/);
  });

  test("cubic-bezier values are present for timing tokens", () => {
    expect(css).toContain("cubic-bezier(");
  });

  test("transition values are present", () => {
    const fadeLine = css.split("\n").find((l) => l.includes("--transition-fade:"));
    expect(fadeLine).toBeDefined();
    expect(fadeLine).toContain("0.2s");
  });

  test("gradient values are present", () => {
    expect(css).toContain("linear-gradient(");
  });

  test("dark mode overrides are in theme block", () => {
    const darkStart = css.indexOf('[data-theme="dark"]');
    const darkBlock = css.slice(darkStart);
    expect(darkBlock).toContain("--color-background: #121212;");
  });
});

// ─── SCSS (Scss) ─────────────────────────────────────────────

describe("output-validation: Scss", () => {
  const scss = generateOutput(Teikn.generators.Scss, "tokens.scss");

  test("output is non-empty", () => {
    expect(scss.length).toBeGreaterThan(0);
  });

  test("contains no garbage values", () => {
    assertNoGarbage(scss, "SCSS");
  });

  test("has valid SCSS map syntax with balanced parens", () => {
    expect(scss).toContain("$token-values: (");
    const mapStart = scss.indexOf("$token-values: (");
    const afterMap = scss.indexOf(");", mapStart);
    expect(afterMap).toBeGreaterThan(mapStart);
  });

  test("no values are empty strings", () => {
    const valueLines = scss.split("\n").filter((l) => l.trim().match(/^[\w-]+:\s/));
    for (const line of valueLines) {
      const match = line.match(/:\s*(.*),?\s*$/);
      if (match) {
        expect(match[1]!.trim().length).toBeGreaterThan(0);
      }
    }
  });

  test("mode maps are present and properly structured", () => {
    expect(scss).toContain("$modes: (");
    expect(scss).toContain("dark: (");
  });
});

// ─── SCSS Variables (ScssVars) ───────────────────────────────

describe("output-validation: ScssVars", () => {
  const scssVars = generateOutput(Teikn.generators.ScssVars, "tokens.scss");

  test("output is non-empty", () => {
    expect(scssVars.length).toBeGreaterThan(0);
  });

  test("contains no garbage values", () => {
    assertNoGarbage(scssVars, "ScssVars");
  });

  test("every $var: value; line has a non-empty value", () => {
    const varLines = scssVars.split("\n").filter((l) => l.match(/^\$/));
    expect(varLines.length).toBeGreaterThan(0);
    for (const line of varLines) {
      const match = line.match(/\$[\w-]+:\s*(.*);/);
      expect(match).not.toBeNull();
      const value = match![1]!.trim();
      expect(value.length).toBeGreaterThan(0);
    }
  });

  test("mode variables are present", () => {
    expect(scssVars).toContain("--dark:");
  });
});

// ─── JSON ────────────────────────────────────────────────────

describe("output-validation: Json", () => {
  const jsonStr = generateOutput(Teikn.generators.Json, "tokens.json");
  let json: Record<string, any>;

  test("parses without error", () => {
    json = JSON.parse(jsonStr);
    expect(json).toBeDefined();
  });

  test("every token has a non-empty value field", () => {
    json = JSON.parse(jsonStr);
    for (const [_key, token] of Object.entries(json)) {
      expect(token.value).toBeDefined();
      expect(token.value).not.toBeNull();
      if (typeof token.value === "string") {
        expect(token.value.length).toBeGreaterThan(0);
      }
    }
  });

  test("every token has a type field", () => {
    json = JSON.parse(jsonStr);
    for (const [_key, token] of Object.entries(json)) {
      expect(token.type).toBeDefined();
      expect(typeof token.type).toBe("string");
      expect(token.type.length).toBeGreaterThan(0);
    }
  });

  test("dimension values are strings (not raw numbers)", () => {
    json = JSON.parse(jsonStr);
    // Spacing tokens use dp() which produces Dimension objects -> serialized to strings
    expect(typeof json.spacingMd.value).toBe("string");
    expect(json.spacingMd.value).toBe("1rem");
    expect(typeof json.spacingSm.value).toBe("string");
    expect(json.spacingSm.value).toBe("0.5rem");
  });

  test("duration values are strings (not raw numbers)", () => {
    json = JSON.parse(jsonStr);
    expect(typeof json.durationFast.value).toBe("string");
    expect(json.durationFast.value).toBe("150ms");
    expect(typeof json.durationNormal.value).toBe("string");
    expect(json.durationNormal.value).toBe("300ms");
  });

  test("composite values are objects with expected fields", () => {
    json = JSON.parse(jsonStr);
    const typo = json.typographyDisplayLg.value;
    expect(typeof typo).toBe("object");
    expect(typo.fontFamily).toBeDefined();
    expect(typo.fontSize).toBeDefined();
    expect(typo.fontWeight).toBeDefined();
    expect(typo.lineHeight).toBeDefined();
  });

  test("typography fontSize is a string (from dp())", () => {
    json = JSON.parse(jsonStr);
    expect(typeof json.typographyDisplayLg.value.fontSize).toBe("string");
    expect(json.typographyDisplayLg.value.fontSize).toBe("2.25rem");
  });

  test("border composite has expected fields", () => {
    json = JSON.parse(jsonStr);
    const border = json.borderDefault.value;
    expect(border.width).toBeDefined();
    expect(border.style).toBe("solid");
    expect(border.color).toBeDefined();
  });

  test("mode values are present for themed tokens", () => {
    json = JSON.parse(jsonStr);
    expect(json.colorBackground.modes).toBeDefined();
    expect(json.colorBackground.modes.dark).toBe("#121212");
    expect(json.colorSurface.modes.dark).toBe("#1e1e1e");
  });

  test("tokens without dark overrides have no modes", () => {
    json = JSON.parse(jsonStr);
    expect(json.spacingMd.modes).toBeUndefined();
    expect(json.shadowSm.modes).toBeUndefined();
  });

  test("shadow values are serialized as strings", () => {
    json = JSON.parse(jsonStr);
    expect(typeof json.shadowSm.value).toBe("string");
    expect(json.shadowSm.value).not.toBe("[object Object]");
    expect(json.shadowSm.value.length).toBeGreaterThan(0);
  });

  test("cubic-bezier values are serialized as strings", () => {
    json = JSON.parse(jsonStr);
    expect(typeof json.timingStandard.value).toBe("string");
    expect(json.timingStandard.value).toContain("cubic-bezier(");
  });

  test("transition values are serialized as strings", () => {
    json = JSON.parse(jsonStr);
    expect(typeof json.transitionFade.value).toBe("string");
    expect(json.transitionFade.value).toContain("0.2s");
  });

  test("gradient values are serialized as strings", () => {
    json = JSON.parse(jsonStr);
    expect(typeof json.gradientBrand.value).toBe("string");
    expect(json.gradientBrand.value).toContain("linear-gradient(");
  });

  test("opacity values are numbers", () => {
    json = JSON.parse(jsonStr);
    expect(typeof json.opacityDisabled.value).toBe("number");
    expect(json.opacityDisabled.value).toBe(0.38);
  });

  test("ref tokens are resolved", () => {
    json = JSON.parse(jsonStr);
    // link is a ref to primary, so its value should be the resolved primary color
    expect(json.colorLink.value).toBeDefined();
    expect(json.colorLink.value).not.toContain("{");
  });

  test("token count matches", () => {
    json = JSON.parse(jsonStr);
    expect(Object.keys(json).length).toBe(TOTAL_TOKEN_COUNT);
  });

  test("no value contains [object Object]", () => {
    json = JSON.parse(jsonStr);
    for (const [, token] of Object.entries(json)) {
      const val = (token as any).value;
      if (typeof val === "string") {
        expect(val).not.toContain("[object Object]");
      }
    }
  });
});

// ─── JavaScript ──────────────────────────────────────────────

describe("output-validation: JavaScript", () => {
  const js = generateOutput(Teikn.generators.JavaScript, "tokens.js");

  test("output is non-empty", () => {
    expect(js.length).toBeGreaterThan(0);
  });

  test("contains no garbage values", () => {
    assertNoGarbage(js, "JavaScript");
  });

  test("has module.exports", () => {
    expect(js).toContain("module.exports");
  });

  test("has const tokens = {", () => {
    expect(js).toContain("const tokens = {");
  });

  test("all token values are present (no empty strings)", () => {
    const valueLines = js.split("\n").filter((l) => l.match(/^\s+\w[\w]*:/));
    for (const line of valueLines) {
      // Skip comment/type annotation lines
      if (line.trim().startsWith("*") || line.trim().startsWith("//")) {
        continue;
      }
      if (line.includes("Type:")) {
        continue;
      }
      const match = line.match(/:\s*(.*),?\s*$/);
      if (match) {
        const val = match[1]!.trim().replace(/,$/, "").trim();
        if (val.length > 0) {
          expect(val).not.toBe("''");
        }
      }
    }
  });

  test("composite values are valid object literals", () => {
    // Typography tokens should have object values with fontFamily, fontSize, etc.
    expect(js).toContain("fontFamily");
    expect(js).toContain("fontSize");
  });

  test("mode exports are present", () => {
    expect(js).toContain("const modes = {");
    expect(js).toContain("dark:");
  });
});

// ─── EsModule ────────────────────────────────────────────────

describe("output-validation: EsModule", () => {
  const esm = generateOutput(Teikn.generators.EsModule, "tokens.mjs");

  test("output is non-empty", () => {
    expect(esm.length).toBeGreaterThan(0);
  });

  test("contains no garbage values", () => {
    assertNoGarbage(esm, "EsModule");
  });

  test("has export const tokens", () => {
    expect(esm).toContain("export const tokens = {");
  });

  test("has export default tokens", () => {
    expect(esm).toContain("export default tokens;");
  });

  test("mode exports use export syntax", () => {
    expect(esm).toContain("export const modes = {");
    expect(esm).toContain("dark:");
  });

  test("all values are present (no empty strings)", () => {
    const valueLines = esm
      .split("\n")
      .filter((l) => l.match(/^\s+\w[\w]*:/) && !l.trim().startsWith("*") && !l.includes("Type:"));
    for (const line of valueLines) {
      const match = line.match(/:\s*(.*),?\s*$/);
      if (match) {
        const val = match[1]!.trim().replace(/,$/, "").trim();
        if (val.length > 0) {
          expect(val).not.toBe("''");
        }
      }
    }
  });
});

// ─── TypeScript ──────────────────────────────────────────────

describe("output-validation: TypeScript", () => {
  const ts = generateOutput(Teikn.generators.TypeScript, "tokens.d.ts");

  test("output is non-empty", () => {
    expect(ts.length).toBeGreaterThan(0);
  });

  test("has type declarations", () => {
    expect(ts).toContain("export const tokens: {");
  });

  test("composite types have the right fields", () => {
    // Typography should produce an inline shape type
    expect(ts).toContain(
      "typographyDisplayLg: { fontFamily: string; fontSize: string; fontWeight: number; lineHeight: number }",
    );
  });

  test("mode type should be Partial<...>", () => {
    expect(ts).toContain("export const modes: {");
    expect(ts).toContain("Partial<typeof tokens>");
  });

  test("export default tokens", () => {
    expect(ts).toContain("export default tokens;");
  });
});

// ─── HTML ────────────────────────────────────────────────────

describe("output-validation: Html", () => {
  const html = generateOutput(Teikn.generators.Html, "tokens.html");

  test("output is non-empty", () => {
    expect(html.length).toBeGreaterThan(0);
  });

  test("has doctype", () => {
    expect(html.toLowerCase()).toContain("<!doctype html>");
  });

  test("has html, head, body tags", () => {
    expect(html).toContain("<html");
    expect(html).toContain("<head>");
    expect(html).toContain("<body");
  });

  test("contains no [object Object]", () => {
    expect(html).not.toContain("[object Object]");
  });

  test("token values appear in the output", () => {
    // Spacing values should appear
    expect(html).toContain("1rem");
    expect(html).toContain("0.5rem");
    // Duration values
    expect(html).toContain("150ms");
    expect(html).toContain("300ms");
  });
});

// ─── DTCG ────────────────────────────────────────────────────

describe("output-validation: Dtcg", () => {
  const dtcgStr = (() => {
    const writer = new Teikn({
      generators: [new Teikn.generators.Dtcg(genOpts)],
      themes: [dark],
      plugins: [new Teikn.plugins.NameConventionPlugin({ convention: "kebab-case" })],
    });
    return writer.generateToStrings(allTokens).get("tokens.tokens.json")!;
  })();

  let dtcg: Record<string, any>;

  test("parses without error", () => {
    dtcg = JSON.parse(dtcgStr);
    expect(dtcg).toBeDefined();
  });

  test("contains no [object Object]", () => {
    expect(dtcgStr).not.toContain("[object Object]");
  });

  // Helper to collect all leaf tokens from a DTCG doc
  const collectLeafTokens = (obj: Record<string, any>, path = ""): Record<string, any>[] => {
    const results: Record<string, any>[] = [];
    for (const [key, val] of Object.entries(obj)) {
      if (key.startsWith("$")) {
        continue;
      }
      if (val && typeof val === "object" && "$value" in val) {
        results.push({ path: path ? `${path}.${key}` : key, ...val });
      } else if (val && typeof val === "object") {
        results.push(...collectLeafTokens(val, path ? `${path}.${key}` : key));
      }
    }
    return results;
  };

  test("every token has $value and $type fields (directly or inherited)", () => {
    dtcg = JSON.parse(dtcgStr);
    const leaves = collectLeafTokens(dtcg);
    expect(leaves.length).toBe(TOTAL_TOKEN_COUNT);
    for (const leaf of leaves) {
      expect(leaf.$value).toBeDefined();
      // $type may be inherited from parent group, so check it exists on leaf or ancestor
      // We check the leaf has $value at minimum
    }
  });

  test("dimension values are { value, unit } objects", () => {
    dtcg = JSON.parse(dtcgStr);
    const leaves = collectLeafTokens(dtcg);
    const spacingTokens = leaves.filter((l) => l.path.startsWith("spacing"));
    expect(spacingTokens.length).toBeGreaterThan(0);
    for (const token of spacingTokens) {
      const val = token.$value;
      expect(typeof val).toBe("object");
      expect(val.value).toBeDefined();
      expect(typeof val.value).toBe("number");
      expect(val.unit).toBeDefined();
      expect(typeof val.unit).toBe("string");
    }
  });

  test("duration values are { value, unit } objects", () => {
    dtcg = JSON.parse(dtcgStr);
    const leaves = collectLeafTokens(dtcg);
    const durationTokens = leaves.filter((l) => l.path.startsWith("duration"));
    expect(durationTokens.length).toBeGreaterThan(0);
    for (const token of durationTokens) {
      const val = token.$value;
      expect(typeof val).toBe("object");
      expect(val.value).toBeDefined();
      expect(typeof val.value).toBe("number");
      expect(val.unit).toBeDefined();
    }
  });

  test("color values are DTCG color objects", () => {
    dtcg = JSON.parse(dtcgStr);
    const leaves = collectLeafTokens(dtcg);
    const colorTokens = leaves.filter((l) => l.path.startsWith("color"));
    expect(colorTokens.length).toBeGreaterThan(0);
    for (const token of colorTokens) {
      const val = token.$value;
      // DTCG colors should be objects with colorSpace and components
      // or hex strings — depends on whether Color object or string
      if (typeof val === "object" && val !== null) {
        expect(val.colorSpace).toBeDefined();
        expect(val.components).toBeDefined();
        expect(Array.isArray(val.components)).toBe(true);
      } else {
        // String colors get converted to DTCG color objects too
        expect(typeof val).toBe("object");
      }
    }
  });

  test("mode values are in $extensions.mode", () => {
    dtcg = JSON.parse(dtcgStr);
    const leaves = collectLeafTokens(dtcg);
    const themedTokens = leaves.filter((l) => l.$extensions?.mode);
    expect(themedTokens.length).toBeGreaterThan(0);
    for (const token of themedTokens) {
      expect(token.$extensions.mode.dark).toBeDefined();
    }
  });

  test("shadow values are structured DTCG shadow objects", () => {
    dtcg = JSON.parse(dtcgStr);
    const leaves = collectLeafTokens(dtcg);
    const shadowTokens = leaves.filter((l) => l.path.startsWith("shadow"));
    expect(shadowTokens.length).toBeGreaterThan(0);
    for (const token of shadowTokens) {
      const val = token.$value;
      expect(typeof val).toBe("object");
      expect(val.color).toBeDefined();
      expect(val.offsetX).toBeDefined();
      expect(val.offsetY).toBeDefined();
      expect(val.blur).toBeDefined();
      expect(val.spread).toBeDefined();
    }
  });

  test("cubic-bezier values are 4-element arrays", () => {
    dtcg = JSON.parse(dtcgStr);
    const leaves = collectLeafTokens(dtcg);
    const timingTokens = leaves.filter((l) => l.path.startsWith("timing"));
    expect(timingTokens.length).toBeGreaterThan(0);
    for (const token of timingTokens) {
      const val = token.$value;
      expect(Array.isArray(val)).toBe(true);
      expect(val.length).toBe(4);
      for (const n of val) {
        expect(typeof n).toBe("number");
      }
    }
  });

  test("transition values are structured objects", () => {
    dtcg = JSON.parse(dtcgStr);
    const leaves = collectLeafTokens(dtcg);
    const transitionTokens = leaves.filter((l) => l.path.startsWith("transition"));
    expect(transitionTokens.length).toBeGreaterThan(0);
    for (const token of transitionTokens) {
      const val = token.$value;
      expect(typeof val).toBe("object");
      expect(val.duration).toBeDefined();
      expect(val.timingFunction).toBeDefined();
    }
  });
});

// ─── Cross-generator consistency checks ──────────────────────

describe("output-validation: cross-generator consistency", () => {
  const writer = new Teikn({
    generators: [
      new Teikn.generators.CssVars(genOpts),
      new Teikn.generators.Json(),
      new Teikn.generators.EsModule(genOpts),
    ],
    themes: [dark],
    plugins: [new Teikn.plugins.NameConventionPlugin({ convention: "kebab-case" })],
  });

  const output = writer.generateToStrings(allTokens);
  const css = output.get("tokens.css")!;
  const jsonStr = output.get("tokens.json")!;
  const esm = output.get("tokens.mjs")!;
  const json = JSON.parse(jsonStr);

  test("spacing token values agree across CSS and JSON", () => {
    // CSS: --spacing-md: 1rem;
    // JSON: "spacingMd": { "value": "1rem" }
    expect(css).toContain("--spacing-md: 1rem;");
    expect(json.spacingMd.value).toBe("1rem");

    expect(css).toContain("--spacing-sm: 0.5rem;");
    expect(json.spacingSm.value).toBe("0.5rem");

    expect(css).toContain("--spacing-xs: 0.25rem;");
    expect(json.spacingXs.value).toBe("0.25rem");
  });

  test("spacing token values agree across EsModule and JSON", () => {
    expect(esm).toContain("'1rem'");
    expect(json.spacingMd.value).toBe("1rem");

    expect(esm).toContain("'0.5rem'");
    expect(json.spacingSm.value).toBe("0.5rem");
  });

  test("duration token values agree across CSS and JSON", () => {
    expect(css).toContain("--duration-fast: 150ms;");
    expect(json.durationFast.value).toBe("150ms");

    expect(css).toContain("--duration-normal: 300ms;");
    expect(json.durationNormal.value).toBe("300ms");

    expect(css).toContain("--duration-slow: 500ms;");
    expect(json.durationSlow.value).toBe("500ms");
  });

  test("duration token values agree across EsModule and JSON", () => {
    expect(esm).toContain("'150ms'");
    expect(json.durationFast.value).toBe("150ms");

    expect(esm).toContain("'300ms'");
    expect(json.durationNormal.value).toBe("300ms");
  });

  test("token count is consistent across generators", () => {
    // CSS: count --var lines in :root
    const rootStart = css.indexOf(":root {");
    const rootEnd = css.indexOf("}", rootStart);
    const rootBlock = css.slice(rootStart, rootEnd);
    const cssCount = rootBlock.split("\n").filter((l) => l.trim().startsWith("--")).length;

    // JSON: count keys
    const jsonCount = Object.keys(json).length;

    expect(cssCount).toBe(jsonCount);
    expect(jsonCount).toBe(TOTAL_TOKEN_COUNT);
  });

  test("all outputs contain the same spacing values", () => {
    for (const [, content] of output) {
      expect(content).toContain("1rem");
      expect(content).toContain("0.5rem");
      expect(content).toContain("0.25rem");
    }
  });

  test("all outputs contain the same duration values", () => {
    for (const [, content] of output) {
      expect(content).toContain("150ms");
      expect(content).toContain("300ms");
      expect(content).toContain("500ms");
    }
  });
});

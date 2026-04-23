import { describe, expect, test } from "bun:test";

import { tokenSet1 } from "../fixtures/tokenSet1";
import type { Token } from "../Token";
import { BoxShadow } from "../TokenTypes/BoxShadow";
import { Color } from "../TokenTypes/Color";
import { CubicBezier } from "../TokenTypes/CubicBezier";
import { LinearGradient, RadialGradient } from "../TokenTypes/Gradient";
import { Transition } from "../TokenTypes/Transition";
import { CssVars } from "./CssVars";
import { Html as Generator } from "./Html";
import { JavaScript } from "./JavaScript";
import { Scss } from "./Scss";

const fixedDate = () => "Mon Jan 01 2024 12:00:00";

describe("Html Generator tests", () => {
  test("It generates the token set", () => {
    expect(
      new Generator({ dateFn: fixedDate, version: "test" }).generate(tokenSet1),
    ).toMatchSnapshot();
  });

  test("It renders color tokens with contrast info", () => {
    const tokens: Token[] = [
      { name: "red", type: "color", value: new Color(255, 0, 0) },
      { name: "blue", type: "color", value: "#0000ff" },
    ];
    const html = new Generator({ dateFn: fixedDate, version: "test" }).generate(tokens);

    expect(html).toContain("color-swatch");
    expect(html).toContain("vs white");
    expect(html).toContain("vs black");
    expect(html).toContain("AA</span>");
    expect(html).toContain("AAA</span>");
    expect(html).toContain("tooltip");
    expect(html).toContain("#ff0000");
    expect(html).toContain("#0000ff");
  });

  test("It groups multiple token types into sections", () => {
    const tokens: Token[] = [
      { name: "primary", type: "color", value: new Color("red") },
      { name: "heading", type: "font-size", value: "2rem" },
      { name: "sans", type: "font-family", value: "Arial, sans-serif" },
      { name: "bold", type: "font-weight", value: "700" },
      { name: "gap", type: "spacing", value: "8px" },
    ];
    const html = new Generator({ dateFn: fixedDate, version: "test" }).generate(tokens);

    expect(html).toContain('id="section-color"');
    expect(html).toContain('id="section-font-size"');
    expect(html).toContain('id="section-font-family"');
    expect(html).toContain('id="section-font-weight"');
    expect(html).toContain('id="section-spacing"');
    expect(html).toContain("color-grid");
    expect(html).toContain("font-sample-text");
    expect(html).toContain("spacing-bar");

    // Sidebar links
    expect(html).toContain('href="#section-color"');
    expect(html).toContain('href="#section-font-size"');
  });

  test("It renders usage descriptions", () => {
    const tokens: Token[] = [
      { name: "brand", type: "color", value: "#cc0000", usage: "Primary brand color" },
      { name: "base", type: "font-size", value: "1rem", usage: "Base body text size" },
    ];
    const html = new Generator({ dateFn: fixedDate, version: "test" }).generate(tokens);

    expect(html).toContain("Primary brand color");
    expect(html).toContain("Base body text size");
    expect(html).toContain("token-usage");
  });

  test("It renders composite tokens as definition lists", () => {
    const tokens: Token[] = [
      {
        name: "heading",
        type: "typography",
        value: { fontFamily: "Georgia", fontSize: "2rem", fontWeight: "700" },
      },
    ];
    const html = new Generator({ dateFn: fixedDate, version: "test" }).generate(tokens);

    expect(html).toContain("composite-token");
    expect(html).toContain("composite-values");
    expect(html).toContain("<dt>fontFamily</dt>");
    expect(html).toContain("Georgia");
  });

  test("It produces a self-contained HTML document", () => {
    const html = new Generator({ dateFn: fixedDate, version: "test" }).generate(tokenSet1);

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain('<html lang="en">');
    expect(html).toContain("</html>");
    expect(html).toContain("<style>");
    expect(html).toContain("</style>");
  });

  test("It sets the correct file extension", () => {
    const gen = new Generator();
    expect(gen.file).toBe("tokens.html");
  });

  test("It renders flip cards with sibling usage snippets", () => {
    const htmlGen = new Generator({ dateFn: fixedDate, version: "test" });
    const esGen = new JavaScript({ groups: true });
    const scssGen = new Scss();
    const cssGen = new CssVars();

    const siblings = [htmlGen, esGen, scssGen, cssGen];
    for (const g of siblings) {
      g.siblings = siblings;
    }

    const tokens: Token[] = [{ name: "colorPrimary", type: "color", value: new Color(255, 0, 0) }];
    const html = htmlGen.generate(tokens);

    // Flip card structure
    expect(html).toContain("flip-card");
    expect(html).toContain("flip-inner");
    expect(html).toContain("flip-front");
    expect(html).toContain("flip-back");
    expect(html).toContain("flip-btn");
    expect(html).toContain("flip-close");

    // ES Module usage with groups
    expect(html).toContain("ES Module");
    expect(html).toContain("color('primary')");

    // SCSS usage without groups
    expect(html).toContain("SCSS Map");
    expect(html).toContain("get-token('color-primary')");

    // CSS Vars usage
    expect(html).toContain("CSS Custom Properties");
    expect(html).toContain("var(--color-primary)");

    // Copy buttons
    expect(html).toContain("copy-btn");
    expect(html).toContain("data-copy=");
  });

  test("It does not render flip cards without siblings", () => {
    const tokens: Token[] = [{ name: "primary", type: "color", value: new Color(255, 0, 0) }];
    const html = new Generator({ dateFn: fixedDate, version: "test" }).generate(tokens);

    expect(html).not.toContain('class="flip-card"');
    expect(html).not.toContain('class="flip-inner"');
    expect(html).toContain("color-swatch");
  });

  test("It does not wrap z-layer tokens in flip cards", () => {
    const htmlGen = new Generator({ dateFn: fixedDate, version: "test" });
    const cssGen = new CssVars();
    const siblings = [htmlGen, cssGen];
    for (const g of siblings) {
      g.siblings = siblings;
    }

    const tokens: Token[] = [
      { name: "modal", type: "z-layer", value: 100 },
      { name: "tooltip", type: "z-layer", value: 200 },
    ];
    const html = htmlGen.generate(tokens);

    expect(html).toContain("zlayer-stack");
    expect(html).not.toContain('class="flip-card"');
  });

  // ── Shadow tokens ────────────────────────────────────────────

  test("It renders shadow tokens with BoxShadow instance", () => {
    const tokens: Token[] = [
      {
        name: "shadowMd",
        type: "shadow",
        value: new BoxShadow(0, 2, 8, 0, new Color(0, 0, 0, 0.12)),
      },
    ];
    const html = new Generator({ dateFn: fixedDate, version: "test" }).generate(tokens);

    expect(html).toContain("shadow-grid");
    expect(html).toContain("shadow-box");
    expect(html).toContain("shadow-name");
    expect(html).toContain("shadow-md");
    expect(html).toContain("box-shadow:");
  });

  test("It renders shadow tokens with string value", () => {
    const tokens: Token[] = [
      { name: "shadowLg", type: "shadow", value: "0 4px 16px rgba(0,0,0,0.2)" },
    ];
    const html = new Generator({ dateFn: fixedDate, version: "test" }).generate(tokens);

    expect(html).toContain("shadow-box");
    expect(html).toContain("shadow-lg");
    expect(html).toContain("0 4px 16px rgba(0,0,0,0.2)");
  });

  // ── Duration tokens ──────────────────────────────────────────

  test("It renders duration tokens with animation bar", () => {
    const tokens: Token[] = [{ name: "durationFast", type: "duration", value: "0.2s" }];
    const html = new Generator({ dateFn: fixedDate, version: "test" }).generate(tokens);

    expect(html).toContain("duration-card");
    expect(html).toContain("duration-name");
    expect(html).toContain("duration-val");
    expect(html).toContain("duration-fast");
    expect(html).toContain("0.2s");
    expect(html).toContain("duration-fill");
    expect(html).toContain("play-btn");
  });

  test("It renders duration tokens with usage text", () => {
    const tokens: Token[] = [
      { name: "durationSlow", type: "duration", value: "0.5s", usage: "For page transitions" },
    ];
    const html = new Generator({ dateFn: fixedDate, version: "test" }).generate(tokens);

    expect(html).toContain("For page transitions");
    expect(html).toContain("token-usage");
  });

  // ── Timing / easing tokens ───────────────────────────────────

  test("It renders timing tokens with CubicBezier instance", () => {
    const tokens: Token[] = [
      { name: "easeStandard", type: "timing", value: new CubicBezier(0.4, 0, 0.2, 1) },
    ];
    const html = new Generator({ dateFn: fixedDate, version: "test" }).generate(tokens);

    expect(html).toContain("timing-card");
    expect(html).toContain("timing-viz");
    expect(html).toContain("<svg");
    expect(html).toContain("timing-name");
    expect(html).toContain("ease-standard");
    expect(html).toContain("timing-value");
    expect(html).toContain("cubic-bezier(0.4, 0, 0.2, 1)");
    expect(html).toContain("timing-point");
    expect(html).toContain("P1");
    expect(html).toContain("P2");
    expect(html).toContain("timing-ball");
    expect(html).toContain("play-btn");
  });

  test('It renders timing tokens with named string value like "ease"', () => {
    const tokens: Token[] = [{ name: "easeDefault", type: "easing", value: "ease" }];
    const html = new Generator({ dateFn: fixedDate, version: "test" }).generate(tokens);

    expect(html).toContain("timing-card");
    expect(html).toContain("<svg");
    expect(html).toContain("ease-default");
    expect(html).toContain("cubic-bezier(0.25, 0.1, 0.25, 1)");
  });

  test("It renders timing tokens with cubic-bezier() string", () => {
    const tokens: Token[] = [
      { name: "customEase", type: "timing", value: "cubic-bezier(0.42, 0, 0.58, 1)" },
    ];
    const html = new Generator({ dateFn: fixedDate, version: "test" }).generate(tokens);

    expect(html).toContain("timing-card");
    expect(html).toContain("cubic-bezier(0.42, 0, 0.58, 1)");
  });

  test("It returns empty for timing tokens with non-parseable value", () => {
    const tokens: Token[] = [{ name: "badTiming", type: "timing", value: "not-a-timing" }];
    const html = new Generator({ dateFn: fixedDate, version: "test" }).generate(tokens);

    // The token should appear in the table but have no visualization card
    expect(html).not.toContain('class="timing-card');
    expect(html).toContain("bad-timing");
  });

  // ── Border composite tokens ──────────────────────────────────

  test("It renders border composite tokens", () => {
    const tokens: Token[] = [
      {
        name: "borderDefault",
        type: "border",
        value: { width: "1px", style: "solid", color: "#000000" },
      },
    ];
    const html = new Generator({ dateFn: fixedDate, version: "test" }).generate(tokens);

    expect(html).toContain("border-sample");
    expect(html).toContain("border-demo");
    expect(html).toContain("border-props");
    expect(html).toContain("border-default");
    expect(html).toContain("1px");
    expect(html).toContain("solid");
    expect(html).toContain("#000000");
  });

  // ── Border radius tokens ─────────────────────────────────────

  test("It renders border-radius tokens", () => {
    const tokens: Token[] = [{ name: "radiusMd", type: "border-radius", value: "0.5rem" }];
    const html = new Generator({ dateFn: fixedDate, version: "test" }).generate(tokens);

    expect(html).toContain("radius-grid");
    expect(html).toContain("radius-card");
    expect(html).toContain("radius-box");
    expect(html).toContain("radius-name");
    expect(html).toContain("radius-md");
    expect(html).toContain("0.5rem");
    expect(html).toContain("border-radius:0.5rem");
  });

  // ── Gradient tokens ──────────────────────────────────────────

  test("It renders LinearGradient tokens", () => {
    const tokens: Token[] = [
      {
        name: "gradientSunset",
        type: "gradient",
        value: new LinearGradient(180, [
          [new Color(255, 0, 0), "0%"],
          [new Color(0, 0, 255), "100%"],
        ]),
      },
    ];
    const html = new Generator({ dateFn: fixedDate, version: "test" }).generate(tokens);

    expect(html).toContain("gradient-grid");
    expect(html).toContain("gradient-card");
    expect(html).toContain("gradient-swatch");
    expect(html).toContain("gradient-name");
    expect(html).toContain("gradient-sunset");
    expect(html).toContain("gradient-type-badge");
    expect(html).toContain("Linear");
    expect(html).toContain("180");
    expect(html).toContain("gradient-stop-swatch");
    expect(html).toContain("gradient-stop-hex");
    expect(html).toContain("gradient-css");
  });

  test('It renders RadialGradient tokens with "Radial" badge', () => {
    const tokens: Token[] = [
      {
        name: "gradientGlow",
        type: "gradient",
        value: new RadialGradient({ shape: "circle" }, [
          [new Color(255, 255, 0), "0%"],
          [new Color(0, 128, 0), "100%"],
        ]),
      },
    ];
    const html = new Generator({ dateFn: fixedDate, version: "test" }).generate(tokens);

    expect(html).toContain("gradient-card");
    expect(html).toContain("Radial");
    expect(html).toContain("circle");
    expect(html).toContain("gradient-glow");
  });

  // ── Opacity tokens ───────────────────────────────────────────

  test("It renders opacity tokens", () => {
    const tokens: Token[] = [{ name: "opacityHalf", type: "opacity", value: 0.5 }];
    const html = new Generator({ dateFn: fixedDate, version: "test" }).generate(tokens);

    expect(html).toContain("opacity-grid");
    expect(html).toContain("opacity-card");
    expect(html).toContain("opacity-swatch");
    expect(html).toContain("opacity-fill");
    expect(html).toContain("opacity-name");
    expect(html).toContain("opacity-half");
    expect(html).toContain("opacity:0.5");
  });

  // ── Line height tokens ───────────────────────────────────────

  test("It renders line-height tokens", () => {
    const tokens: Token[] = [{ name: "lineHeightRelaxed", type: "line-height", value: 1.75 }];
    const html = new Generator({ dateFn: fixedDate, version: "test" }).generate(tokens);

    expect(html).toContain("lineheight-sample");
    expect(html).toContain("lineheight-label");
    expect(html).toContain("lineheight-text");
    expect(html).toContain("line-height-relaxed");
    expect(html).toContain("line-height:1.75");
  });

  // ── Letter spacing tokens ────────────────────────────────────

  test("It renders letter-spacing tokens", () => {
    const tokens: Token[] = [{ name: "trackingTight", type: "letter-spacing", value: "-0.02em" }];
    const html = new Generator({ dateFn: fixedDate, version: "test" }).generate(tokens);

    expect(html).toContain("letterspacing-sample");
    expect(html).toContain("letterspacing-label");
    expect(html).toContain("letterspacing-text");
    expect(html).toContain("tracking-tight");
    expect(html).toContain("-0.02em");
    expect(html).toContain("letter-spacing:-0.02em");
  });

  test("It routes letter-spacing before generic spacing", () => {
    const tokens: Token[] = [{ name: "lsWide", type: "letter-spacing", value: "0.1em" }];
    const html = new Generator({ dateFn: fixedDate, version: "test" }).generate(tokens);

    // Should use letterspacing-sample, NOT spacing-bar (check HTML elements, not CSS defs)
    expect(html).toContain('class="letterspacing-sample"');
    expect(html).not.toContain('class="spacing-sample"');
  });

  // ── Breakpoint tokens ────────────────────────────────────────

  test("It renders breakpoint tokens with proportional bar", () => {
    const tokens: Token[] = [{ name: "bpTablet", type: "breakpoint", value: "768px" }];
    const html = new Generator({ dateFn: fixedDate, version: "test" }).generate(tokens);

    expect(html).toContain("breakpoint-sample");
    expect(html).toContain("breakpoint-label");
    expect(html).toContain("breakpoint-bar");
    expect(html).toContain("breakpoint-marker");
    expect(html).toContain("bp-tablet");
    expect(html).toContain("768px");
    // 768/1280 = 60%
    expect(html).toContain("width:60%");
  });

  // ── Size tokens ──────────────────────────────────────────────

  test("It renders size tokens", () => {
    const tokens: Token[] = [{ name: "sizeIcon", type: "size", value: "24px" }];
    const html = new Generator({ dateFn: fixedDate, version: "test" }).generate(tokens);

    expect(html).toContain("size-grid");
    expect(html).toContain("size-card");
    expect(html).toContain("size-box");
    expect(html).toContain("size-name");
    expect(html).toContain("size-icon");
    expect(html).toContain("24px");
  });

  // ── Aspect ratio tokens ──────────────────────────────────────

  test("It renders aspect-ratio tokens", () => {
    const tokens: Token[] = [{ name: "ratioWide", type: "aspect-ratio", value: "16/9" }];
    const html = new Generator({ dateFn: fixedDate, version: "test" }).generate(tokens);

    expect(html).toContain("ratio-grid");
    expect(html).toContain("ratio-card");
    expect(html).toContain("ratio-box");
    expect(html).toContain("ratio-name");
    expect(html).toContain("ratio-wide");
    expect(html).toContain("16/9");
    // Box should be 120px wide, 120 * (9/16) = 68px (rounded) tall
    expect(html).toContain("width:120px");
    expect(html).toContain("height:68px");
  });

  // ── Transition tokens ────────────────────────────────────────

  test("It renders transition tokens with Transition instance", () => {
    const tokens: Token[] = [
      {
        name: "transitionStandard",
        type: "transition",
        value: new Transition("0.3s", new CubicBezier(0.4, 0, 0.2, 1)),
      },
    ];
    const html = new Generator({ dateFn: fixedDate, version: "test" }).generate(tokens);

    expect(html).toContain("transition-card");
    expect(html).toContain("transition-header");
    expect(html).toContain("transition-name");
    expect(html).toContain("transition-standard");
    expect(html).toContain("transition-value");
    expect(html).toContain("transition-props");
    expect(html).toContain("<dt>duration</dt>");
    expect(html).toContain("<dd>0.3s</dd>");
    expect(html).toContain("<dt>timing</dt>");
    expect(html).toContain("transition-demo-box");
  });

  test('It renders transition tokens with plain string value using "all" prefix', () => {
    const tokens: Token[] = [{ name: "transitionSimple", type: "transition", value: "0.2s ease" }];
    const html = new Generator({ dateFn: fixedDate, version: "test" }).generate(tokens);

    expect(html).toContain("transition-card");
    expect(html).toContain("transition-simple");
    // Plain string: transition style uses "transition: all VALUE"
    expect(html).toContain("transition: all 0.2s ease");
  });

  // ── Generic composite fallback ───────────────────────────────

  test("It renders unknown composite types as definition lists", () => {
    const tokens: Token[] = [
      { name: "customComposite", type: "custom-thing", value: { foo: "bar", baz: 42 } },
    ];
    const html = new Generator({ dateFn: fixedDate, version: "test" }).generate(tokens);

    expect(html).toContain("composite-token");
    expect(html).toContain("composite-name");
    expect(html).toContain("composite-values");
    expect(html).toContain("custom-composite");
    expect(html).toContain("<dt>foo</dt>");
    expect(html).toContain("bar");
    expect(html).toContain("<dt>baz</dt>");
    expect(html).toContain("42");
  });

  // ── Mode variants ───────────────────────────────────────────

  test("It renders mode variants for color tokens with swatches", () => {
    const tokens: Token[] = [
      {
        name: "colorSurface",
        type: "color",
        value: new Color(255, 255, 255),
        modes: { dark: "#1a1a1a" },
      },
    ];
    const html = new Generator({ dateFn: fixedDate, version: "test" }).generate(tokens);

    expect(html).toContain("mode-variants");
    expect(html).toContain("mode-badge");
    expect(html).toContain("mode-swatch");
    expect(html).toContain("dark");
    expect(html).toContain("#1a1a1a");
  });

  test("It renders mode variants for non-color tokens without swatches", () => {
    const tokens: Token[] = [
      { name: "spacingSm", type: "spacing", value: "4px", modes: { compact: "2px" } },
    ];
    const html = new Generator({ dateFn: fixedDate, version: "test" }).generate(tokens);

    expect(html).toContain('class="mode-variants"');
    expect(html).toContain('class="mode-badge"');
    expect(html).toContain("compact");
    expect(html).toContain("2px");
    // Non-color tokens should not have color swatches
    expect(html).not.toContain('class="mode-swatch"');
  });

  test("It does not render mode variants when token has no modes", () => {
    const tokens: Token[] = [{ name: "primary", type: "color", value: new Color(255, 0, 0) }];
    const html = new Generator({ dateFn: fixedDate, version: "test" }).generate(tokens);

    // CSS definitions will contain .mode-variants, but no actual instances
    expect(html).not.toContain('class="mode-variants"');
    expect(html).not.toContain('class="mode-badge"');
  });

  test("It renders mode variants for multiple modes", () => {
    const tokens: Token[] = [
      { name: "colorSurface", type: "color", value: "#fff", modes: { dark: "#111", dim: "#333" } },
    ];
    const html = new Generator({ dateFn: fixedDate, version: "test" }).generate(tokens);

    expect(html).toContain("dark");
    expect(html).toContain("#111");
    expect(html).toContain("dim");
    expect(html).toContain("#333");
  });

  test("It includes mode-related CSS", () => {
    const html = new Generator({ dateFn: fixedDate, version: "test" }).generate([
      { name: "x", type: "color", value: "#fff" },
    ]);

    expect(html).toContain(".mode-variants");
    expect(html).toContain(".mode-badge");
    expect(html).toContain(".mode-swatch");
  });

  // ── Color edge case ──────────────────────────────────────────

  test("It returns empty visualization for invalid color string", () => {
    const tokens: Token[] = [{ name: "badColor", type: "color", value: "not-a-color" }];
    const html = new Generator({ dateFn: fixedDate, version: "test" }).generate(tokens);

    // No color-card visualization for invalid colors, but the token table should still have it
    expect(html).not.toContain('class="color-card"');
    expect(html).toContain("bad-color");
  });

  // ── vizClassForType routing ──────────────────────────────────

  test("It applies correct grid class for shadow type", () => {
    const tokens: Token[] = [
      { name: "shadowSm", type: "shadow", value: "0 1px 2px rgba(0,0,0,0.1)" },
    ];
    const html = new Generator({ dateFn: fixedDate, version: "test" }).generate(tokens);
    expect(html).toContain("shadow-grid");
  });

  test("It applies correct grid class for gradient type", () => {
    const tokens: Token[] = [
      {
        name: "grad",
        type: "gradient",
        value: new LinearGradient(90, [
          [new Color(255, 0, 0), "0%"],
          [new Color(0, 0, 255), "100%"],
        ]),
      },
    ];
    const html = new Generator({ dateFn: fixedDate, version: "test" }).generate(tokens);
    expect(html).toContain("gradient-grid");
  });

  test("It applies correct grid class for opacity type", () => {
    const tokens: Token[] = [{ name: "op", type: "opacity", value: 0.8 }];
    const html = new Generator({ dateFn: fixedDate, version: "test" }).generate(tokens);
    expect(html).toContain("opacity-grid");
  });

  test("It applies correct grid class for size type", () => {
    const tokens: Token[] = [{ name: "sz", type: "size", value: "16px" }];
    const html = new Generator({ dateFn: fixedDate, version: "test" }).generate(tokens);
    expect(html).toContain("size-grid");
  });

  test("It applies correct grid class for aspect-ratio type", () => {
    const tokens: Token[] = [{ name: "ar", type: "aspect-ratio", value: "4/3" }];
    const html = new Generator({ dateFn: fixedDate, version: "test" }).generate(tokens);
    expect(html).toContain("ratio-grid");
  });

  test("It applies correct grid class for border-radius type", () => {
    const tokens: Token[] = [{ name: "r", type: "border-radius", value: "4px" }];
    const html = new Generator({ dateFn: fixedDate, version: "test" }).generate(tokens);
    expect(html).toContain("radius-grid");
  });
});

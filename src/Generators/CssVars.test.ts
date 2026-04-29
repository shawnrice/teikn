import { describe, expect, test } from "bun:test";

import { group, tokens } from "../builders.js";
import { tokenSet1 } from "../fixtures/tokenSet1.js";
import type { Token } from "../Token.js";
import { BoxShadow } from "../TokenTypes/BoxShadow.js";
import { Color } from "../TokenTypes/Color/index.js";
import { CubicBezier } from "../TokenTypes/CubicBezier.js";
import { Duration } from "../TokenTypes/Duration.js";
import { Transition } from "../TokenTypes/Transition.js";
import { NameConventionPlugin } from "../Plugins/NameConventionPlugin.js";
import { CssVars as Generator } from "./CssVars.js";
import { testOpts } from "../fixtures/testOpts.js";

describe("CssVars Generator tests", () => {
  test("It has the correct filename", () => {
    expect(new Generator().file).toBe("tokens.css");
  });

  test("It generates the token set", () => {
    expect(new Generator(testOpts).generate(tokenSet1)).toMatchSnapshot();
  });

  test("It generates a basic token without usage", () => {
    const gen = new Generator(testOpts);
    const token: Token = { name: "primary", type: "color", value: "#0066cc" };
    expect(gen.generateToken(token)).toBe("  --primary: #0066cc;");
  });

  test("It includes usage as a CSS comment", () => {
    const gen = new Generator(testOpts);
    const token: Token = {
      name: "primary",
      type: "color",
      usage: "Primary brand color",
      value: "#0066cc",
    };
    const output = gen.generateToken(token);
    expect(output).toContain("/* Primary brand color */");
    expect(output).toContain("--primary: #0066cc;");
  });

  test("It generates themed tokens with modes", () => {
    const gen = new Generator(testOpts);
    const testTokens: Token[] = [
      { name: "bg", type: "color", value: "#ffffff", modes: { dark: "#1a1a1a" } },
      { name: "text", type: "color", value: "#000000", modes: { dark: "#eeeeee" } },
    ];
    const output = gen.generate(testTokens);
    expect(output).toContain(":root {");
    expect(output).toContain('[data-theme="dark"]');
    expect(output).toContain("--bg: #1a1a1a;");
    expect(output).toContain("--text: #eeeeee;");
    expect(output).toMatchSnapshot();
  });

  test("It applies a custom name transformer", () => {
    const gen = new Generator({
      ...testOpts,
      nameTransformer: (n: string) => n.toUpperCase(),
    });
    const token: Token = { name: "primary", type: "color", value: "#0066cc" };
    expect(gen.generateToken(token)).toContain("--PRIMARY:");
  });

  test("useMediaQuery emits @media block for dark mode", () => {
    const gen = new Generator({ ...testOpts, useMediaQuery: true });
    const testTokens: Token[] = [
      { name: "bg", type: "color", value: "#ffffff", modes: { dark: "#1a1a1a" } },
    ];
    const output = gen.generate(testTokens);
    expect(output).toContain('[data-theme="dark"]');
    expect(output).toContain("@media (prefers-color-scheme: dark)");
    expect(output).toContain("--bg: #1a1a1a;");
  });

  test("modeSelectors overrides default data-theme selector", () => {
    const gen = new Generator({
      ...testOpts,
      modeSelectors: { dark: ".dark" },
    });
    const testTokens: Token[] = [
      { name: "bg", type: "color", value: "#ffffff", modes: { dark: "#1a1a1a" } },
    ];
    const output = gen.generate(testTokens);
    expect(output).toContain(".dark {");
    expect(output).not.toContain('[data-theme="dark"]');
  });

  test("modeSelectors wraps at-rule strings in :root", () => {
    const gen = new Generator({
      ...testOpts,
      modeSelectors: { dark: "@media (prefers-color-scheme: dark)" },
    });
    const testTokens: Token[] = [
      { name: "bg", type: "color", value: "#ffffff", modes: { dark: "#1a1a1a" } },
    ];
    const output = gen.generate(testTokens);
    expect(output).toContain("@media (prefers-color-scheme: dark) {");
    expect(output).toContain("  :root {");
    expect(output).toContain("    --bg: #1a1a1a;");
    expect(output).toMatchSnapshot();
  });

  test("modeSelectors object form uses custom selector inside at-rule", () => {
    const gen = new Generator({
      ...testOpts,
      modeSelectors: {
        dark: { atRule: "@media (prefers-color-scheme: dark)", selector: ".app" },
      },
    });
    const testTokens: Token[] = [
      { name: "bg", type: "color", value: "#ffffff", modes: { dark: "#1a1a1a" } },
    ];
    const output = gen.generate(testTokens);
    expect(output).toContain("@media (prefers-color-scheme: dark) {");
    expect(output).toContain("  .app {");
    expect(output).toContain("    --bg: #1a1a1a;");
    expect(output).toMatchSnapshot();
  });

  test("modeSelectors object form defaults selector to :root", () => {
    const gen = new Generator({
      ...testOpts,
      modeSelectors: {
        dark: { atRule: "@media (prefers-color-scheme: dark)" },
      },
    });
    const testTokens: Token[] = [
      { name: "bg", type: "color", value: "#ffffff", modes: { dark: "#1a1a1a" } },
    ];
    const output = gen.generate(testTokens);
    expect(output).toContain("@media (prefers-color-scheme: dark) {");
    expect(output).toContain("  :root {");
    expect(output).toContain("    --bg: #1a1a1a;");
  });

  test("modeSelectors handles mix of selectors and at-rules", () => {
    const gen = new Generator({
      ...testOpts,
      modeSelectors: {
        dark: "@media (prefers-color-scheme: dark)",
        contrast: ".high-contrast",
      },
    });
    const testTokens: Token[] = [
      {
        name: "bg",
        type: "color",
        value: "#ffffff",
        modes: { dark: "#1a1a1a", contrast: "#000000" },
      },
    ];
    const output = gen.generate(testTokens);
    // at-rule gets :root wrapper
    expect(output).toContain("@media (prefers-color-scheme: dark) {");
    expect(output).toContain("  :root {");
    // plain selector stays flat
    expect(output).toContain(".high-contrast {");
    expect(output).toMatchSnapshot();
  });

  test("Transition references duration and timing tokens by var()", () => {
    const durations = group("duration", { "duration-fast": new Duration(100, "ms") });
    const easings = group("timing", { "timing-standard": CubicBezier.standard });
    const transitions = group("transition", {
      "transition-fade": new Transition(durations["duration-fast"], easings["timing-standard"]),
    });

    const gen = new Generator(testOpts);
    const output = gen.generate(tokens(durations, easings, transitions));

    expect(output).toContain("--duration-fast: 100ms;");
    expect(output).toContain("--timing-standard: cubic-bezier(0.4, 0, 0.2, 1);");
    expect(output).toContain("--transition-fade: var(--duration-fast) var(--timing-standard);");
  });

  test("references reflect plugin renames (NameConventionPlugin)", () => {
    // Regression: refMap was previously built from pre-plugin token names.
    // For CssVars the bug was masked when the user's plugin convention matched
    // the generator's nameTransformer (kebab); the snake_case case below
    // exercises the post-plugin name being something the nameTransformer then
    // re-kebabs — definition and reference must agree.
    const easeOut = new CubicBezier("ease-out");
    const tokenList: Token[] = [
      { name: "easeOut", type: "timing", value: easeOut },
      { name: "fast", type: "transition", value: new Transition("150ms", easeOut) },
    ];

    const gen = new Generator(testOpts);
    const output = gen.generate(tokenList, [
      new NameConventionPlugin({ convention: "snake_case" }),
    ]);

    // snake_case (plugin) → kebab (CssVars nameTransformer)
    expect(output).toContain("--ease-out: cubic-bezier(0, 0, 0.58, 1);");
    expect(output).toContain("--fast: 150ms var(--ease-out);");
  });

  test("Transition only references tokens that exist in the token set", () => {
    const fast = new Duration(100, "ms");
    // fast is NOT registered as a token — only used in the transition
    const transitions = group("transition", {
      fade: new Transition(fast, "ease"),
    });

    const gen = new Generator(testOpts);
    const output = gen.generate(tokens(transitions));

    // No reference available, so inline the value
    expect(output).toContain("--fade: 100ms ease;");
  });

  test("Transition with partial references inlines non-token components", () => {
    const durations = group("duration", { "duration-fast": new Duration(100, "ms") });
    const transitions = group("transition", {
      "transition-fade": new Transition(durations["duration-fast"], "ease"),
    });

    const gen = new Generator(testOpts);
    const output = gen.generate(tokens(durations, transitions));

    // Duration is a reference, but timing is not a token
    expect(output).toContain("--transition-fade: var(--duration-fast) ease;");
  });

  test("BoxShadow references a color token by var()", () => {
    const colors = group("color", { "color-shadow": new Color(0, 0, 0, 0.12) });
    const shadows = group("shadow", {
      "shadow-sm": new BoxShadow({ offsetY: 1, blur: 2, color: colors["color-shadow"] }),
    });

    const gen = new Generator(testOpts);
    const output = gen.generate(tokens(colors, shadows));

    expect(output).toContain("--shadow-sm: 0 1px 2px var(--color-shadow);");
  });

  test("same value object in multiple tokens references the first-registered name", () => {
    const fast = new Duration(100, "ms");
    const durations = group("duration", { alpha: fast, bravo: fast });
    const transitions = group("transition", {
      fade: new Transition(fast, "ease"),
    });

    const gen = new Generator(testOpts);
    const output = gen.generate(tokens(durations, transitions));

    // First-wins: alpha was registered first
    expect(output).toContain("var(--alpha)");
    expect(output).not.toContain("var(--bravo)");
  });

  describe("prefix option", () => {
    test("scalar prefix prepends to every variable name", () => {
      const t: Token[] = [{ name: "colorPrimary", type: "color", value: "aliceblue" }];
      const output = new Generator({ ...testOpts, prefix: "company" }).generate(t);
      expect(output).toContain("--company-color-primary: aliceblue;");
      expect(output).not.toContain("--color-primary:");
    });

    test("array prefix stacks segments left-to-right", () => {
      const t: Token[] = [{ name: "colorPrimary", type: "color", value: "aliceblue" }];
      const output = new Generator({ ...testOpts, prefix: ["company", "abc"] }).generate(t);
      expect(output).toContain("--company-abc-color-primary: aliceblue;");
    });

    test("prefix segments run through nameTransformer (camelCase input is kebabed)", () => {
      const t: Token[] = [{ name: "colorPrimary", type: "color", value: "aliceblue" }];
      const output = new Generator({ ...testOpts, prefix: "myCompany" }).generate(t);
      expect(output).toContain("--my-company-color-primary: aliceblue;");
    });

    test("references between tokens use the prefixed name", () => {
      const fast = new Duration(100, "ms");
      const durations = group("duration", { "duration-fast": fast });
      const easings = group("timing", { "timing-standard": CubicBezier.standard });
      const transitions: Token[] = [
        {
          name: "transitionFade",
          type: "transition",
          value: new Transition(durations["duration-fast"], easings["timing-standard"]),
        },
      ];
      const output = new Generator({ ...testOpts, prefix: "company" }).generate(
        tokens(durations, easings, transitions),
      );
      expect(output).toContain("--company-transition-fade:");
      // The Transition's reference to duration-fast must also pick up the prefix.
      expect(output).toContain("var(--company-duration-fast)");
      expect(output).toContain("var(--company-timing-standard)");
    });

    test("mode variables also pick up the prefix", () => {
      const t: Token[] = [
        {
          name: "colorPrimary",
          type: "color",
          value: "aliceblue",
          modes: { dark: "midnightblue" },
        },
      ];
      const output = new Generator({ ...testOpts, prefix: "company" }).generate(t);
      expect(output).toContain("--company-color-primary: midnightblue;");
    });

    test("custom separator joins segments and the name", () => {
      const t: Token[] = [{ name: "colorPrimary", type: "color", value: "aliceblue" }];
      const output = new Generator({
        ...testOpts,
        prefix: ["co", "abc"],
        separator: "_",
      }).generate(t);
      expect(output).toContain("--co_abc_color-primary: aliceblue;");
    });
  });

  test("Transition in a mode still resolves references", () => {
    const fast = new Duration(100, "ms");
    const slow = new Duration(300, "ms");
    const durations = group("duration", { "duration-fast": fast, "duration-slow": slow });
    const easings = group("timing", { "timing-standard": CubicBezier.standard });
    const transitions: Token[] = [
      {
        name: "transition-fade",
        type: "transition",
        value: new Transition(durations["duration-fast"], easings["timing-standard"]),
        modes: {
          reduced: new Transition(durations["duration-slow"], easings["timing-standard"]),
        },
      },
    ];

    const gen = new Generator(testOpts);
    const output = gen.generate(tokens(durations, easings, transitions));

    // Base value uses references
    expect(output).toContain("--transition-fade: var(--duration-fast) var(--timing-standard);");
    // Mode value also uses references
    expect(output).toContain("var(--duration-slow)");
  });
});

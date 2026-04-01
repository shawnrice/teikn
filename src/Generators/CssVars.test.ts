import { describe, expect, test } from "bun:test";

import { group, tokens } from "../builders";
import { tokenSet1 } from "../fixtures/tokenSet1";
import type { Token } from "../Token";
import { BoxShadow } from "../TokenTypes/BoxShadow";
import { Color } from "../TokenTypes/Color";
import { CubicBezier } from "../TokenTypes/CubicBezier";
import { Duration } from "../TokenTypes/Duration";
import { Transition } from "../TokenTypes/Transition";
import { CssVars as Generator } from "./CssVars";
import { testOpts } from "../fixtures/testOpts";

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
    const tokens: Token[] = [
      { name: "bg", type: "color", value: "#ffffff", modes: { dark: "#1a1a1a" } },
      { name: "text", type: "color", value: "#000000", modes: { dark: "#eeeeee" } },
    ];
    const output = gen.generate(tokens);
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
    const tokens: Token[] = [
      { name: "bg", type: "color", value: "#ffffff", modes: { dark: "#1a1a1a" } },
    ];
    const output = gen.generate(tokens);
    expect(output).toContain('[data-theme="dark"]');
    expect(output).toContain("@media (prefers-color-scheme: dark)");
    expect(output).toContain("--bg: #1a1a1a;");
  });

  test("modeSelectors overrides default data-theme selector", () => {
    const gen = new Generator({
      ...testOpts,
      modeSelectors: { dark: ".dark" },
    });
    const tokens: Token[] = [
      { name: "bg", type: "color", value: "#ffffff", modes: { dark: "#1a1a1a" } },
    ];
    const output = gen.generate(tokens);
    expect(output).toContain(".dark {");
    expect(output).not.toContain('[data-theme="dark"]');
  });

  test("modeSelectors wraps at-rule strings in :root", () => {
    const gen = new Generator({
      ...testOpts,
      modeSelectors: { dark: "@media (prefers-color-scheme: dark)" },
    });
    const tokens: Token[] = [
      { name: "bg", type: "color", value: "#ffffff", modes: { dark: "#1a1a1a" } },
    ];
    const output = gen.generate(tokens);
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
    const tokens: Token[] = [
      { name: "bg", type: "color", value: "#ffffff", modes: { dark: "#1a1a1a" } },
    ];
    const output = gen.generate(tokens);
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
    const tokens: Token[] = [
      { name: "bg", type: "color", value: "#ffffff", modes: { dark: "#1a1a1a" } },
    ];
    const output = gen.generate(tokens);
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
    const tokens: Token[] = [
      {
        name: "bg",
        type: "color",
        value: "#ffffff",
        modes: { dark: "#1a1a1a", contrast: "#000000" },
      },
    ];
    const output = gen.generate(tokens);
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
});

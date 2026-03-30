import { describe, expect, test } from "bun:test";

import { tokenSet1 } from "../fixtures/tokenSet1";
import type { Token } from "../Token";
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
});

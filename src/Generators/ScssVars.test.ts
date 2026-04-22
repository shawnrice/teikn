import { describe, expect, test } from "bun:test";

import { group, tokens } from "../builders";
import { tokenSet1 } from "../fixtures/tokenSet1";
import type { Token } from "../Token";
import { BoxShadow } from "../TokenTypes/BoxShadow";
import { Color } from "../TokenTypes/Color";
import { CubicBezier } from "../TokenTypes/CubicBezier";
import { Duration } from "../TokenTypes/Duration";
import { Transition } from "../TokenTypes/Transition";
import { ScssVars as Generator } from "./ScssVars";
import { testOpts } from "../fixtures/testOpts";

describe("SCSS Vars Generator tests", () => {
  test("It has the correct filename", () => {
    expect(new Generator().file).toBe("tokens.scss");
  });

  test("It generates the token set", () => {
    expect(new Generator(testOpts).generate(tokenSet1)).toMatchSnapshot();
  });

  test("it generates group maps and functions when groups: true", () => {
    const testTokens: Token[] = [
      { name: "colorPrimary", type: "color", value: "aliceblue" },
      { name: "colorSecondary", type: "color", value: "rgb(102, 205, 170)" },
      { name: "spacingSm", type: "spacing", value: "4px" },
    ];
    expect(new Generator({ ...testOpts, groups: true }).generate(testTokens)).toMatchSnapshot();
  });

  test("describe() returns format SCSS Variables", () => {
    const gen = new Generator();
    const desc = gen.describe();
    expect(desc.format).toBe("SCSS Variables");
    expect(desc.usage).toContain("$tokenName");
  });

  test("describe() with groups: true includes group accessor usage", () => {
    const gen = new Generator({ groups: true });
    const desc = gen.describe();
    expect(desc.usage).toContain("color('primary')");
  });

  test("tokenUsage() returns $tokenName for normal mode", () => {
    const gen = new Generator();
    const token: Token = { name: "colorPrimary", type: "color", value: "#fff" };
    expect(gen.tokenUsage(token)).toBe("$colorPrimary");
  });

  test("tokenUsage() with groups: true returns kebab-case group accessor", () => {
    const gen = new Generator({ groups: true });
    const token: Token = { name: "colorPrimary", type: "color", value: "#fff" };
    expect(gen.tokenUsage(token)).toBe("color('primary')");
  });

  test("generateToken with border composite value produces CSS shorthand", () => {
    const gen = new Generator();
    const token: Token = {
      name: "borderDefault",
      type: "border",
      value: { width: "1px", style: "solid", color: "#000" },
    };
    const result = gen.generateToken(token);
    expect(result).toContain("1px solid #000");
    expect(result).not.toContain("[object Object]");
  });

  test("generateToken with a generic composite value emits JSON", () => {
    // Unknown-shape composites (anything other than border) are now
    // serialized as JSON so they're clearly not-a-CSS-shorthand at a
    // glance, rather than field-order-dependent `Object.values().join(" ")`
    // which accidentally matched no real CSS shorthand for any shape.
    const gen = new Generator();
    const token: Token = {
      name: "typographyBody",
      type: "typography",
      value: { fontFamily: "Arial", fontSize: "1rem" },
    };
    const result = gen.generateToken(token);
    expect(result).toContain('{"fontFamily":"Arial","fontSize":"1rem"}');
  });

  test("generateToken includes usage comment when present", () => {
    const gen = new Generator();
    const token: Token = {
      name: "primary",
      type: "color",
      value: "#fff",
      usage: "Main brand color",
    };
    const result = gen.generateToken(token);
    expect(result).toContain("/// Main brand color");
    expect(result).toContain("$primary: #fff;");
  });

  test("footer() returns null", () => {
    const gen = new Generator();
    expect(gen.footer()).toBeNull();
  });

  test("it emits mode-namespaced variables when tokens have modes", () => {
    const testTokens: Token[] = [
      { name: "colorSurface", type: "color", value: "#ffffff", modes: { dark: "#1a1a1a" } },
      { name: "colorText", type: "color", value: "#000000", modes: { dark: "#e0e0e0" } },
      { name: "spacingSm", type: "spacing", value: "4px" },
    ];
    const output = new Generator(testOpts).generate(testTokens);

    expect(output).toContain("// Mode: dark");
    expect(output).toContain("$colorSurface--dark: #1a1a1a;");
    expect(output).toContain("$colorText--dark: #e0e0e0;");
  });

  test("it does not emit mode variables when no tokens have modes", () => {
    const testTokens: Token[] = [{ name: "colorPrimary", type: "color", value: "#ff0000" }];
    const output = new Generator(testOpts).generate(testTokens);

    expect(output).not.toContain("// Mode:");
    expect(output).not.toContain("--");
  });

  test("it handles multiple modes", () => {
    const testTokens: Token[] = [
      { name: "colorSurface", type: "color", value: "#fff", modes: { dark: "#111", dim: "#333" } },
    ];
    const output = new Generator(testOpts).generate(testTokens);

    expect(output).toContain("// Mode: dark");
    expect(output).toContain("$colorSurface--dark: #111;");
    expect(output).toContain("// Mode: dim");
    expect(output).toContain("$colorSurface--dim: #333;");
  });

  test("topologically sorts tokens so dependencies come first", () => {
    const durations = group("duration", { "duration-fast": new Duration(100, "ms") });
    const easings = group("timing", { "timing-standard": CubicBezier.standard });
    const transitions = group("transition", {
      "transition-fade": new Transition(durations["duration-fast"], easings["timing-standard"]),
    });

    // Intentionally reversed — transitions before their dependencies
    const gen = new Generator(testOpts);
    const output = gen.generate(tokens(transitions, easings, durations));

    const fadeIdx = output.indexOf("$transition-fade:");
    const fastIdx = output.indexOf("$duration-fast:");
    const standardIdx = output.indexOf("$timing-standard:");

    // Dependencies must appear before the token that references them
    expect(fastIdx).toBeLessThan(fadeIdx);
    expect(standardIdx).toBeLessThan(fadeIdx);
  });

  test("Transition references duration and timing tokens by $variable", () => {
    const durations = group("duration", { "duration-fast": new Duration(100, "ms") });
    const easings = group("timing", { "timing-standard": CubicBezier.standard });
    const transitions = group("transition", {
      "transition-fade": new Transition(durations["duration-fast"], easings["timing-standard"]),
    });

    const gen = new Generator(testOpts);
    const output = gen.generate(tokens(durations, easings, transitions));

    expect(output).toContain("$duration-fast: 100ms;");
    expect(output).toContain("$timing-standard: cubic-bezier(0.4, 0, 0.2, 1);");
    expect(output).toContain("$transition-fade: $duration-fast $timing-standard;");
  });

  test("tokens without references preserve original order", () => {
    const a = group("color", { alpha: "#aaa" });
    const b = group("color", { bravo: "#bbb" });
    const gen = new Generator(testOpts);
    const output = gen.generate(tokens(a, b));
    expect(output.indexOf("$alpha:")).toBeLessThan(output.indexOf("$bravo:"));
  });

  test("transition referencing non-token values does not crash topoSort", () => {
    const standalone = new Duration(100, "ms");
    const transitions = group("transition", {
      fade: new Transition(standalone, "ease"),
    });
    const gen = new Generator(testOpts);
    expect(() => gen.generate(tokens(transitions))).not.toThrow();
  });

  test("BoxShadow references a color token by $variable", () => {
    const colors = group("color", { "color-shadow": new Color(0, 0, 0, 0.12) });
    const shadows = group("shadow", {
      "shadow-sm": new BoxShadow({ offsetY: 1, blur: 2, color: colors["color-shadow"] }),
    });
    const gen = new Generator(testOpts);
    const output = gen.generate(tokens(colors, shadows));
    expect(output).toContain("$shadow-sm: 0 1px 2px $color-shadow;");
  });
});

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
import { ScssVars as Generator } from "./ScssVars.js";
import { testOpts } from "../fixtures/testOpts.js";

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

  test("generateToken with a generic composite value produces space-separated values", () => {
    // cssValue emits composite shapes as space-joined values for use in
    // CSS shorthand contexts (`font:` etc.). The ScssVars output is an
    // SCSS variable declaration, not a map-entry, so an internal comma
    // won't collide with map parsing — this generator doesn't need the
    // paren-wrapping that Scss does.
    const gen = new Generator();
    const token: Token = {
      name: "typographyBody",
      type: "typography",
      value: { fontFamily: "Arial", fontSize: "1rem" },
    };
    const result = gen.generateToken(token);
    expect(result).toContain("Arial 1rem");
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
    expect(output).toContain("$colorSurface-dark: #1a1a1a;");
    expect(output).toContain("$colorText-dark: #e0e0e0;");
  });

  test("it does not emit mode variables when no tokens have modes", () => {
    const testTokens: Token[] = [{ name: "colorPrimary", type: "color", value: "#ff0000" }];
    const output = new Generator(testOpts).generate(testTokens);

    expect(output).not.toContain("// Mode:");
  });

  test("it handles multiple modes", () => {
    const testTokens: Token[] = [
      { name: "colorSurface", type: "color", value: "#fff", modes: { dark: "#111", dim: "#333" } },
    ];
    const output = new Generator(testOpts).generate(testTokens);

    expect(output).toContain("// Mode: dark");
    expect(output).toContain("$colorSurface-dark: #111;");
    expect(output).toContain("// Mode: dim");
    expect(output).toContain("$colorSurface-dim: #333;");
  });

  test("mode separator follows the configured separator option", () => {
    const testTokens: Token[] = [
      { name: "colorSurface", type: "color", value: "#fff", modes: { dark: "#111" } },
    ];
    const output = new Generator({ ...testOpts, separator: "_" }).generate(testTokens);
    expect(output).toContain("$colorSurface_dark: #111;");
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

  test("references reflect plugin renames (NameConventionPlugin)", () => {
    // Regression: refMap was previously built from pre-plugin token names, so
    // a camelCase token name + kebab-case plugin produced `$easeOut` inside
    // composed values while the variable definition correctly emitted as
    // `$ease-out` — broken cross-reference.
    const easeOut = new CubicBezier("ease-out");
    const tokenList: Token[] = [
      { name: "easeOut", type: "timing", value: easeOut },
      { name: "fast", type: "transition", value: new Transition("150ms", easeOut) },
    ];

    const gen = new Generator(testOpts);
    const output = gen.generate(tokenList, [
      new NameConventionPlugin({ convention: "kebab-case" }),
    ]);

    expect(output).toContain("$ease-out: cubic-bezier(0, 0, 0.58, 1);");
    expect(output).toContain("$fast: 150ms $ease-out;");
    expect(output).not.toContain("$easeOut");
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

  describe("prefix option", () => {
    test("scalar prefix prepends to every variable name", () => {
      const t: Token[] = [{ name: "color-primary", type: "color", value: "aliceblue" }];
      const output = new Generator({ ...testOpts, prefix: "company" }).generate(t);
      expect(output).toContain("$company-color-primary: aliceblue;");
    });

    test("array prefix stacks segments left-to-right", () => {
      const t: Token[] = [{ name: "color-primary", type: "color", value: "aliceblue" }];
      const output = new Generator({ ...testOpts, prefix: ["company", "abc"] }).generate(t);
      expect(output).toContain("$company-abc-color-primary: aliceblue;");
    });

    test("references between tokens use the prefixed name", () => {
      const fast = new Duration(100, "ms");
      const durations = group("duration", { "duration-fast": fast });
      const easings = group("timing", { "timing-standard": CubicBezier.standard });
      const transitions: Token[] = [
        {
          name: "transition-fade",
          type: "transition",
          value: new Transition(durations["duration-fast"], easings["timing-standard"]),
        },
      ];
      const output = new Generator({ ...testOpts, prefix: "company" }).generate(
        tokens(durations, easings, transitions),
      );
      expect(output).toContain("$company-transition-fade:");
      expect(output).toContain("$company-duration-fast");
      expect(output).toContain("$company-timing-standard");
    });

    test("group accessors look up by short-name and resolve to prefixed variables", () => {
      const t: Token[] = [
        { name: "color-primary", type: "color", value: "aliceblue" },
        { name: "color-secondary", type: "color", value: "rgb(102, 205, 170)" },
      ];
      const output = new Generator({ ...testOpts, groups: true, prefix: "company" }).generate(t);
      expect(output).toContain("$company-color-primary: aliceblue;");
      // The accessor maps the authored short-name onto the prefixed variable.
      expect(output).toContain("primary: $company-color-primary");
      expect(output).toContain("@function color($name)");
    });

    test("mode variables also pick up the prefix", () => {
      const t: Token[] = [
        {
          name: "color-primary",
          type: "color",
          value: "aliceblue",
          modes: { dark: "midnightblue" },
        },
      ];
      const output = new Generator({ ...testOpts, prefix: "company" }).generate(t);
      expect(output).toContain("$company-color-primary-dark: midnightblue;");
    });
  });
});

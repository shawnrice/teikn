import { describe, expect, test } from "bun:test";

import { Color } from "../TokenTypes/Color/index.js";
import { BoxShadow } from "../TokenTypes/BoxShadow.js";
import { CubicBezier } from "../TokenTypes/CubicBezier.js";
import { Transition } from "../TokenTypes/Transition.js";
import { LinearGradient } from "../TokenTypes/Gradient.js";
import { ColorTransformPlugin } from "../Plugins/ColorTransformPlugin.js";
import type { Token } from "../Token.js";
import { CssVars } from "./CssVars.js";
import { Scss } from "./Scss.js";
import { ScssVars } from "./ScssVars.js";
import { JavaScript } from "./JavaScript.js";
import { Json } from "./Json.js";
import { testOpts } from "../fixtures/testOpts.js";

// ─── Helpers ─────────────────────────────────────────────────

const opts = testOpts;

const colorToken = (modes: Record<string, unknown>): Token[] => [
  { name: "surface", type: "color", value: "#ffffff", modes },
];

// ─── No [object Object] in any generator ─────────────────────

describe("mode values must not produce [object Object]", () => {
  const objectString = "[object Object]";

  const colorModes = { dark: new Color("#1a1a1a") };

  test("CssVars stringifies Color in modes", () => {
    const output = new CssVars(opts).generate(colorToken(colorModes));
    expect(output).not.toContain(objectString);
    expect(output).toContain("--surface:");
  });

  test("Scss stringifies Color in modes", () => {
    const output = new Scss(opts).generate(colorToken(colorModes));
    expect(output).not.toContain(objectString);
  });

  test("ScssVars stringifies Color in modes", () => {
    const output = new ScssVars(opts).generate(colorToken(colorModes));
    expect(output).not.toContain(objectString);
  });

  test("JavaScript (ESM) stringifies Color in modes", () => {
    const output = new JavaScript(opts).generate(colorToken(colorModes));
    expect(output).not.toContain(objectString);
  });

  test("JavaScript (CJS) stringifies Color in modes", () => {
    const output = new JavaScript({ ...opts, module: "cjs" }).generate(colorToken(colorModes));
    expect(output).not.toContain(objectString);
  });

  test("Json stringifies Color in modes", () => {
    const output = new Json().generate(colorToken(colorModes));
    expect(output).not.toContain(objectString);
  });

  test("CssVars stringifies BoxShadow in modes", () => {
    const token: Token[] = [
      {
        name: "elevation",
        type: "shadow",
        value: new BoxShadow(0, 1, 2, 0, "rgba(0,0,0,.1)"),
        modes: { high: new BoxShadow(0, 4, 16, 0, "rgba(0,0,0,.2)") },
      },
    ];
    const output = new CssVars(opts).generate(token);
    expect(output).not.toContain(objectString);
  });

  test("CssVars stringifies CubicBezier in modes", () => {
    const token: Token[] = [
      {
        name: "ease",
        type: "timing",
        value: CubicBezier.standard,
        modes: { reduced: CubicBezier.linear },
      },
    ];
    const output = new CssVars(opts).generate(token);
    expect(output).not.toContain(objectString);
  });

  test("CssVars stringifies Transition in modes", () => {
    const token: Token[] = [
      {
        name: "fade",
        type: "transition",
        value: Transition.fade,
        modes: { reduced: Transition.quick },
      },
    ];
    const output = new CssVars(opts).generate(token);
    expect(output).not.toContain(objectString);
  });

  test("CssVars stringifies LinearGradient in modes", () => {
    const token: Token[] = [
      {
        name: "brand",
        type: "gradient",
        value: new LinearGradient(90, [
          ["#ff0000", "0%"],
          ["#0000ff", "100%"],
        ]),
        modes: {
          dark: new LinearGradient(90, [
            ["#330000", "0%"],
            ["#000033", "100%"],
          ]),
        },
      },
    ];
    const output = new CssVars(opts).generate(token);
    expect(output).not.toContain(objectString);
  });
});

// ─── Plugins must run on mode values ────────────────────────

describe("plugins must transform mode values", () => {
  test("ColorTransformPlugin converts mode Color values to rgba", () => {
    const tokens: Token[] = [
      {
        name: "surface",
        type: "color",
        value: "steelblue",
        modes: { dark: "crimson" },
      },
    ];
    const output = new CssVars(opts).generate(tokens, [new ColorTransformPlugin({ type: "rgba" })]);

    // Base value should be rgba
    expect(output).toContain("rgba(");
    // Mode value should also be rgba, not the raw color name
    expect(output).not.toContain("crimson");
  });

  test("ColorTransformPlugin converts mode values in Scss", () => {
    const tokens: Token[] = [
      {
        name: "surface",
        type: "color",
        value: "steelblue",
        modes: { dark: "crimson" },
      },
    ];
    const output = new Scss(opts).generate(tokens, [new ColorTransformPlugin({ type: "rgba" })]);

    expect(output).not.toContain("crimson");
  });

  test("ColorTransformPlugin converts mode values in JavaScript (ESM)", () => {
    const tokens: Token[] = [
      {
        name: "surface",
        type: "color",
        value: "steelblue",
        modes: { dark: "crimson" },
      },
    ];
    const output = new JavaScript(opts).generate(tokens, [
      new ColorTransformPlugin({ type: "rgba" }),
    ]);

    expect(output).not.toContain("crimson");
  });

  test("ColorTransformPlugin converts mode values in Json", () => {
    const tokens: Token[] = [
      {
        name: "surface",
        type: "color",
        value: "steelblue",
        modes: { dark: "crimson" },
      },
    ];
    const output = new Json().generate(tokens, [new ColorTransformPlugin({ type: "rgba" })]);
    const json = JSON.parse(output);

    expect(json.surface.modes.dark).toContain("rgba(");
  });
});

import { describe, expect, test } from "bun:test";

import { Color } from "../TokenTypes/Color";
import { BoxShadow } from "../TokenTypes/BoxShadow";
import { CubicBezier } from "../TokenTypes/CubicBezier";
import { Transition } from "../TokenTypes/Transition";
import { LinearGradient } from "../TokenTypes/Gradient";
import { ColorTransformPlugin } from "../Plugins/ColorTransformPlugin";
import type { Token } from "../Token";
import { CSSVars } from "./CSSVars";
import { Scss } from "./Scss";
import { ScssVars } from "./ScssVars";
import { ESModule } from "./ESModule";
import { JavaScript } from "./JavaScript";
import { Json } from "./Json";

// ─── Helpers ─────────────────────────────────────────────────

const opts = { dateFn: () => "null", version: "test" };

const colorToken = (modes: Record<string, unknown>): Token[] => [
  { name: "surface", type: "color", value: "#ffffff", modes },
];

// ─── No [object Object] in any generator ─────────────────────

describe("mode values must not produce [object Object]", () => {
  const objectString = "[object Object]";

  const colorModes = { dark: new Color("#1a1a1a") };

  test("CSSVars stringifies Color in modes", () => {
    const output = new CSSVars(opts).generate(colorToken(colorModes));
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

  test("ESModule stringifies Color in modes", () => {
    const output = new ESModule(opts).generate(colorToken(colorModes));
    expect(output).not.toContain(objectString);
  });

  test("JavaScript stringifies Color in modes", () => {
    const output = new JavaScript(opts).generate(colorToken(colorModes));
    expect(output).not.toContain(objectString);
  });

  test("Json stringifies Color in modes", () => {
    const output = new Json().generate(colorToken(colorModes));
    expect(output).not.toContain(objectString);
  });

  test("CSSVars stringifies BoxShadow in modes", () => {
    const token: Token[] = [
      {
        name: "elevation",
        type: "shadow",
        value: new BoxShadow(0, 1, 2, 0, "rgba(0,0,0,.1)"),
        modes: { high: new BoxShadow(0, 4, 16, 0, "rgba(0,0,0,.2)") },
      },
    ];
    const output = new CSSVars(opts).generate(token);
    expect(output).not.toContain(objectString);
  });

  test("CSSVars stringifies CubicBezier in modes", () => {
    const token: Token[] = [
      {
        name: "ease",
        type: "timing",
        value: CubicBezier.standard,
        modes: { reduced: CubicBezier.linear },
      },
    ];
    const output = new CSSVars(opts).generate(token);
    expect(output).not.toContain(objectString);
  });

  test("CSSVars stringifies Transition in modes", () => {
    const token: Token[] = [
      {
        name: "fade",
        type: "transition",
        value: Transition.fade,
        modes: { reduced: Transition.quick },
      },
    ];
    const output = new CSSVars(opts).generate(token);
    expect(output).not.toContain(objectString);
  });

  test("CSSVars stringifies LinearGradient in modes", () => {
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
    const output = new CSSVars(opts).generate(token);
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
    const output = new CSSVars(opts).generate(tokens, [new ColorTransformPlugin({ type: "rgba" })]);

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

  test("ColorTransformPlugin converts mode values in ESModule", () => {
    const tokens: Token[] = [
      {
        name: "surface",
        type: "color",
        value: "steelblue",
        modes: { dark: "crimson" },
      },
    ];
    const output = new ESModule(opts).generate(tokens, [
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

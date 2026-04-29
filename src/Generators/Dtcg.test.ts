import { describe, expect, test } from "bun:test";

import { AlphaMultiplyPlugin, ColorTransformPlugin } from "../Plugins/index.js";
import type { Token } from "../Token.js";
import { Color } from "../TokenTypes/Color/index.js";
import { CubicBezier } from "../TokenTypes/CubicBezier.js";
import { Dimension } from "../TokenTypes/Dimension.js";
import { DtcgGenerator } from "./Dtcg.js";

const sampleTokens: Token[] = [
  {
    name: "color.primary",
    value: new Color(255, 0, 0),
    type: "color",
    usage: "Primary brand color",
  },
  { name: "color.secondary", value: new Color(0, 0, 255), type: "color" },
  { name: "spacing.sm", value: "8px", type: "spacing" },
  { name: "spacing.md", value: "16px", type: "spacing" },
  { name: "timing.ease", value: new CubicBezier(0.42, 0, 0.58, 1), type: "timing" },
  { name: "font.body", value: "Arial, sans-serif", type: "font-family" },
  { name: "opacity.muted", value: 0.5, type: "opacity" },
];

describe("DtcgGenerator tests", () => {
  test("produces valid JSON", () => {
    const gen = new DtcgGenerator();
    const output = gen.generate(sampleTokens);
    expect(() => JSON.parse(output)).not.toThrow();
  });

  test("file extension is .tokens.json", () => {
    const gen = new DtcgGenerator();
    expect(gen.file).toBe("tokens.tokens.json");
  });

  test("custom filename works", () => {
    const gen = new DtcgGenerator({ filename: "design" });
    expect(gen.file).toBe("design.tokens.json");
  });

  test("describe() returns correct info", () => {
    const gen = new DtcgGenerator();
    const info = gen.describe();
    expect(info!.format).toBe("DTCG");
    expect(info!.usage).toContain("DTCG");
  });

  test("tokenUsage returns null", () => {
    const gen = new DtcgGenerator();
    expect(gen.tokenUsage(sampleTokens[0]!)).toBeNull();
  });

  test("snapshot test with standard token set", () => {
    const gen = new DtcgGenerator();
    expect(gen.generate(sampleTokens)).toMatchSnapshot();
  });

  test("hierarchical output reconstructs groups", () => {
    const gen = new DtcgGenerator({ hierarchical: true });
    const output = JSON.parse(gen.generate(sampleTokens));
    expect(output.color).toBeDefined();
    expect(output.color.primary).toBeDefined();
    expect(output.spacing).toBeDefined();
  });

  test("flat output mode", () => {
    const gen = new DtcgGenerator({ hierarchical: false });
    const output = JSON.parse(gen.generate(sampleTokens));
    expect(output["color.primary"]).toBeDefined();
    expect(output["spacing.sm"]).toBeDefined();
    expect(output.color).toBeUndefined();
  });

  test("custom separator", () => {
    const tokens: Token[] = [
      { name: "color/primary", value: new Color(255, 0, 0), type: "color" },
      { name: "color/secondary", value: new Color(0, 0, 255), type: "color" },
    ];
    const gen = new DtcgGenerator({ separator: "/" });
    const output = JSON.parse(gen.generate(tokens));
    expect(output.color).toBeDefined();
    expect(output.color.primary).toBeDefined();
  });

  test("tokens with modes include $extensions.mode", () => {
    const tokens: Token[] = [
      {
        name: "surface",
        value: new Color(255, 255, 255),
        type: "color",
        modes: { dark: new Color(26, 26, 26) },
      },
    ];
    const gen = new DtcgGenerator();
    const output = JSON.parse(gen.generate(tokens));
    expect(output.surface.$extensions).toBeDefined();
    expect(output.surface.$extensions.mode.dark).toBeDefined();
    expect(output.surface.$extensions.mode.dark.colorSpace).toBe("srgb");
  });

  test("runs plugins and preserves first-class value instances through the pipeline", () => {
    // Dtcg is the only generator that overrides prepareTokens (to skip
    // stringifyValues so first-class values reach the serializer as
    // instances). Confirm it still runs plugins in the right order AND
    // keeps a Dimension as a `{value, unit}` object in the output.
    const tokens: Token[] = [
      { name: "primary", type: "color", value: new Color(255, 0, 0, 0.5) },
      { name: "spacing", type: "dimension", value: new Dimension(16, "px") },
    ];

    // AlphaMultiplyPlugin flattens alpha to 1. ColorTransformPlugin
    // might further convert to rgba. Passing them in reverse order
    // verifies runAfter sorting fires correctly.
    const gen = new DtcgGenerator();
    const plugins = [
      new ColorTransformPlugin({ type: "rgba" }),
      new AlphaMultiplyPlugin({ factor: 2 }),
    ];

    const output = JSON.parse(gen.generate(tokens, plugins));

    // First-class Dimension survives as the DTCG dimension shape.
    expect(output.spacing.$value).toEqual({ value: 16, unit: "px" });
    expect(output.spacing.$type).toBe("dimension");

    // Color went through the plugins; still surfaces as a DTCG color.
    expect(output.primary.$type).toBe("color");
    expect(output.primary.$value.colorSpace).toBe("srgb");
  });
});

import { describe, expect, test } from "bun:test";

import type { Token } from "../Token";
import { Color } from "../TokenTypes/Color";
import { CubicBezier } from "../TokenTypes/CubicBezier";
import { DtcgGenerator } from "./Dtcg";

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
    expect(info!.format).toBe("Dtcg");
    expect(info!.usage).toContain("Dtcg");
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
});

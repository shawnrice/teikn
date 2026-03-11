import { describe, expect, test } from "bun:test";
import type { Token } from "../Token";
import { Color } from "../TokenTypes/Color";
import { ColorBlindnessPlugin } from "./ColorBlindnessPlugin";

const colorToken = (name: string, color: Color, usage?: string): Token => ({
  name,
  value: color,
  type: "color",
  ...(usage ? { usage } : {}),
});

const nonColorToken = (name: string): Token => ({
  name,
  value: "16px",
  type: "dimension",
});

describe("ColorBlindnessPlugin", () => {
  test("pure red under protanopia should lose significant redness", () => {
    const plugin = new ColorBlindnessPlugin({ types: ["protanopia"] });
    const red = new Color(255, 0, 0);
    const tokens = plugin.expand([colorToken("red", red)]);

    const simulated = tokens.find((t) => t.name === "red-protanopia");
    expect(simulated).toBeDefined();

    const simColor = simulated!.value as Color;
    // Pure red should lose most of its red channel under protanopia
    expect(simColor.red).toBeLessThan(200);
    // Green and blue should be relatively low but red dominance is reduced
    expect(simColor.red).toBeGreaterThan(simColor.green);
  });

  test("gray/achromatic colors should remain mostly unchanged", () => {
    const plugin = new ColorBlindnessPlugin();
    const gray = new Color(128, 128, 128);
    const tokens = plugin.expand([colorToken("gray", gray)]);

    const simulated = tokens.filter((t) => t.name !== "gray");
    for (const token of simulated) {
      const simColor = token.value as Color;
      // Each channel should be close to the original 128
      expect(Math.abs(simColor.red - 128)).toBeLessThan(10);
      expect(Math.abs(simColor.green - 128)).toBeLessThan(10);
      expect(Math.abs(simColor.blue - 128)).toBeLessThan(10);
    }
  });

  test("generates correct number of companion tokens (n colors x m types)", () => {
    const plugin = new ColorBlindnessPlugin();
    const tokens = [
      colorToken("primary", new Color(255, 0, 0)),
      colorToken("secondary", new Color(0, 0, 255)),
      nonColorToken("spacing"),
    ];

    const expanded = plugin.expand(tokens);
    // 2 colors x 3 types = 6 simulated + 2 originals + 1 non-color = 9
    expect(expanded).toHaveLength(9);
  });

  test("token names follow suffix pattern", () => {
    const plugin = new ColorBlindnessPlugin({
      types: ["protanopia", "deuteranopia"],
    });
    const tokens = plugin.expand([colorToken("primary", new Color(255, 0, 0))]);

    const names = tokens.map((t) => t.name);
    expect(names).toContain("primary");
    expect(names).toContain("primary-protanopia");
    expect(names).toContain("primary-deuteranopia");
  });

  test("token names follow custom suffix pattern", () => {
    const plugin = new ColorBlindnessPlugin({
      types: ["tritanopia"],
      suffix: "--{type}",
    });
    const tokens = plugin.expand([colorToken("brand", new Color(0, 128, 255))]);

    expect(tokens.map((t) => t.name)).toContain("brand--tritanopia");
  });

  test("expand returns original tokens plus generated ones", () => {
    const plugin = new ColorBlindnessPlugin({ types: ["protanopia"] });
    const original = colorToken("accent", new Color(0, 200, 100));
    const dim = nonColorToken("size");

    const expanded = plugin.expand([original, dim]);

    // Original tokens should be preserved in order
    expect(expanded[0]).toBe(original);
    expect(expanded[1].name).toBe("accent-protanopia");
    expect(expanded[2]).toBe(dim);
  });

  test("simulated token usage describes the simulation", () => {
    const plugin = new ColorBlindnessPlugin({ types: ["deuteranopia"] });
    const tokens = plugin.expand([colorToken("link", new Color(0, 0, 255))]);

    const simulated = tokens.find((t) => t.name === "link-deuteranopia");
    expect(simulated?.usage).toBe("Deuteranopia simulation of link");
  });

  test("toJSON returns token unchanged", () => {
    const plugin = new ColorBlindnessPlugin();
    const token = colorToken("test", new Color(100, 100, 100));
    expect(plugin.toJSON(token)).toBe(token);
  });
});

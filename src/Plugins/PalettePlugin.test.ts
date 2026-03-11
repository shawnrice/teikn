import { describe, expect, test } from "bun:test";

import type { Token } from "../Token";
import { Color } from "../TokenTypes/Color";
import { PalettePlugin } from "./PalettePlugin";

describe("PalettePlugin", () => {
  const plugin = new PalettePlugin();

  test("tokenType matches color", () => {
    expect(plugin.tokenType).toBe("color");
  });

  test("outputType matches anything", () => {
    expect(plugin.outputType.test("css")).toBe(true);
    expect(plugin.outputType.test("scss")).toBe(true);
    expect(plugin.outputType.test("json")).toBe(true);
  });

  test("toJSON returns token unchanged", () => {
    const token: Token = { name: "primary", type: "color", value: new Color("#3366ff") };
    const result = plugin.toJSON(token);
    expect(result).toBe(token);
  });

  test("expand passes through non-color tokens", () => {
    const token: Token = { name: "spacing-sm", type: "spacing", value: "8px" };
    const result = plugin.expand([token]);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(token);
  });

  test("expand generates palette tokens for color tokens", () => {
    const token: Token = { name: "primary", type: "color", value: new Color("#3366ff") };
    const result = plugin.expand([token]);

    // Original + 11 default steps
    expect(result).toHaveLength(12);
    expect(result[0]).toBe(token);
  });

  test("expand generates tokens with correct names", () => {
    const token: Token = { name: "brand", type: "color", value: new Color("#ff5500") };
    const result = plugin.expand([token]);

    const names = result.map((t) => t.name);
    expect(names).toContain("brand");
    expect(names).toContain("brand-50");
    expect(names).toContain("brand-500");
    expect(names).toContain("brand-950");
  });

  test("step 500 preserves the original color", () => {
    const baseColor = new Color("#3366ff");
    const token: Token = { name: "primary", type: "color", value: baseColor };
    const result = plugin.expand([token]);

    const step500 = result.find((t) => t.name === "primary-500");
    expect(step500).toBeDefined();
    expect(step500!.value.toString()).toBe(baseColor.toString());
  });

  test("lighter steps are lighter than the base color", () => {
    const baseColor = new Color("#3366ff");
    const token: Token = { name: "primary", type: "color", value: baseColor };
    const result = plugin.expand([token]);

    const step50 = result.find((t) => t.name === "primary-50");
    expect(step50).toBeDefined();
    const lightColor = new Color(step50!.value);
    expect(lightColor.lightness).toBeGreaterThan(baseColor.lightness);
  });

  test("darker steps are darker than the base color", () => {
    const baseColor = new Color("#3366ff");
    const token: Token = { name: "primary", type: "color", value: baseColor };
    const result = plugin.expand([token]);

    const step900 = result.find((t) => t.name === "primary-900");
    expect(step900).toBeDefined();
    const darkColor = new Color(step900!.value);
    expect(darkColor.lightness).toBeLessThan(baseColor.lightness);
  });

  test("custom steps option", () => {
    const customPlugin = new PalettePlugin({ steps: [100, 500, 900] });
    const token: Token = { name: "accent", type: "color", value: new Color("#00cc88") };
    const result = customPlugin.expand([token]);

    // Original + 3 steps
    expect(result).toHaveLength(4);
    const names = result.map((t) => t.name);
    expect(names).toContain("accent-100");
    expect(names).toContain("accent-500");
    expect(names).toContain("accent-900");
  });

  test("multiple color tokens each get palettes", () => {
    const tokens: Token[] = [
      { name: "primary", type: "color", value: new Color("#3366ff") },
      { name: "secondary", type: "color", value: new Color("#ff6633") },
    ];
    const result = plugin.expand(tokens);

    // 2 originals + 2 * 11 steps
    expect(result).toHaveLength(24);
    expect(result.filter((t) => t.name.startsWith("primary"))).toHaveLength(12);
    expect(result.filter((t) => t.name.startsWith("secondary"))).toHaveLength(12);
  });

  test("generated tokens preserve type and group", () => {
    const token: Token = {
      name: "brand",
      type: "color",
      value: new Color("#ff0000"),
      group: "colors",
    };
    const result = plugin.expand([token]);

    const step200 = result.find((t) => t.name === "brand-200");
    expect(step200!.type).toBe("color");
    expect(step200!.group).toBe("colors");
  });
});

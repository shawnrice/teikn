import { describe, expect, test } from "bun:test";

import type { Token } from "../Token.js";
import { Color } from "../TokenTypes/Color/index.js";
import { AlphaMultiplyPlugin } from "./AlphaMultiplyPlugin.js";

describe("AlphaMultiplyPlugin", () => {
  const plugin = new AlphaMultiplyPlugin();

  test("tokenType matches color only", () => {
    expect(plugin.tokenType).toBe("color");
  });

  test("outputType matches everything", () => {
    expect(plugin.outputType.test("css")).toBe(true);
    expect(plugin.outputType.test("json")).toBe(true);
  });

  test("returns token unchanged when alpha is 1", () => {
    const token: Token = { name: "primary", type: "color", value: "#ff0000" };
    const result = plugin.transform(token);
    expect(result).toBe(token);
  });

  test("flattens semi-transparent color against white background", () => {
    // 50% black on white => rgb(128, 128, 128) approximately
    const token: Token = { name: "overlay", type: "color", value: new Color(0, 0, 0, 0.5) };
    const result = plugin.transform(token);
    expect(result.value).toBe("rgb(128, 128, 128)");
  });

  test("flattens semi-transparent color against custom background", () => {
    const customPlugin = new AlphaMultiplyPlugin({ background: "#000000" });
    // 50% white on black => rgb(128, 128, 128) approximately
    const token: Token = { name: "overlay", type: "color", value: new Color(255, 255, 255, 0.5) };
    const result = customPlugin.transform(token);
    expect(result.value).toBe("rgb(128, 128, 128)");
  });

  test("handles fully transparent color", () => {
    const token: Token = { name: "invisible", type: "color", value: new Color(255, 0, 0, 0) };
    const result = plugin.transform(token);
    // Fully transparent on white => white
    expect(result.value).toBe("rgb(255, 255, 255)");
  });

  test("handles string color values with alpha", () => {
    const token: Token = { name: "fade", type: "color", value: "rgba(0, 0, 0, 0.5)" };
    const result = plugin.transform(token);
    expect(result.value).toBe("rgb(128, 128, 128)");
  });

  test("handles Color instance with full opacity", () => {
    const token: Token = { name: "solid", type: "color", value: new Color(255, 0, 0) };
    const result = plugin.transform(token);
    expect(result).toBe(token);
  });

  test("preserves other token fields", () => {
    const token: Token = {
      name: "bg",
      type: "color",
      value: "rgba(0, 0, 0, 0.5)",
      usage: "Background overlay",
    };
    const result = plugin.transform(token);
    expect(result.usage).toBe("Background overlay");
    expect(result.name).toBe("bg");
  });
});

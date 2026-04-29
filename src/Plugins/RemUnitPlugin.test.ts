import { describe, expect, test } from "bun:test";

import type { Token } from "../Token.js";
import { Dimension } from "../TokenTypes/Dimension.js";
import { RemUnitPlugin } from "./RemUnitPlugin.js";

describe("RemUnitPlugin", () => {
  const plugin = new RemUnitPlugin();

  test("tokenType and outputType match everything", () => {
    expect(plugin.tokenType.test("spacing")).toBe(true);
    expect(plugin.tokenType.test("font-size")).toBe(true);
    expect(plugin.outputType.test("css")).toBe(true);
  });

  test("converts a Dimension with px unit to rem", () => {
    const token: Token = { name: "spacing-md", type: "spacing", value: new Dimension(16, "px") };
    const result = plugin.transform(token);
    expect(result.value).toBeInstanceOf(Dimension);
    expect(result.value.toString()).toBe("1rem");
  });

  test("converts a Dimension with non-px unit unchanged", () => {
    const token: Token = { name: "spacing-sm", type: "spacing", value: new Dimension(1, "em") };
    const result = plugin.transform(token);
    expect(result.value.toString()).toBe("1em");
  });

  test("converts a string px value to rem", () => {
    const token: Token = { name: "size", type: "font-size", value: "32px" };
    const result = plugin.transform(token);
    expect(result.value).toBe("2rem");
  });

  test("leaves a non-px string value unchanged", () => {
    const token: Token = { name: "weight", type: "font-weight", value: "bold" };
    const result = plugin.transform(token);
    expect(result.value).toBe("bold");
  });

  test("handles composite values recursively", () => {
    const token: Token = {
      name: "border",
      type: "border",
      value: {
        width: new Dimension(2, "px"),
        style: "solid",
        color: "#000",
      },
    };
    const result = plugin.transform(token);
    expect(result.value.width.toString()).toBe("0.125rem");
    expect(result.value.style).toBe("solid");
    expect(result.value.color).toBe("#000");
  });

  test("respects custom base option", () => {
    const customPlugin = new RemUnitPlugin({ base: 10 });
    const token: Token = { name: "size", type: "font-size", value: "20px" };
    const result = customPlugin.transform(token);
    expect(result.value).toBe("2rem");
  });

  test("respects custom targetUnit option", () => {
    const customPlugin = new RemUnitPlugin({ targetUnit: "em" });
    const token: Token = { name: "size", type: "font-size", value: "32px" };
    const result = customPlugin.transform(token);
    expect(result.value).toBe("2em");
  });

  test("handles fractional px values", () => {
    const token: Token = { name: "size", type: "font-size", value: "12px" };
    const result = plugin.transform(token);
    expect(result.value).toBe("0.75rem");
  });

  test("preserves other token fields", () => {
    const token: Token = { name: "gap", type: "spacing", value: "16px", usage: "Standard gap" };
    const result = plugin.transform(token);
    expect(result.usage).toBe("Standard gap");
    expect(result.name).toBe("gap");
  });
});

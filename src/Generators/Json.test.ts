import { describe, expect, test } from "bun:test";

import { tokenSet1 } from "../fixtures/tokenSet1.js";
import type { Token } from "../Token.js";
import { Json as Generator } from "./Json.js";

describe("JSONGenerator tests", () => {
  test("It generates the token set", () => {
    expect(new Generator().generate(tokenSet1)).toMatchSnapshot();
  });

  test("describe returns JSON format info", () => {
    const gen = new Generator();
    const info = gen.describe();
    expect(info.format).toBe("JSON");
    expect(info.usage).toContain("fetch");
  });

  test("includes mode values in output", () => {
    const tokens: Token[] = [
      { name: "colorSurface", type: "color", value: "#ffffff", modes: { dark: "#1a1a1a" } },
    ];
    const output = new Generator().generate(tokens);
    const parsed = JSON.parse(output);
    expect(parsed.colorSurface.modes).toEqual({ dark: "#1a1a1a" });
  });

  test("omits modes when not present", () => {
    const tokens: Token[] = [{ name: "colorSurface", type: "color", value: "#ffffff" }];
    const output = new Generator().generate(tokens);
    const parsed = JSON.parse(output);
    expect(parsed.colorSurface.modes).toBeUndefined();
  });
});

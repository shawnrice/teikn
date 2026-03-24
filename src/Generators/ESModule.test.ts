import { describe, expect, test } from "bun:test";

import { tokenSet1 } from "../fixtures/tokenSet1";
import type { Token } from "../Token";
import { ESModule as Generator } from "./ESModule";

describe("ESModule tests", () => {
  test("it generates tokens as an esmodule", () => {
    expect(
      new Generator({ dateFn: () => "null", version: "test" }).generate(tokenSet1),
    ).toMatchSnapshot();
  });

  test("it generates group accessors when groups: true", () => {
    const tokens: Token[] = [
      { name: "colorPrimary", type: "color", value: "aliceblue" },
      { name: "colorSecondary", type: "color", value: "rgb(102, 205, 170)" },
      { name: "spacingSm", type: "spacing", value: "4px" },
    ];
    expect(
      new Generator({ dateFn: () => "null", version: "test", groups: true }).generate(tokens),
    ).toMatchSnapshot();
  });

  test("exports modes object when tokens have modes", () => {
    const tokens: Token[] = [
      { name: "colorSurface", type: "color", value: "#ffffff", modes: { dark: "#1a1a1a" } },
      { name: "colorText", type: "color", value: "#000000", modes: { dark: "#eeeeee" } },
    ];
    const output = new Generator({ dateFn: () => "null", version: "test" }).generate(tokens);
    expect(output).toContain("export const modes = {");
    expect(output).toContain("colorSurface: '#1a1a1a',");
    expect(output).toContain("colorText: '#eeeeee',");
    expect(output).toContain("dark: {");
  });

  test("omits modes export when no tokens have modes", () => {
    const tokens: Token[] = [{ name: "colorSurface", type: "color", value: "#ffffff" }];
    const output = new Generator({ dateFn: () => "null", version: "test" }).generate(tokens);
    expect(output).not.toContain("modes");
  });
});

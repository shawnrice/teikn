import { describe, expect, test } from "bun:test";

import { tokenSet1 } from "../fixtures/tokenSet1";
import type { Token } from "../Token";
import { JavaScript as Generator } from "./JavaScript";

const fixedDate = () => "Mon Jan 01 2024 12:00:00";

describe("es5 tests", () => {
  test("it generates things", () => {
    expect(new Generator({ dateFn: () => "null" }).generate(tokenSet1)).toMatchSnapshot();
  });

  test("it generates group accessors when groups: true", () => {
    const tokens: Token[] = [
      { name: "colorPrimary", type: "color", value: "aliceblue" },
      { name: "colorSecondary", type: "color", value: "rgb(102, 205, 170)" },
      { name: "spacingSm", type: "spacing", value: "4px" },
    ];
    expect(
      new Generator({ dateFn: () => "null", groups: true }).generate(tokens),
    ).toMatchSnapshot();
  });

  test("describe includes group accessor usage when groups enabled", () => {
    const gen = new Generator({ dateFn: fixedDate, groups: true });
    const info = gen.describe();
    expect(info.usage).toContain("color('primary')");
  });

  test("describe without groups does not include group accessor usage", () => {
    const gen = new Generator({ dateFn: fixedDate });
    const info = gen.describe();
    expect(info.format).toBe("CommonJS");
    expect(info.usage).not.toContain("color('primary')");
  });

  test("tokenUsage returns group accessor with groups", () => {
    const gen = new Generator({ groups: true });
    const usage = gen.tokenUsage({ name: "colorPrimary", type: "color", value: "#ff0000" });
    expect(usage).toBe("color('primary')");
  });

  test("generates group accessor functions with groups enabled", () => {
    const gen = new Generator({ dateFn: fixedDate, groups: true });
    const output = gen.generate([
      { name: "primary", type: "color", value: "#ff0000", group: "color" },
    ]);
    expect(output).toContain("const color = (name)");
  });

  test("object values get JSON.stringify treatment", () => {
    const gen = new Generator({ dateFn: fixedDate });
    const output = gen.generate([
      { name: "heading", type: "typography", value: { fontFamily: "Arial" } },
    ]);
    expect(output).toContain('{"fontFamily":"Arial"}');
  });

  test("exports modes object when tokens have modes", () => {
    const tokens: Token[] = [
      { name: "colorSurface", type: "color", value: "#ffffff", modes: { dark: "#1a1a1a" } },
      { name: "colorText", type: "color", value: "#000000", modes: { dark: "#eeeeee" } },
    ];
    const output = new Generator({ dateFn: fixedDate }).generate(tokens);
    expect(output).toContain("const modes = {");
    expect(output).toContain("colorSurface: '#1a1a1a',");
    expect(output).toContain("colorText: '#eeeeee',");
    expect(output).toContain("module.exports = { tokens: tokens, modes: modes, default: tokens };");
  });

  test("omits modes when no tokens have modes", () => {
    const tokens: Token[] = [{ name: "colorSurface", type: "color", value: "#ffffff" }];
    const output = new Generator({ dateFn: fixedDate }).generate(tokens);
    expect(output).not.toContain("modes");
    expect(output).toContain("module.exports = { tokens: tokens, default: tokens };");
  });
});

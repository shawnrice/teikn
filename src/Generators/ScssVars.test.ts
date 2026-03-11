import { describe, expect, test } from "bun:test";

import { tokenSet1 } from "../fixtures/tokenSet1";
import type { Token } from "../Token";
import { ScssVars as Generator } from "./ScssVars";

describe("SCSS Vars Generator tests", () => {
  test("It has the correct filename", () => {
    expect(new Generator().file).toBe("tokens.scss");
  });

  test("It generates the token set", () => {
    expect(new Generator({ dateFn: () => "null" }).generate(tokenSet1)).toMatchSnapshot();
  });

  test("it generates group maps and functions when groups: true", () => {
    const tokens: Token[] = [
      { name: "colorPrimary", type: "color", value: "aliceblue" },
      { name: "colorSecondary", type: "color", value: "rgb(102, 205, 170)" },
      { name: "spacingSm", type: "spacing", value: "4px" },
    ];
    expect(
      new Generator({ dateFn: () => "null", groups: true }).generate(tokens),
    ).toMatchSnapshot();
  });

  test("describe() returns format SCSS Variables", () => {
    const gen = new Generator();
    const desc = gen.describe();
    expect(desc.format).toBe("SCSS Variables");
    expect(desc.usage).toContain("$tokenName");
  });

  test("describe() with groups: true includes group accessor usage", () => {
    const gen = new Generator({ groups: true });
    const desc = gen.describe();
    expect(desc.usage).toContain("color('primary')");
  });

  test("tokenUsage() returns $tokenName for normal mode", () => {
    const gen = new Generator();
    const token: Token = { name: "colorPrimary", type: "color", value: "#fff" };
    expect(gen.tokenUsage(token)).toBe("$colorPrimary");
  });

  test("tokenUsage() with groups: true returns kebab-case group accessor", () => {
    const gen = new Generator({ groups: true });
    const token: Token = { name: "colorPrimary", type: "color", value: "#fff" };
    expect(gen.tokenUsage(token)).toBe("color('primary')");
  });

  test("generateToken with border composite value produces CSS shorthand", () => {
    const gen = new Generator();
    const token: Token = {
      name: "borderDefault",
      type: "border",
      value: { width: "1px", style: "solid", color: "#000" },
    };
    const result = gen.generateToken(token);
    expect(result).toContain("1px solid #000");
    expect(result).not.toContain("[object Object]");
  });

  test("generateToken with generic object value produces space-separated values", () => {
    const gen = new Generator();
    const token: Token = {
      name: "typographyBody",
      type: "typography",
      value: { fontFamily: "Arial", fontSize: "1rem" },
    };
    const result = gen.generateToken(token);
    expect(result).toContain("Arial 1rem");
  });

  test("generateToken includes usage comment when present", () => {
    const gen = new Generator();
    const token: Token = {
      name: "primary",
      type: "color",
      value: "#fff",
      usage: "Main brand color",
    };
    const result = gen.generateToken(token);
    expect(result).toContain("/// Main brand color");
    expect(result).toContain("$primary: #fff;");
  });

  test("footer() returns null", () => {
    const gen = new Generator();
    expect(gen.footer()).toBeNull();
  });

  test("it emits mode-namespaced variables when tokens have modes", () => {
    const tokens: Token[] = [
      { name: "colorSurface", type: "color", value: "#ffffff", modes: { dark: "#1a1a1a" } },
      { name: "colorText", type: "color", value: "#000000", modes: { dark: "#e0e0e0" } },
      { name: "spacingSm", type: "spacing", value: "4px" },
    ];
    const output = new Generator({ dateFn: () => "null" }).generate(tokens);

    expect(output).toContain("// Mode: dark");
    expect(output).toContain("$colorSurface--dark: #1a1a1a;");
    expect(output).toContain("$colorText--dark: #e0e0e0;");
  });

  test("it does not emit mode variables when no tokens have modes", () => {
    const tokens: Token[] = [{ name: "colorPrimary", type: "color", value: "#ff0000" }];
    const output = new Generator({ dateFn: () => "null" }).generate(tokens);

    expect(output).not.toContain("// Mode:");
    expect(output).not.toContain("--");
  });

  test("it handles multiple modes", () => {
    const tokens: Token[] = [
      { name: "colorSurface", type: "color", value: "#fff", modes: { dark: "#111", dim: "#333" } },
    ];
    const output = new Generator({ dateFn: () => "null" }).generate(tokens);

    expect(output).toContain("// Mode: dark");
    expect(output).toContain("$colorSurface--dark: #111;");
    expect(output).toContain("// Mode: dim");
    expect(output).toContain("$colorSurface--dim: #333;");
  });
});

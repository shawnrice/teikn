import { describe, expect, test } from "bun:test";

import { tokenSet1 } from "../fixtures/tokenSet1";
import { ColorTransformPlugin } from "../Plugins/ColorTransformPlugin";
import { PrefixTypePlugin } from "../Plugins/PrefixTypePlugin";
import { SCSSQuoteValuePlugin } from "../Plugins/SCSSQuoteValuePlugin";
import type { Token } from "../Token";
import { Scss as Generator } from "./Scss";

describe("SCSSGenerator tests", () => {
  test("It has the correct filename", () => {
    expect(new Generator().file).toBe("tokens.scss");
  });

  test("It generates the token set", () => {
    expect(
      new Generator({ dateFn: () => "null", version: "test" }).generate(tokenSet1, [
        new ColorTransformPlugin({ type: "rgba" }),
        new SCSSQuoteValuePlugin(),
        new PrefixTypePlugin(),
      ]),
    ).toMatchSnapshot();
  });

  test("it generates group maps and functions when groups: true", () => {
    const tokens: Token[] = [
      { name: "colorPrimary", type: "color", value: "aliceblue" },
      { name: "colorSecondary", type: "color", value: "rgb(102, 205, 170)" },
      { name: "spacingSm", type: "spacing", value: "4px" },
    ];
    expect(
      new Generator({ dateFn: () => "null", version: "test", groups: true }).generate(tokens),
    ).toMatchSnapshot();
  });

  test("it generates groups with PrefixTypePlugin", () => {
    expect(
      new Generator({ dateFn: () => "null", version: "test", groups: true }).generate(tokenSet1, [
        new ColorTransformPlugin({ type: "rgba" }),
        new SCSSQuoteValuePlugin(),
        new PrefixTypePlugin(),
      ]),
    ).toMatchSnapshot();
  });

  test("it emits a $modes map when tokens have modes", () => {
    const tokens: Token[] = [
      { name: "colorSurface", type: "color", value: "#ffffff", modes: { dark: "#1a1a1a" } },
      { name: "colorText", type: "color", value: "#000000", modes: { dark: "#e0e0e0" } },
      { name: "spacingSm", type: "spacing", value: "4px" },
    ];
    const output = new Generator({ dateFn: () => "null", version: "test" }).generate(tokens);

    expect(output).toContain("$modes: (");
    expect(output).toContain("dark: (");
    expect(output).toContain("color-surface: #1a1a1a,");
    expect(output).toContain("color-text: #e0e0e0,");
    expect(output).toContain(") !default;");
  });

  test("it does not emit $modes when no tokens have modes", () => {
    const tokens: Token[] = [{ name: "colorPrimary", type: "color", value: "#ff0000" }];
    const output = new Generator({ dateFn: () => "null", version: "test" }).generate(tokens);

    expect(output).not.toContain("$modes");
  });

  test("it groups multiple modes separately", () => {
    const tokens: Token[] = [
      { name: "colorSurface", type: "color", value: "#fff", modes: { dark: "#111", dim: "#333" } },
    ];
    const output = new Generator({ dateFn: () => "null", version: "test" }).generate(tokens);

    expect(output).toContain("dark: (");
    expect(output).toContain("dim: (");
  });
});

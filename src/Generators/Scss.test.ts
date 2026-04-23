import { describe, expect, test } from "bun:test";

import { tokenSet1 } from "../fixtures/tokenSet1";
import { ColorTransformPlugin } from "../Plugins/ColorTransformPlugin";
import { PrefixTypePlugin } from "../Plugins/PrefixTypePlugin";
import { ScssQuoteValuePlugin } from "../Plugins/ScssQuoteValuePlugin";
import type { Token } from "../Token";
import { Scss as Generator } from "./Scss";
import { testOpts } from "../fixtures/testOpts";

describe("Scss Generator tests", () => {
  test("It has the correct filename", () => {
    expect(new Generator().file).toBe("tokens.scss");
  });

  test("It generates the token set", () => {
    expect(
      new Generator(testOpts).generate(tokenSet1, [
        new ColorTransformPlugin({ type: "rgba" }),
        new ScssQuoteValuePlugin(),
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
    expect(new Generator({ ...testOpts, groups: true }).generate(tokens)).toMatchSnapshot();
  });

  test("it generates groups with PrefixTypePlugin", () => {
    expect(
      new Generator({ ...testOpts, groups: true }).generate(tokenSet1, [
        new ColorTransformPlugin({ type: "rgba" }),
        new ScssQuoteValuePlugin(),
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
    const output = new Generator(testOpts).generate(tokens);

    expect(output).toContain("$modes: (");
    expect(output).toContain("dark: (");
    expect(output).toContain("color-surface: #1a1a1a,");
    expect(output).toContain("color-text: #e0e0e0,");
    expect(output).toContain(") !default;");
  });

  test("it does not emit $modes when no tokens have modes", () => {
    const tokens: Token[] = [{ name: "colorPrimary", type: "color", value: "#ff0000" }];
    const output = new Generator(testOpts).generate(tokens);

    expect(output).not.toContain("$modes");
  });

  test("it groups multiple modes separately", () => {
    const tokens: Token[] = [
      { name: "colorSurface", type: "color", value: "#fff", modes: { dark: "#111", dim: "#333" } },
    ];
    const output = new Generator(testOpts).generate(tokens);

    expect(output).toContain("dark: (");
    expect(output).toContain("dim: (");
  });

  test("composite values with internal commas produce valid SCSS map output", () => {
    // Typography with a comma-containing fontFamily (a common, correct
    // form) historically leaked the comma at the top of the SCSS map
    // entry, making the parser treat it as a map-entry separator and
    // mangling the whole map. A second iteration of this bug produced
    // a JSON blob (`{"fontFamily": ...}`) inside the map, which is also
    // invalid SCSS syntax.
    //
    // Snapshot the full output so any future regression — a re-leaked
    // comma, a reintroduced JSON blob, a different map mangling — fails
    // loudly and forces a human to re-bless.
    const tokens: Token[] = [
      {
        name: "typographyDisplayLg",
        type: "typography",
        value: {
          fontFamily: '"Quicksand", sans-serif',
          fontSize: "2.25rem",
          fontWeight: 700,
          lineHeight: 1.2,
        },
      },
    ];
    expect(new Generator(testOpts).generate(tokens)).toMatchSnapshot();
  });

  test("scalar values with commas (e.g. rgb()) are not wrapped in cssMapValue", () => {
    const tokens: Token[] = [{ name: "colorPrimary", type: "color", value: "rgb(255, 0, 0)" }];
    const output = new Generator(testOpts).generate(tokens);
    // `rgb(...)` already has its own parens — no double-wrap.
    expect(output).not.toContain("(rgb(255, 0, 0))");
  });

  test("composite mode values are paren-wrapped inside $modes", () => {
    const tokens: Token[] = [
      {
        name: "typographyBody",
        type: "typography",
        value: { fontFamily: "Inter", fontSize: "1rem" },
        modes: {
          dark: { fontFamily: '"Quicksand", sans-serif', fontSize: "1rem" } as unknown as string,
        },
      },
    ];
    const output = new Generator(testOpts).generate(tokens);
    // The composite mode override needs the same paren-wrap as the
    // top-level composite — $modes has the same map-entry-comma
    // parsing hazard as $token-values.
    expect(output).toContain('typography-body: ("Quicksand", sans-serif 1rem)');
  });
});

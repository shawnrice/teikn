import { describe, expect, test } from "bun:test";

import { tokenSet1 } from "../fixtures/tokenSet1";
import type { Token } from "../Token";
import { EsModule as Generator } from "./EsModule";
import { testOpts } from "../fixtures/testOpts";

describe("EsModule tests", () => {
  test("it generates tokens as an esmodule", () => {
    expect(new Generator(testOpts).generate(tokenSet1)).toMatchSnapshot();
  });

  test("it generates group accessors when groups: true", () => {
    const tokens: Token[] = [
      { name: "colorPrimary", type: "color", value: "aliceblue" },
      { name: "colorSecondary", type: "color", value: "rgb(102, 205, 170)" },
      { name: "spacingSm", type: "spacing", value: "4px" },
    ];
    expect(new Generator({ ...testOpts, groups: true }).generate(tokens)).toMatchSnapshot();
  });

  test("exports modes object when tokens have modes", () => {
    const tokens: Token[] = [
      { name: "colorSurface", type: "color", value: "#ffffff", modes: { dark: "#1a1a1a" } },
      { name: "colorText", type: "color", value: "#000000", modes: { dark: "#eeeeee" } },
    ];
    const output = new Generator(testOpts).generate(tokens);
    expect(output).toContain("export const modes = {");
    expect(output).toContain("colorSurface: '#1a1a1a',");
    expect(output).toContain("colorText: '#eeeeee',");
    expect(output).toContain("dark: {");
  });

  test("omits modes export when no tokens have modes", () => {
    const tokens: Token[] = [{ name: "colorSurface", type: "color", value: "#ffffff" }];
    const output = new Generator(testOpts).generate(tokens);
    expect(output).not.toContain("modes");
  });

  test("quotes transformed keys that are not valid identifiers", () => {
    const output = new Generator({
      ...testOpts,
      nameTransformer: (name: string) => name.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase(),
    }).generate([{ name: "colorPrimary", type: "color", value: "#ffffff" }]);

    expect(output).toContain("'color-primary': '#ffffff'");
  });
});

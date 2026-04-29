import { describe, expect, test } from "bun:test";

import { testOpts } from "../fixtures/testOpts.js";
import { tokenSet1 } from "../fixtures/tokenSet1.js";
import type { Token } from "../Token.js";
import { JavaScript } from "./JavaScript.js";

const fixedDate = () => "Mon Jan 01 2024 12:00:00";

describe("JavaScript generator (ESM default)", () => {
  test("it generates tokens as an ES module by default", () => {
    expect(new JavaScript(testOpts).generate(tokenSet1)).toMatchSnapshot();
  });

  test("default extension is .mjs", () => {
    expect(new JavaScript().file).toBe("tokens.mjs");
  });

  test("it generates group accessors when groups: true", () => {
    const tokens: Token[] = [
      { name: "colorPrimary", type: "color", value: "aliceblue" },
      { name: "colorSecondary", type: "color", value: "rgb(102, 205, 170)" },
      { name: "spacingSm", type: "spacing", value: "4px" },
    ];
    expect(new JavaScript({ ...testOpts, groups: true }).generate(tokens)).toMatchSnapshot();
  });

  test("exports modes object when tokens have modes", () => {
    const tokens: Token[] = [
      { name: "colorSurface", type: "color", value: "#ffffff", modes: { dark: "#1a1a1a" } },
      { name: "colorText", type: "color", value: "#000000", modes: { dark: "#eeeeee" } },
    ];
    const output = new JavaScript(testOpts).generate(tokens);
    expect(output).toContain("export const modes = {");
    expect(output).toContain("colorSurface: '#1a1a1a',");
    expect(output).toContain("colorText: '#eeeeee',");
    expect(output).toContain("dark: {");
  });

  test("omits modes export when no tokens have modes", () => {
    const tokens: Token[] = [{ name: "colorSurface", type: "color", value: "#ffffff" }];
    const output = new JavaScript(testOpts).generate(tokens);
    expect(output).not.toContain("modes");
  });

  test("quotes transformed keys that are not valid identifiers", () => {
    const output = new JavaScript({
      ...testOpts,
      nameTransformer: (name: string) => name.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase(),
    }).generate([{ name: "colorPrimary", type: "color", value: "#ffffff" }]);

    expect(output).toContain("'color-primary': '#ffffff'");
  });

  test("describe reports ES Module format and import-style usage", () => {
    const info = new JavaScript({ dateFn: fixedDate }).describe();
    expect(info.format).toBe("ES Module");
    expect(info.usage).toContain("import { tokens } from");
  });

  test("describe includes group accessor usage when groups enabled", () => {
    const info = new JavaScript({ dateFn: fixedDate, groups: true }).describe();
    expect(info.usage).toContain("color('primary')");
  });

  test("tokenUsage returns group accessor with groups", () => {
    const usage = new JavaScript({ groups: true }).tokenUsage({
      name: "colorPrimary",
      type: "color",
      value: "#ff0000",
    });
    expect(usage).toBe("color('primary')");
  });

  test("object values get JSON.stringify treatment", () => {
    const output = new JavaScript({ dateFn: fixedDate }).generate([
      { name: "heading", type: "typography", value: { fontFamily: "Arial" } },
    ]);
    expect(output).toContain('{"fontFamily":"Arial"}');
  });

  test("throws at construction on unknown module value", () => {
    // `module` previously fell through `?? "esm"`, so any non-"cjs" value
    // (typos like "commonjs", "mjs") silently produced ESM output.
    expect(() => new JavaScript({ module: "commonjs" as never })).toThrow(
      /Expected "esm" or "cjs"/,
    );
    expect(() => new JavaScript({ module: "mjs" as never })).toThrow(/Expected "esm" or "cjs"/);
  });
});

describe("JavaScript generator (CJS mode)", () => {
  test("default extension is .cjs when module: cjs", () => {
    expect(new JavaScript({ module: "cjs" }).file).toBe("tokens.cjs");
  });

  test("emits module.exports footer with tokens + default", () => {
    const tokens: Token[] = [{ name: "colorSurface", type: "color", value: "#ffffff" }];
    const output = new JavaScript({ dateFn: fixedDate, module: "cjs" }).generate(tokens);
    expect(output).toContain("const tokens = {");
    expect(output).not.toContain("export const tokens");
    expect(output).toContain("module.exports = { tokens: tokens, default: tokens };");
  });

  test("emits module.exports with modes when tokens have modes", () => {
    const tokens: Token[] = [
      { name: "colorSurface", type: "color", value: "#ffffff", modes: { dark: "#1a1a1a" } },
    ];
    const output = new JavaScript({ dateFn: fixedDate, module: "cjs" }).generate(tokens);
    expect(output).toContain("const modes = {");
    expect(output).toContain("module.exports = { tokens: tokens, modes: modes, default: tokens };");
  });

  test("group accessors exported via module.exports", () => {
    const output = new JavaScript({ dateFn: fixedDate, module: "cjs", groups: true }).generate([
      { name: "primary", type: "color", value: "#ff0000", group: "color" },
    ]);
    expect(output).toContain("const color = (name)");
    expect(output).not.toContain("export const color");
    expect(output).toContain("module.exports = { tokens: tokens, color: color, default: tokens };");
  });

  test("describe reports CommonJS format and require-style usage", () => {
    const info = new JavaScript({ dateFn: fixedDate, module: "cjs" }).describe();
    expect(info.format).toBe("CommonJS");
    expect(info.usage).toContain("require(");
  });

  test("ext override still wins over module-derived default", () => {
    expect(new JavaScript({ module: "cjs", ext: "js" }).file).toBe("tokens.js");
  });
});

import { describe, expect, test } from "bun:test";

import type { Token } from "../Token";
import { TypeScript } from "./TypeScript";

const fixedDate = () => "Mon Jan 01 2024 12:00:00";

const sampleTokens: Token[] = [
  { name: "colorPrimary", type: "color", value: "#0066cc" },
  { name: "colorSecondary", type: "color", value: "#999999" },
];

describe("TypeScript meta generator", () => {
  test("emits both runtime and declaration files by default", () => {
    const files = new TypeScript({ dateFn: fixedDate }).generateFiles(sampleTokens);
    expect([...files.keys()].toSorted()).toEqual(["tokens.d.ts", "tokens.mjs"]);
  });

  test("filenames() reports both files without running a generation pass", () => {
    expect(new TypeScript().filenames().toSorted()).toEqual(["tokens.d.ts", "tokens.mjs"]);
  });

  test("runtime file defaults to ESM (.mjs) with `export const tokens`", () => {
    const files = new TypeScript({ dateFn: fixedDate }).generateFiles(sampleTokens);
    const mjs = files.get("tokens.mjs")!;
    expect(mjs).toContain("export const tokens = {");
    expect(mjs).toContain("export default tokens;");
  });

  test("declaration file uses narrow literal types by default", () => {
    const files = new TypeScript({ dateFn: fixedDate }).generateFiles(sampleTokens);
    const dts = files.get("tokens.d.ts")!;
    expect(dts).toContain("export declare const tokens: {");
    expect(dts).toContain('readonly colorPrimary: "#0066cc";');
    expect(dts).toContain('readonly colorSecondary: "#999999";');
  });

  test("module: 'cjs' switches the runtime file to .cjs + module.exports", () => {
    const files = new TypeScript({ dateFn: fixedDate, module: "cjs" }).generateFiles(sampleTokens);
    expect([...files.keys()].toSorted()).toEqual(["tokens.cjs", "tokens.d.ts"]);
    const cjs = files.get("tokens.cjs")!;
    expect(cjs).toContain("const tokens = {");
    expect(cjs).toContain("module.exports = { tokens: tokens, default: tokens };");
  });

  test("loose: true widens the declaration file to primitive types", () => {
    const files = new TypeScript({ dateFn: fixedDate, loose: true }).generateFiles(sampleTokens);
    const dts = files.get("tokens.d.ts")!;
    expect(dts).toContain("readonly colorPrimary: string;");
    expect(dts).not.toContain('"#0066cc"');
  });

  test("shared filename propagates to both sub-generators", () => {
    const files = new TypeScript({
      dateFn: fixedDate,
      filename: "design",
    }).generateFiles(sampleTokens);
    expect([...files.keys()].toSorted()).toEqual(["design.d.ts", "design.mjs"]);
  });

  test("shared nameTransformer propagates to both sub-generators", () => {
    const files = new TypeScript({
      dateFn: fixedDate,
      nameTransformer: (n) => n.toUpperCase(),
    }).generateFiles([{ name: "primary", type: "color", value: "#0066cc" }]);
    expect(files.get("tokens.mjs")).toContain("PRIMARY:");
    expect(files.get("tokens.d.ts")).toContain("PRIMARY:");
  });

  test("describe reports format and import-style usage", () => {
    const info = new TypeScript({ dateFn: fixedDate }).describe();
    expect(info.format).toBe("TypeScript (runtime + declarations)");
    expect(info.usage).toContain("import { tokens } from");
  });

  test("groups option propagates to both runtime and declarations", () => {
    const files = new TypeScript({
      dateFn: fixedDate,
      groups: true,
    }).generateFiles([{ name: "primary", type: "color", value: "#ff0000", group: "color" }]);
    expect(files.get("tokens.mjs")).toContain("export const color = (name)");
    expect(files.get("tokens.d.ts")).toContain("export declare const color:");
  });

  test("throws at construction if given an ext option", () => {
    expect(() => new TypeScript({ ext: "js" } as never)).toThrow(
      "TypeScript meta generator does not accept an `ext` option",
    );
  });
});

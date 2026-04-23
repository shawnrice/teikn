import { describe, expect, test } from "bun:test";

import { Plugin } from "../Plugins";
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

  test("combined output matches snapshot (catches structural drift)", () => {
    // Single snapshot over both emitted files — catches reorder / dedup /
    // header-placement regressions that per-line `toContain` misses.
    const files = new TypeScript({
      dateFn: fixedDate,
      version: "test",
      groups: true,
    }).generateFiles([
      { name: "primary", type: "color", value: "#0066cc", group: "color" },
      { name: "accent", type: "color", value: "#ff6600", group: "color" },
      { name: "sm", type: "spacing", value: "0.5rem", group: "spacing" },
    ]);
    const combined = [...files.entries()]
      .toSorted(([a], [b]) => a.localeCompare(b))
      .map(([filename, content]) => `=== ${filename} ===\n${content}`)
      .join("\n\n");
    expect(combined).toMatchSnapshot();
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

  test("plugin targeting .d.ts applies to the declarations file in meta", () => {
    const dtsOnlyPlugin = {
      tokenType: "color",
      outputType: "d.ts",
      runAfter: [],
      transform(token: Token): Token {
        return { ...token, usage: "DTS-ANNOTATED" };
      },
    } as unknown as never;

    const files = new TypeScript({ dateFn: fixedDate }).generateFiles(
      [{ name: "primary", type: "color", value: "#ff0000" }],
      [dtsOnlyPlugin],
    );
    const dts = files.get("tokens.d.ts")!;

    // `usage` flows to the JSDoc comment in declarations. If d.ts-targeted
    // plugins are dropped (Phase 1 regression), the annotation is missing.
    expect(dts).toContain("DTS-ANNOTATED");
  });

  test("plugin targeting .mjs applies only to the runtime, not declarations", () => {
    // Each sub-generator filters plugins by its own ext. A plugin that
    // specifies `outputType: "mjs"` transforms the runtime file but does
    // not apply to the `.d.ts`. Consumers who want consistent behavior
    // across both files should use a broader `outputType` (e.g. `/.*/`)
    // or attach the transform at the expand / resolve layer.
    const uppercasePlugin = {
      tokenType: "color",
      outputType: "mjs",
      runAfter: [],
      transform(token: Token): Token {
        return { ...token, value: (token.value as string).toUpperCase() };
      },
    } as unknown as never;

    const files = new TypeScript({ dateFn: fixedDate }).generateFiles(
      [{ name: "primary", type: "color", value: "#ff0000" }],
      [uppercasePlugin],
    );
    const mjs = files.get("tokens.mjs")!;
    const dts = files.get("tokens.d.ts")!;

    expect(mjs).toContain("#FF0000");
    // Declarations see the pre-plugin literal.
    expect(dts).toContain('"#ff0000"');
    expect(dts).not.toContain("#FF0000");
  });

  test("plugin runAfter ordering survives the meta's two prepareTokens passes", () => {
    // The meta runs prepareTokens once per sub-generator. sortPlugins
    // must produce the same order in both passes — A before B because
    // B declares runAfter: ["A"]. With one token, two plugins, and two
    // sub-gens, we expect exactly four transform() calls in A,B,A,B order.
    const order: string[] = [];

    class A extends Plugin {
      tokenType: RegExp = /.*/;
      outputType: RegExp = /.*/;
      // oxlint-disable-next-line class-methods-use-this
      transform(t: Token): Token {
        order.push("A");
        return t;
      }
    }
    class B extends Plugin {
      tokenType: RegExp = /.*/;
      outputType: RegExp = /.*/;
      override runAfter: string[] = ["A"];
      // oxlint-disable-next-line class-methods-use-this
      transform(t: Token): Token {
        order.push("B");
        return t;
      }
    }

    // Pass in reverse declared order — sortPlugins must put A first.
    new TypeScript({ dateFn: fixedDate }).generateFiles(
      [{ name: "primary", type: "color", value: "#ff0000" }],
      [new B(), new A()],
    );

    expect(order).toEqual(["A", "B", "A", "B"]);
  });
});

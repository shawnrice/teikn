import { describe, expect, test } from "bun:test";

import { testOpts } from "../fixtures/testOpts";
import { tokenSet1 } from "../fixtures/tokenSet1";
import type { Token } from "../Token";
import { TypeScriptDeclarations as Generator } from "./TypeScriptDeclarations";

const fixedDate = () => "Mon Jan 01 2024 12:00:00";

describe("TypeScriptDeclarations generator", () => {
  test("It matches the snapshot", () => {
    expect(new Generator(testOpts).generate(tokenSet1)).toMatchSnapshot();
  });

  test("it generates group type declarations when groups: true", () => {
    const tokens: Token[] = [
      { name: "colorPrimary", type: "color", value: "aliceblue" },
      { name: "colorSecondary", type: "color", value: "rgb(102, 205, 170)" },
      { name: "spacingSm", type: "spacing", value: "4px" },
    ];
    expect(new Generator({ ...testOpts, groups: true }).generate(tokens)).toMatchSnapshot();
  });

  test("describe includes group accessor usage when groups enabled", () => {
    const info = new Generator({ dateFn: fixedDate, groups: true }).describe();
    expect(info.format).toBe("TypeScript Declarations");
    expect(info.usage).toContain("color('primary')");
  });

  test("describe without groups does not include group accessor usage", () => {
    const info = new Generator({ dateFn: fixedDate }).describe();
    expect(info.format).toBe("TypeScript Declarations");
    expect(info.usage).not.toContain("color('primary')");
  });

  test("tokenUsage returns group accessor with groups", () => {
    const usage = new Generator({ groups: true }).tokenUsage({
      name: "colorPrimary",
      type: "color",
      value: "#ff0000",
    });
    expect(usage).toBe("color('primary')");
  });

  test("tokenUsage returns tokens.name without groups", () => {
    const usage = new Generator({}).tokenUsage({
      name: "colorPrimary",
      type: "color",
      value: "#ff0000",
    });
    expect(usage).toBe("tokens.colorPrimary");
  });

  test("combinator includes group declarations with groups", () => {
    const output = new Generator({ dateFn: fixedDate, groups: true }).generate([
      { name: "primary", type: "color", value: "#ff0000", group: "color" },
    ]);
    expect(output).toContain("export declare const color:");
  });

  test("emits modes type when tokens have modes", () => {
    const tokens: Token[] = [
      { name: "colorSurface", type: "color", value: "#ffffff", modes: { dark: "#1a1a1a" } },
    ];
    const output = new Generator({ dateFn: fixedDate }).generate(tokens);
    expect(output).toContain("export declare const modes: {");
    expect(output).toContain("readonly dark: Partial<typeof tokens>;");
  });

  test("omits modes type when no tokens have modes", () => {
    const tokens: Token[] = [{ name: "colorSurface", type: "color", value: "#ffffff" }];
    const output = new Generator({ dateFn: fixedDate }).generate(tokens);
    expect(output).not.toContain("modes");
  });

  test("quotes transformed keys that are not valid identifiers", () => {
    const output = new Generator({
      dateFn: fixedDate,
      nameTransformer: (name: string) => name.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase(),
    }).generate([{ name: "colorPrimary", type: "color", value: "#ffffff" }]);

    expect(output).toContain("'color-primary': \"#ffffff\"");
  });
});

describe("TypeScriptDeclarations: literal types (default)", () => {
  const gen = new Generator({ dateFn: fixedDate });

  test("string values become literal string types", () => {
    const output = gen.generate([{ name: "primary", type: "color", value: "#0066cc" }]);
    expect(output).toContain('readonly primary: "#0066cc";');
  });

  test("number values become literal number types", () => {
    const output = gen.generate([{ name: "opacity", type: "number", value: 0.5 }]);
    expect(output).toContain("readonly opacity: 0.5;");
  });

  test("boolean values become literal boolean types", () => {
    const output = gen.generate([{ name: "enabled", type: "boolean", value: true }]);
    expect(output).toContain("readonly enabled: true;");
  });

  test("null values become the literal null type", () => {
    const output = gen.generate([{ name: "empty", type: "any", value: null as unknown as string }]);
    expect(output).toContain("readonly empty: null;");
    expect(output).not.toContain("readonly empty: object;");
  });

  test("composite fields carry readonly", () => {
    const output = gen.generate([
      {
        name: "heading",
        type: "typography",
        value: { fontFamily: "Inter", fontSize: "16px" },
      },
    ]);
    expect(output).toContain('readonly fontFamily: "Inter"');
    expect(output).toContain('readonly fontSize: "16px"');
  });

  test("top-level tokens declaration uses `export declare const` with readonly fields", () => {
    const output = gen.generate([{ name: "primary", type: "color", value: "#0066cc" }]);
    expect(output).toContain("export declare const tokens: {");
    expect(output).toContain('readonly primary: "#0066cc";');
  });
});

describe("TypeScriptDeclarations: loose mode", () => {
  const gen = new Generator({ dateFn: fixedDate, loose: true });

  test("string values widen to string", () => {
    const output = gen.generate([{ name: "primary", type: "color", value: "#0066cc" }]);
    expect(output).toContain("readonly primary: string;");
    expect(output).not.toContain('"#0066cc"');
  });

  test("number values widen to number", () => {
    const output = gen.generate([{ name: "opacity", type: "number", value: 0.5 }]);
    expect(output).toContain("readonly opacity: number;");
  });

  test("boolean values widen to boolean", () => {
    const output = gen.generate([{ name: "enabled", type: "boolean", value: true }]);
    expect(output).toContain("readonly enabled: boolean;");
  });

  test("composite fields also widen", () => {
    const output = gen.generate([
      {
        name: "heading",
        type: "typography",
        value: { fontFamily: "Inter", fontSize: "16px" },
      },
    ]);
    expect(output).toContain("readonly fontFamily: string");
    expect(output).toContain("readonly fontSize: string");
  });
});

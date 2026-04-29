import { describe, expect, test } from "bun:test";
import { Color } from "./TokenTypes/Color/index.js";
import { Dimension } from "./TokenTypes/Dimension.js";
import { Teikn } from "./Teikn.js";
import { Plugin } from "./Plugins/index.js";
import { composite, dp, dim, dur, group, ref, scale, theme, tokens } from "./builders.js";
import { validate } from "./validate.js";
import type { Token } from "./Token.js";

describe("misuse patterns", () => {
  // ──────────────────────────────────────────────────────────────────
  // 1. Bare values without builders
  // ──────────────────────────────────────────────────────────────────
  describe("1. bare values without builders", () => {
    test("passing raw objects instead of using group()", () => {
      // FOOTGUN: Teikn accepts any Token[] — no runtime shape validation
      // on the input to generateToStrings. If you forget `type`, the token
      // still gets processed but with type=undefined, producing broken output.
      const myTokens = [{ name: "primary", type: "color", value: "#0066cc" }] as Token[];
      const t = new Teikn({
        generators: [new Teikn.generators.CssVars({ version: "test" })],
      });
      const result = t.generateToStrings(myTokens);
      const css = result.get("tokens.css")!;
      // ACCEPTABLE: it works if you provide the right shape manually.
      // The token gets prefixed with its type, so "color-primary" is the var name.
      expect(css).toContain("--color-primary");
      expect(css).toContain("#0066cc");
    });

    test("passing raw objects without type field", () => {
      const myTokens = [{ name: "primary", value: "#0066cc" }] as unknown as Token[];
      const result = validate(myTokens);
      // GOOD: validate catches missing type
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.message.includes("Missing required field: type"))).toBe(
        true,
      );
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // 2. Wrong value types
  // ──────────────────────────────────────────────────────────────────
  describe("2. wrong value types", () => {
    test("passing a bare number where dp() is expected", () => {
      // FOOTGUN: group() happily accepts a number. The output is just "16"
      // with no unit — the user probably wanted "1rem" via dp(16).
      const toks = group("spacing", { md: 16 });
      const t = new Teikn({
        generators: [new Teikn.generators.CssVars({ version: "test" })],
      });
      const result = t.generateToStrings(toks);
      const css = result.get("tokens.css")!;
      // Output is "16" — a bare number with no unit
      expect(css).toContain("--spacing-md: 16;");
    });

    test("passing a non-color string as color type", () => {
      // GOOD: validate warns about unparseable color values
      const toks = group("color", { primary: "not-a-color" });
      const result = validate(toks);
      expect(result.issues.some((i) => i.message.includes("could not be parsed"))).toBe(true);
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // 3. Mixing Color strings and Color objects
  // ──────────────────────────────────────────────────────────────────
  describe("3. mixing Color strings and Color objects", () => {
    test("group with mixed Color object and color string", () => {
      const toks = group("color", {
        primary: new Color("#0066cc"),
        secondary: "#ff6600",
      });
      const t = new Teikn({
        generators: [new Teikn.generators.CssVars({ version: "test" })],
      });
      const result = t.generateToStrings(toks);
      const css = result.get("tokens.css")!;
      // ACCEPTABLE: both work, Color object gets toString()'d, string passes through.
      // But the Color object outputs its formatted representation while the string stays raw.
      expect(css).toContain("--color-primary:");
      expect(css).toContain("--color-secondary: #ff6600;");
    });

    test("cannot call .shade() on a string value", () => {
      // GOOD: TypeScript would catch this, but at runtime the string has no .shade method
      const toks = group("color", { secondary: "#ff6600" });
      const val = toks[0]!.value;
      expect(typeof val).toBe("string");
      expect(val.shade).toBeUndefined();
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // 4. dp() with zero
  // ──────────────────────────────────────────────────────────────────
  describe("4. dp() with zero", () => {
    test("dp(0) produces a zero rem dimension", () => {
      const d = dp(0);
      // ACCEPTABLE: dp(0) => Dimension(0, 'rem') => "0rem"
      // In CSS, "0rem" is valid but "0" alone would also be fine.
      expect(d.toString()).toBe("0rem");
      expect(d.value).toBe(0);
      expect(d.unit).toBe("rem");
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // 5. Negative dimensions
  // ──────────────────────────────────────────────────────────────────
  describe("5. negative dimensions", () => {
    test("dp(-8) produces a negative rem dimension", () => {
      const d = dp(-8);
      // ACCEPTABLE: negative values are valid CSS (e.g., negative margin)
      expect(d.toString()).toBe("-0.5rem");
      expect(d.value).toBe(-0.5);
    });

    test("dim(-1, 'rem') produces a negative dimension", () => {
      const d = dim(-1, "rem");
      // ACCEPTABLE: negative values are valid CSS
      expect(d.toString()).toBe("-1rem");
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // 6. ref() to nonexistent token
  // ──────────────────────────────────────────────────────────────────
  describe("6. ref() to nonexistent token", () => {
    test("validate catches unresolved references", () => {
      const toks = group("color", { link: ref("nonexistent") });
      const result = validate(toks);
      // GOOD: validate catches it as an error
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.message.includes("Unresolved reference"))).toBe(true);
    });

    test("generateToStrings throws on unresolved references", () => {
      const toks = group("color", { link: ref("nonexistent") });
      const t = new Teikn({
        generators: [new Teikn.generators.CssVars({ version: "test" })],
      });
      // GOOD: resolveReferences throws an error at generation time
      expect(() => t.generateToStrings(toks)).toThrow("Unresolved reference");
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // 7. Duplicate token names
  // ──────────────────────────────────────────────────────────────────
  describe("7. duplicate token names", () => {
    test("tokens() with duplicate names in separate groups", () => {
      const a = group("color", { primary: "#000" });
      const b = group("color", { primary: "#fff" });
      const combined = tokens(a, b);
      // Both tokens are in the array
      expect(combined.length).toBe(2);

      const result = validate(combined);
      // GOOD: validate warns about duplicate names
      expect(result.issues.some((i) => i.message.includes("Duplicate token name"))).toBe(true);
    });

    test("generateToStrings with duplicates uses last value", () => {
      const a = group("color", { primary: "#000000" });
      const b = group("color", { primary: "#ffffff" });
      const combined = tokens(a, b);
      const t = new Teikn({
        generators: [new Teikn.generators.CssVars({ version: "test" })],
      });
      const result = t.generateToStrings(combined);
      const css = result.get("tokens.css")!;
      // FOOTGUN: both tokens end up in the output, second overwrites first in CSS cascade
      // but both are emitted. No deduplication happens.
      expect(css).toContain("#000000");
      expect(css).toContain("#ffffff");
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // 8. theme() with keys not in source group
  // ──────────────────────────────────────────────────────────────────
  describe("8. theme() with nonexistent keys", () => {
    test("theme() throws on unknown token names", () => {
      const colors = group("color", { primary: "#000" });
      // GOOD: theme() validates the keys eagerly
      expect(() => theme("dark", colors, { nonexistent: "#fff" })).toThrow(
        'Theme "dark": unknown token "nonexistent"',
      );
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // 9. Circular refs
  // ──────────────────────────────────────────────────────────────────
  describe("9. circular references", () => {
    test("validate catches circular references", () => {
      const toks = group("color", { a: ref("b"), b: ref("a") });
      const result = validate(toks);
      // GOOD: validate detects circular references
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.message.includes("Circular reference"))).toBe(true);
    });

    test("generateToStrings throws on circular references", () => {
      const toks = group("color", { a: ref("b"), b: ref("a") });
      const t = new Teikn({
        generators: [new Teikn.generators.CssVars({ version: "test" })],
      });
      // GOOD: resolveReferences throws
      expect(() => t.generateToStrings(toks)).toThrow("Circular reference");
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // 10. Empty inputs
  // ──────────────────────────────────────────────────────────────────
  describe("10. empty inputs", () => {
    test("empty group produces empty array", () => {
      const toks = group("color", {});
      // ACCEPTABLE: returns an empty array, no error
      expect(toks).toEqual([]);
    });

    test("tokens() with no arguments produces empty array", () => {
      const toks = tokens();
      // ACCEPTABLE: returns an empty array
      expect(toks).toEqual([]);
    });

    test("scale() with empty object produces empty array", () => {
      const toks = scale("spacing", {});
      // ACCEPTABLE: returns an empty array
      expect(toks).toEqual([]);
    });

    test("composite() with empty object produces empty array", () => {
      const toks = composite("typography", {});
      // ACCEPTABLE: returns an empty array
      expect(toks).toEqual([]);
    });

    test("generateToStrings with empty tokens", () => {
      const t = new Teikn({
        generators: [new Teikn.generators.CssVars({ version: "test" })],
      });
      // ACCEPTABLE: generates a valid but mostly empty CSS file
      const result = t.generateToStrings([]);
      const css = result.get("tokens.css")!;
      expect(typeof css).toBe("string");
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // 11. Nested composites (composite inside composite)
  // ──────────────────────────────────────────────────────────────────
  describe("11. nested composites", () => {
    test("composite with nested object value throws an error", () => {
      // GOOD: composite() now detects nested objects and throws a helpful error
      expect(() =>
        composite("complex", {
          outer: {
            inner: { fontSize: dp(16), fontWeight: 400 } as any,
            other: "hello",
          },
        }),
      ).toThrow(
        'composite(): nested objects are not supported. Token "outer" field "inner" contains an object.',
      );
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // 12. Using dp() in theme overrides
  // ──────────────────────────────────────────────────────────────────
  describe("12. dp() in theme overrides", () => {
    test("dp() works in theme overrides", () => {
      const spacing = scale("spacing", { md: dp(16) });
      const compact = theme("compact", spacing, { md: dp(8) });
      // GOOD: dp() works in overrides — theme accepts TokenValue
      expect(compact.overrides["spacing.md"]).toBeInstanceOf(Dimension);
      expect((compact.overrides["spacing.md"] as Dimension).toString()).toBe("0.5rem");
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // 13. Passing generators as strings
  // ──────────────────────────────────────────────────────────────────
  describe("13. generators as strings", () => {
    test("passing string generator names instead of instances", () => {
      // The constructor now catches this early via the duplicate filename check,
      // since strings lack a .file property and both resolve to undefined.
      expect(() => new Teikn({ generators: ["CssVars", "Json"] as any })).toThrow();
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // 14. Generator without outDir
  // ──────────────────────────────────────────────────────────────────
  describe("14. generator without outDir", () => {
    test("generateToStrings works without outDir", () => {
      const t = new Teikn({ generators: [new Teikn.generators.Json({ version: "test" })] });
      const toks = group("color", { primary: "#000" });
      // GOOD: generateToStrings doesn't need outDir — it returns strings
      const result = t.generateToStrings(toks);
      expect(result.size).toBe(1);
      expect(result.has("tokens.json")).toBe(true);
    });

    test("outDir defaults to process.cwd()", () => {
      const t = new Teikn({ generators: [new Teikn.generators.Json({ version: "test" })] });
      // ACCEPTABLE: defaults to cwd, won't crash but might write to unexpected location
      expect(t.outDir).toBe(process.cwd());
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // 15. validate() with first-class values
  // ──────────────────────────────────────────────────────────────────
  describe("15. validate with first-class values", () => {
    test("validate passes for Dimension values", () => {
      const toks: Token[] = [{ name: "gap", type: "spacing", value: dp(16), group: "spacing" }];
      const result = validate(toks);
      // GOOD: no errors for Dimension values
      expect(result.valid).toBe(true);
    });

    test("validate passes for Duration values", () => {
      const toks: Token[] = [
        { name: "fast", type: "duration", value: dur(200, "ms"), group: "duration" },
      ];
      const result = validate(toks);
      // GOOD: no errors for Duration values
      expect(result.valid).toBe(true);
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // 16. dim() with invalid unit
  // ──────────────────────────────────────────────────────────────────
  describe("16. dim() with invalid unit", () => {
    test("dim() with nonsense unit throws an error", () => {
      // GOOD: dim() now validates the unit at runtime
      expect(() => dim(1, "bananas" as any)).toThrow('dim(): invalid unit "bananas"');
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // 17. Plugin that returns undefined
  // ──────────────────────────────────────────────────────────────────
  describe("17. plugin that returns undefined", () => {
    test("plugin toJSON returning undefined does not crash with default transform", () => {
      class BadPlugin extends Plugin {
        tokenType = /.*/;
        outputType = /.*/;
        toJSON(_token: Token): Token {
          return undefined as any;
        }
      }

      const toks = group("color", { primary: "#000" });
      const t = new Teikn({
        generators: [new Teikn.generators.CssVars({ version: "test" })],
        plugins: [new BadPlugin()],
      });
      // Base class provides a default transform, so a bad toJSON no longer crashes
      expect(() => t.generateToStrings(toks)).not.toThrow();
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // 18. Type mismatches in composite
  // ──────────────────────────────────────────────────────────────────
  describe("18. type mismatches in composite", () => {
    test("composite with string values instead of proper types", () => {
      const toks = composite("typography", {
        heading: {
          fontFamily: "sans-serif",
          fontSize: "not-a-dimension",
          fontWeight: "bold",
          lineHeight: "1.5",
          letterSpacing: "normal",
        },
      });
      // ACCEPTABLE: composite accepts Record<string, TokenValue> and string is a valid TokenValue.
      // No runtime type-checking of individual fields — validate checks shape (field names)
      // but not field value types.
      expect(toks.length).toBe(1);
      const result = validate(toks);
      // validate checks for field presence, not value types
      expect(result.valid).toBe(true);

      const t = new Teikn({
        generators: [new Teikn.generators.CssVars({ version: "test" })],
      });
      const output = t.generateToStrings(toks);
      const css = output.get("tokens.css")!;
      // FOOTGUN: "bold" and "not-a-dimension" pass through as-is. No validation
      // that fontSize should be a Dimension or fontWeight should be a number.
      expect(css).toContain("not-a-dimension");
      expect(css).toContain("bold");
    });
  });
});

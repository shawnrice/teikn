import { describe, expect, test } from "bun:test";

import { composite, dim, dp, dur, group, ref, scale, theme, tokens, onColor } from "./builders";
import { resolveReferences } from "./resolve";
import { Teikn } from "./Teikn";
import type { Token } from "./Token";
import { Color } from "./TokenTypes/Color";
import { Dimension } from "./TokenTypes/Dimension";
import { Duration } from "./TokenTypes/Duration";
import { validate } from "./validate";

// ═══════════════════════════════════════════════════════════════
// validate() errors
// ═══════════════════════════════════════════════════════════════

describe("validate() errors", () => {
  test("circular reference (a refs b refs a)", () => {
    const t: Token[] = [
      { name: "a", type: "color", value: "{b}" },
      { name: "b", type: "color", value: "{a}" },
    ];
    const result = validate(t);
    expect(result.valid).toBe(false);
    const circular = result.issues.find((i) => i.message.includes("Circular reference"));
    expect(circular).toBeDefined();
    expect(circular!.token).toBe("a");
    expect(circular!.message).toContain("a -> b -> a");
    // GOOD ERROR: mentions both token names and shows the full cycle path
  });

  test("three-token circular reference chain", () => {
    const t: Token[] = [
      { name: "a", type: "color", value: "{b}" },
      { name: "b", type: "color", value: "{c}" },
      { name: "c", type: "color", value: "{a}" },
    ];
    const result = validate(t);
    expect(result.valid).toBe(false);
    const circular = result.issues.find((i) => i.message.includes("Circular reference"));
    expect(circular).toBeDefined();
    expect(circular!.message).toContain("a -> b -> c -> a");
    // GOOD ERROR: shows the full chain
  });

  test("invalid ref target (nonexistent token)", () => {
    const t: Token[] = [{ name: "link", type: "color", value: "{doesNotExist}" }];
    const result = validate(t);
    expect(result.valid).toBe(false);
    const unresolved = result.issues.find((i) => i.message.includes("Unresolved reference"));
    expect(unresolved).toBeDefined();
    expect(unresolved!.token).toBe("link");
    expect(unresolved!.message).toContain("doesNotExist");
    // GOOD ERROR: names the token and the missing reference target
  });

  test("duplicate token names", () => {
    const t: Token[] = [
      { name: "primary", type: "color", value: "#000" },
      { name: "primary", type: "color", value: "#fff" },
    ];
    const result = validate(t);
    const dup = result.issues.find((i) => i.message.includes("Duplicate"));
    expect(dup).toBeDefined();
    expect(dup!.token).toBe("primary");
    // OK ERROR: flags the duplicate and names the token, but doesn't say which index or suggest a fix
  });

  test("missing required field: name", () => {
    const t = [{ type: "color", value: "#000" }] as unknown as Token[];
    const result = validate(t);
    expect(result.valid).toBe(false);
    const missing = result.issues.find((i) => i.message.includes("Missing required field: name"));
    expect(missing).toBeDefined();
    expect(missing!.token).toBe("[index 0]");
    // GOOD ERROR: uses index as fallback label when name is missing
  });

  test("missing required field: value", () => {
    const t = [{ name: "broken", type: "color" }] as unknown as Token[];
    const result = validate(t);
    expect(result.valid).toBe(false);
    const missing = result.issues.find((i) => i.message.includes("Missing required field: value"));
    expect(missing).toBeDefined();
    expect(missing!.token).toBe("broken");
    // GOOD ERROR: names the token and the missing field
  });

  test("missing required field: type", () => {
    const t = [{ name: "broken", value: "#000" }] as unknown as Token[];
    const result = validate(t);
    expect(result.valid).toBe(false);
    const missing = result.issues.find((i) => i.message.includes("Missing required field: type"));
    expect(missing).toBeDefined();
    expect(missing!.token).toBe("broken");
    // GOOD ERROR: names the token and the missing field
  });

  test("invalid color string", () => {
    const t: Token[] = [{ name: "bad", type: "color", value: "not-a-color" }];
    const result = validate(t);
    const colorIssue = result.issues.find((i) => i.message.includes("could not be parsed"));
    expect(colorIssue).toBeDefined();
    expect(colorIssue!.token).toBe("bad");
    expect(colorIssue!.message).toContain("not-a-color");
    // GOOD ERROR: shows the bad value and names the token; severity is warning not error
  });

  test("composite missing fields (typography)", () => {
    const t: Token[] = [{ name: "heading", type: "typography", value: { fontFamily: "Arial" } }];
    const result = validate(t);
    const shape = result.issues.find((i) => i.message.includes("missing fields"));
    expect(shape).toBeDefined();
    expect(shape!.token).toBe("heading");
    expect(shape!.message).toContain("fontSize");
    expect(shape!.message).toContain("fontWeight");
    // GOOD ERROR: lists exactly which fields are missing
  });

  test("composite missing fields (border)", () => {
    const t: Token[] = [{ name: "btn", type: "border", value: { width: "1px" } }];
    const result = validate(t);
    const shape = result.issues.find((i) => i.message.includes("missing fields"));
    expect(shape).toBeDefined();
    expect(shape!.message).toContain("style");
    expect(shape!.message).toContain("color");
    // GOOD ERROR: lists missing border fields
  });

  test("empty string value warns", () => {
    const t: Token[] = [{ name: "empty", type: "color", value: "" }];
    const result = validate(t);
    const empty = result.issues.find((i) => i.message.includes("Empty string"));
    expect(empty).toBeDefined();
    expect(empty!.severity).toBe("warning");
    // OK ERROR: warns about empty string but doesn't suggest what to do about it
  });

  test("unresolved reference inside composite field", () => {
    const t: Token[] = [
      {
        name: "border1",
        type: "border",
        value: { width: "1px", style: "solid", color: "{missingColor}" },
      },
    ];
    const result = validate(t);
    expect(result.valid).toBe(false);
    const issue = result.issues.find((i) => i.message.includes("Unresolved reference in field"));
    expect(issue).toBeDefined();
    expect(issue!.message).toContain("color");
    expect(issue!.message).toContain("missingColor");
    // GOOD ERROR: names the field and the missing reference
  });

  test("mode value with invalid reference", () => {
    const t: Token[] = [
      { name: "bg", type: "color", value: "#fff", modes: { dark: "{noSuchToken}" } },
    ];
    const result = validate(t);
    expect(result.valid).toBe(false);
    const issue = result.issues.find((i) => i.message.includes("[mode"));
    expect(issue).toBeDefined();
    expect(issue!.message).toContain('mode "dark"');
    expect(issue!.message).toContain("noSuchToken");
    // GOOD ERROR: identifies the mode and the missing reference
  });

  test("mode value with invalid color", () => {
    const t: Token[] = [
      { name: "bg", type: "color", value: "#fff", modes: { dark: "garbage-color" } },
    ];
    const result = validate(t);
    const issue = result.issues.find((i) => i.message.includes("could not be parsed"));
    expect(issue).toBeDefined();
    expect(issue!.message).toContain('mode "dark"');
    expect(issue!.message).toContain("garbage-color");
    // GOOD ERROR: identifies the mode and the bad color value
  });

  test("circular reference in mode values", () => {
    const t: Token[] = [
      { name: "a", type: "color", value: "#fff", modes: { dark: "{b}" } },
      { name: "b", type: "color", value: "#000", modes: { dark: "{a}" } },
    ];
    const result = validate(t);
    const circular = result.issues.find((i) => i.message.includes("Circular reference"));
    expect(circular).toBeDefined();
    // GOOD ERROR: catches circular references through modes
  });

  test("token with null value", () => {
    const t = [{ name: "nully", type: "color", value: null }] as unknown as Token[];
    const result = validate(t);
    expect(result.valid).toBe(false);
    const issue = result.issues.find((i) => i.message.includes("Missing required field: value"));
    expect(issue).toBeDefined();
    // GOOD ERROR: treats null as missing value
  });

  test("validate returns valid:true for correct tokens", () => {
    const t: Token[] = [{ name: "ok", type: "color", value: "#ff0000" }];
    const result = validate(t);
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
    // (baseline check — not an error path)
  });
});

// ═══════════════════════════════════════════════════════════════
// Builder errors
// ═══════════════════════════════════════════════════════════════

describe("Builder errors", () => {
  test("group() with non-object second arg", () => {
    // GOOD ERROR: group() now validates entries at runtime
    expect(() => group("color", "not-an-object" as any)).toThrow(
      /group\(\): entries must be a plain object/,
    );
  });

  test("group() with null entries", () => {
    expect(() => group("color", null as any)).toThrow(/group\(\): entries must be a plain object/);
    // GOOD ERROR: now throws a teikn-specific TypeError instead of a raw JS TypeError
  });

  test("scale() with empty array", () => {
    const result = scale("spacing", []);
    expect(result).toHaveLength(0);
    // NO ERROR: silently returns empty array — arguably correct but could warn
  });

  test("scale() with numeric array and no names", () => {
    const result = scale("spacing", [4, 8, 16]);
    expect(result.map((t) => t.name)).toEqual(["0", "1", "2"]);
    // OK ERROR: falls back to indices as names — functional but not great DX
  });

  test("composite() with non-object entries value", () => {
    const result = composite("typography", { heading: "not-a-composite" as any });
    expect(result[0]!.value).toBe("not-a-composite");
    // NO ERROR: silently accepts a string where a composite object is expected
  });

  test("theme() referencing token not in source group", () => {
    const colors = group("color", { primary: "#000" });
    expect(() => theme("dark", colors, { nonexistent: "#fff" })).toThrow(
      /unknown token "nonexistent"/,
    );
    // GOOD ERROR: names the bad token and lists available tokens
  });

  test("theme() error message lists available tokens", () => {
    const colors = group("color", { primary: "#000", secondary: "#fff" });
    try {
      theme("dark", colors, { missing: "#111" });
      expect(true).toBe(false); // should not reach
    } catch (e: any) {
      expect(e.message).toContain("primary");
      expect(e.message).toContain("secondary");
      expect(e.message).toContain('Theme "dark"');
    }
    // GOOD ERROR: includes theme name, bad token name, and available token names
  });

  test("theme() chained from another theme with bad token", () => {
    const colors = group("color", { primary: "#000" });
    const dark = theme("dark", colors, { primary: "#111" });
    expect(() => theme("high-contrast", dark, { bogus: "#fff" })).toThrow(/unknown token "bogus"/);
    // GOOD ERROR: works correctly with chained themes
  });

  test("dp() with NaN", () => {
    // GOOD ERROR: dp() now validates the input value
    expect(() => dp(NaN)).toThrow(/dp\(\): value must be a finite number/);
  });

  test("dp() with Infinity", () => {
    // GOOD ERROR: dp() now rejects Infinity
    expect(() => dp(Infinity)).toThrow(/dp\(\): value must be a finite number/);
  });

  test("dim() with NaN", () => {
    // GOOD ERROR: dim() now validates the input value
    expect(() => dim(NaN, "px")).toThrow(/dim\(\): value must be a finite number/);
  });

  test("dur() with NaN", () => {
    // GOOD ERROR: dur() now validates the input value
    expect(() => dur(NaN, "ms")).toThrow(/dur\(\): value must be a finite number/);
  });

  test("dur() with negative value", () => {
    // Negative durations are valid (e.g., animation-delay can be negative)
    const result = dur(-100, "ms");
    expect(result).toBeInstanceOf(Duration);
  });

  test("ref() with empty string", () => {
    // GOOD ERROR: ref() now validates eagerly instead of deferring the error
    expect(() => ref("")).toThrow(/ref\(\): token name must be a non-empty string/);
  });
});

// ═══════════════════════════════════════════════════════════════
// Color constructor errors
// ═══════════════════════════════════════════════════════════════

describe("Color constructor errors", () => {
  test("invalid color string throws", () => {
    expect(() => new Color("not-a-color")).toThrow(/Cannot extract color/);
    // OK ERROR: says it can't parse but doesn't suggest valid formats
  });

  test("empty string throws", () => {
    expect(() => new Color("")).toThrow();
    // OK ERROR: throws but the message could be more specific
  });

  test("rgb with out-of-range values does not throw", () => {
    // Color clamps or accepts silently — let's see
    const c = new Color(999, -50, 300);
    expect(c).toBeDefined();
    // NO ERROR: silently accepts out-of-range RGB values — no clamping warning
  });
});

// ═══════════════════════════════════════════════════════════════
// Dimension / Duration constructor errors
// ═══════════════════════════════════════════════════════════════

describe("Dimension/Duration constructor errors", () => {
  test("Dimension from invalid CSS string throws", () => {
    expect(() => new Dimension("banana" as any)).toThrow(/Invalid dimension/);
    // OK ERROR: says "Invalid dimension" but doesn't list valid units
  });

  test("Duration from invalid CSS string throws", () => {
    expect(() => new Duration("banana" as any)).toThrow(/Invalid duration/);
    // OK ERROR: says "Invalid duration" but doesn't list valid units
  });

  test("Dimension from CSS string with unsupported unit", () => {
    expect(() => new Dimension("10xyz" as any)).toThrow(/Invalid dimension/);
    // OK ERROR: could suggest valid units
  });
});

// ═══════════════════════════════════════════════════════════════
// Generator errors
// ═══════════════════════════════════════════════════════════════

describe("Generator errors", () => {
  test("generator receiving empty token array produces output", () => {
    const gen = new Teikn.generators.Json();
    const result = gen.generate([], []);
    expect(typeof result).toBe("string");
    // NO ERROR: produces valid but empty output — could warn that no tokens were provided
  });

  test("generator receiving tokens with undefined values", () => {
    const t: Token[] = [{ name: "broken", type: "color", value: undefined }];
    const gen = new Teikn.generators.CssVars();
    // Should not crash
    const result = gen.generate(t, []);
    expect(typeof result).toBe("string");
    // NO ERROR: silently produces output with undefined values
  });

  test("generator with missing ext option throws", () => {
    expect(() => new Teikn.generators.Json({ ext: undefined as any })).toThrow(
      /received option ext/,
    );
    // GOOD ERROR: names the option and says what type was expected
  });

  test("CssVars generator with custom filename", () => {
    const gen = new Teikn.generators.CssVars({ filename: "custom" });
    expect(gen.file).toBe("custom.css");
    // (baseline — not an error path)
  });
});

// ═══════════════════════════════════════════════════════════════
// Teikn class errors
// ═══════════════════════════════════════════════════════════════

describe("Teikn class errors", () => {
  test("new Teikn({}) with no generators defaults to Json", () => {
    const t = new Teikn({});
    expect(t.generators).toHaveLength(1);
    expect(t.generators[0]).toBeInstanceOf(Teikn.generators.Json);
    // NO ERROR: silently defaults to Json generator — this is actually good behavior
  });

  test("new Teikn with no outDir defaults to cwd", () => {
    const t = new Teikn({});
    expect(t.outDir).toBe(process.cwd());
    // NO ERROR: defaults to cwd — reasonable behavior
  });

  test("PrefixTypePlugin throws helpful deprecation error", () => {
    expect(
      () =>
        new Teikn({
          plugins: [new Teikn.plugins.PrefixTypePlugin({})],
        }),
    ).toThrow(/no longer needed/);
    // GOOD ERROR: explains the plugin is deprecated AND suggests what to use instead
  });

  test("PrefixTypePlugin error suggests StripTypePrefixPlugin", () => {
    try {
      new Teikn({
        plugins: [new Teikn.plugins.PrefixTypePlugin({})],
      });
    } catch (e: any) {
      expect(e.message).toContain("StripTypePrefixPlugin");
      expect(e.message).toContain("Remove it from your plugins array");
    }
    // GOOD ERROR: actionable guidance with exact alternative
  });

  test("generateToStrings with empty tokens", () => {
    const t = new Teikn({ generators: [new Teikn.generators.CssVars()] });
    const result = t.generateToStrings([]);
    expect(result.size).toBe(1);
    expect(typeof result.get("tokens.css")).toBe("string");
    // NO ERROR: produces valid but empty output — could warn
  });

  test("validate() via Teikn instance works", () => {
    const t = new Teikn({});
    const result = t.validate([{ name: "a", type: "color", value: "{nonexistent}" }]);
    expect(result.valid).toBe(false);
    // GOOD ERROR: validate() is accessible and returns structured issues
  });
});

// ═══════════════════════════════════════════════════════════════
// Resolution errors
// ═══════════════════════════════════════════════════════════════

describe("Resolution errors (resolveReferences)", () => {
  test("circular reference (a -> b -> a) throws", () => {
    const t: Token[] = [
      { name: "a", type: "color", value: "{b}" },
      { name: "b", type: "color", value: "{a}" },
    ];
    expect(() => resolveReferences(t)).toThrow(/Circular reference detected/);
    // GOOD ERROR: throws with both token names
  });

  test("circular reference error mentions both tokens", () => {
    const t: Token[] = [
      { name: "alpha", type: "color", value: "{beta}" },
      { name: "beta", type: "color", value: "{alpha}" },
    ];
    try {
      resolveReferences(t);
      expect(true).toBe(false);
    } catch (e: any) {
      expect(e.message).toContain("alpha");
      expect(e.message).toContain("beta");
    }
    // GOOD ERROR: includes both token names in the error message
  });

  test("deep circular reference chain throws", () => {
    const t: Token[] = [
      { name: "a", type: "color", value: "{b}" },
      { name: "b", type: "color", value: "{c}" },
      { name: "c", type: "color", value: "{a}" },
    ];
    expect(() => resolveReferences(t)).toThrow(/Circular reference/);
    // GOOD ERROR: detected even through deep chains
  });

  test("ref to nonexistent token throws", () => {
    const t: Token[] = [{ name: "link", type: "color", value: "{missing}" }];
    expect(() => resolveReferences(t)).toThrow(/Unresolved reference/);
    // GOOD ERROR: names the reference and the token
  });

  test("ref to nonexistent token error includes token name", () => {
    const t: Token[] = [{ name: "link", type: "color", value: "{missing}" }];
    try {
      resolveReferences(t);
      expect(true).toBe(false);
    } catch (e: any) {
      expect(e.message).toContain("missing");
      expect(e.message).toContain("link");
    }
    // GOOD ERROR: says which token has the broken ref and what it was trying to reference
  });

  test("ref in composite field to nonexistent token throws", () => {
    const t: Token[] = [
      {
        name: "border1",
        type: "border",
        value: { width: "1px", style: "solid", color: "{noColor}" },
      },
    ];
    expect(() => resolveReferences(t)).toThrow(/Unresolved reference/);
    // GOOD ERROR: catches references nested inside composite values
  });

  test("ref in mode value to nonexistent token throws", () => {
    const t: Token[] = [{ name: "bg", type: "color", value: "#fff", modes: { dark: "{noToken}" } }];
    expect(() => resolveReferences(t)).toThrow(/Unresolved reference/);
    // GOOD ERROR: catches bad references in mode values
  });

  test("self-referencing token throws", () => {
    const t: Token[] = [{ name: "self", type: "color", value: "{self}" }];
    expect(() => resolveReferences(t)).toThrow(/Circular reference/);
    // GOOD ERROR: detects self-reference as circular
  });

  test("valid alias chain resolves", () => {
    const t: Token[] = [
      { name: "base", type: "color", value: "#ff0000" },
      { name: "alias1", type: "color", value: "{base}" },
      { name: "alias2", type: "color", value: "{alias1}" },
    ];
    const resolved = resolveReferences(t);
    expect(resolved[2]!.value).toBe("#ff0000");
    // (baseline — not an error path)
  });
});

// ═══════════════════════════════════════════════════════════════
// Integration: validate + resolve interaction
// ═══════════════════════════════════════════════════════════════

describe("validate vs resolve interaction", () => {
  test("validate catches issues that would crash resolve", () => {
    const t: Token[] = [
      { name: "a", type: "color", value: "{b}" },
      { name: "b", type: "color", value: "{a}" },
    ];
    // validate returns structured issues
    const result = validate(t);
    expect(result.valid).toBe(false);
    // resolve throws
    expect(() => resolveReferences(t)).toThrow();
    // OK ERROR: both catch the issue, but validate is non-throwing while resolve throws.
    // Users who skip validate() get an unstructured throw instead of a nice report.
  });

  test("tokens with missing name crash resolve", () => {
    const t = [{ type: "color", value: "#000" }] as unknown as Token[];
    // validate catches it
    const result = validate(t);
    expect(result.valid).toBe(false);
    // resolve doesn't crash on these (no refs to resolve), but produces tokens with undefined name
    const resolved = resolveReferences(t);
    expect(resolved[0]!.name).toBeUndefined();
    // NO ERROR: resolve silently passes through invalid tokens — relies on validate being called first
  });
});

// ═══════════════════════════════════════════════════════════════
// Edge cases
// ═══════════════════════════════════════════════════════════════

describe("Edge cases", () => {
  test("tokens() merging with empty arrays", () => {
    const result = tokens([], [], []);
    expect(result).toHaveLength(0);
    // NO ERROR: returns empty — correct behavior
  });

  test("group() with special characters in token names", () => {
    const result = group("color", { "has spaces": "#000", "has/slash": "#fff" });
    expect(result[0]!.name).toBe("has spaces");
    expect(result[1]!.name).toBe("has/slash");
    // NO ERROR: accepts any string as token name — could cause issues in CSS var names later
  });

  test("ref creates correct reference format", () => {
    const result = ref("primary");
    expect(result.value).toBe("{primary}");
    // (baseline)
  });

  test("validate with completely empty array", () => {
    const result = validate([]);
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
    // NO ERROR: empty array is valid — debatable but consistent
  });

  test("onColor with invalid color string throws", () => {
    expect(() => onColor("not-a-color")).toThrow();
    // CRASH: Color constructor throws — error message is from Color, not from onColor
    // OK ERROR: the underlying Color error propagates but loses the onColor context
  });
});

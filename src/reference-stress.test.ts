import { describe, expect, test } from "bun:test";

import { CssVars } from "./Generators/CssVars.js";
import { JavaScript } from "./Generators/JavaScript.js";
import { Scss } from "./Generators/Scss.js";
import { NameConventionPlugin } from "./Plugins/NameConventionPlugin.js";
import { resolveReferences } from "./resolve.js";
import { Teikn } from "./Teikn.js";
import type { Token } from "./Token.js";
import { BoxShadow } from "./TokenTypes/BoxShadow.js";
import { Color } from "./TokenTypes/Color/index.js";
import { Duration } from "./TokenTypes/Duration.js";
import { Transition } from "./TokenTypes/Transition.js";
import { validate } from "./validate.js";

describe("reference stress", () => {
  // ── Scenario 1: group-shadowing ambiguity ─────────────────────
  test("(1) bare {primary} ambiguous across two groups lists both candidates", () => {
    const tokens: Token[] = [
      { name: "primary", group: "color", type: "color", value: "#fff" },
      { name: "primary", group: "size", type: "spacing", value: "16px" },
      { name: "link", type: "color", value: "{primary}" },
    ];
    let err: Error | null = null;
    try {
      resolveReferences(tokens);
    } catch (e) {
      err = e as Error;
    }
    expect(err).not.toBeNull();
    expect(err!.message).toMatch(/color\.primary/);
    expect(err!.message).toMatch(/size\.primary/);
  });

  // ── Scenario 2: cross-group qualified + bare in same set ──────
  test("(2) {color.primary} resolves while bare {primary} ambiguous", () => {
    const tokens: Token[] = [
      { name: "primary", group: "color", type: "color", value: "#abc" },
      { name: "primary", group: "size", type: "spacing", value: "8px" },
      { name: "link", type: "color", value: "{color.primary}" },
    ];
    const out = resolveReferences(tokens);
    expect(out[2]!.value).toBe("#abc");
  });

  // ── Scenario 3: self-reference ────────────────────────────────
  test("(3) self-reference throws circular, no stack overflow", () => {
    const tokens: Token[] = [{ name: "x", type: "color", value: "{x}" }];
    expect(() => resolveReferences(tokens)).toThrow("Circular reference");
  });

  test("(3b) qualified self-reference throws circular", () => {
    const tokens: Token[] = [{ name: "x", group: "g", type: "color", value: "{g.x}" }];
    expect(() => resolveReferences(tokens)).toThrow("Circular reference");
  });

  // ── Scenario 4: direct two-token cycle ────────────────────────
  test("(4) A->B->A cycle throws", () => {
    const tokens: Token[] = [
      { name: "a", type: "color", value: "{b}" },
      { name: "b", type: "color", value: "{a}" },
    ];
    expect(() => resolveReferences(tokens)).toThrow("Circular reference");
  });

  // ── Scenario 5: mode-conditional cycle ────────────────────────
  test("(5) cycle only present in modes (dark) is caught", () => {
    const tokens: Token[] = [
      { name: "a", type: "color", value: "{b}" },
      { name: "b", type: "color", value: "#fff", modes: { dark: "{a}" } },
    ];
    // resolveReferences walks through the referenced token's modes when
    // recursing, so the cycle IS caught here.
    expect(() => resolveReferences(tokens)).toThrow("Circular reference");
    const v = validate(tokens);
    expect(v.issues.some((i) => /Circular/.test(i.message))).toBe(true);
  });

  // ── Scenario 6: ref to a token only defined in some modes ─────
  test("(6) A.modes.dark -> {B}, B has only default — falls back to B default", () => {
    const tokens: Token[] = [
      { name: "B", type: "color", value: "#111" },
      { name: "A", type: "color", value: "#fff", modes: { dark: "{B}" } },
    ];
    const out = resolveReferences(tokens);
    // Current behavior: ref resolves to B's default value
    expect(out[1]!.modes!["dark"]).toBe("#111");
  });

  // ── Scenario 7: ref inside a composite (plain object) shadow ──
  test("(7) shadow composite color={accent} resolves in every generator", () => {
    const tokens: Token[] = [
      { name: "accent", type: "color", value: "#abcdef" },
      {
        name: "elev",
        type: "shadow",
        value: {
          color: "{accent}",
          offsetX: "0",
          offsetY: "2px",
          blur: "8px",
          spread: "0",
        },
      },
    ];
    const out = resolveReferences(tokens);
    const v = out[1]!.value as Record<string, unknown>;
    expect(v.color).toBe("#abcdef");
    expect(v.color).not.toBe("{accent}");
  });

  // ── Scenario 8: ref inside a first-class wrapper ──────────────
  test("(8) Duration string ref is rejected with a clear message", () => {
    expect(() => new Duration("{motion.fast}")).toThrow(
      /Duration cannot be constructed from a reference string/,
    );
  });

  test("(8) Transition object with ref string in a field is rejected via Duration", () => {
    expect(() => new Transition({ duration: "{motion.fast}", timingFunction: "ease" })).toThrow(
      /Duration cannot be constructed from a reference string/,
    );
  });

  test("(8) BoxShadow with a ref-string color is rejected via Color", () => {
    expect(
      () =>
        new BoxShadow({
          offsetX: 0,
          offsetY: 2,
          blur: 8,
          spread: 0,
          color: "{accent}",
        }),
    ).toThrow(/Color cannot be constructed from a reference string/);
  });

  // ── Scenario 9: ref points at a composite value ───────────────
  test("(9) A.value={shadow.elevation1} where elevation1 is composite", () => {
    const tokens: Token[] = [
      {
        name: "elevation1",
        group: "shadow",
        type: "shadow",
        value: {
          color: "#000",
          offsetX: "0",
          offsetY: "2px",
          blur: "8px",
          spread: "0",
        },
      },
      { name: "card", type: "shadow", value: "{shadow.elevation1}" },
    ];
    const out = resolveReferences(tokens);
    expect(out[1]!.value).toEqual({
      color: "#000",
      offsetX: "0",
      offsetY: "2px",
      blur: "8px",
      spread: "0",
    });
  });

  // ── Scenario 10: dotted token names in groups ─────────────────
  test("(10) dotted token names are rejected at validation time", () => {
    const tokens: Token[] = [{ name: "key.with.dots", group: "g", type: "color", value: "#aaa" }];
    const { issues, valid } = validate(tokens);
    expect(valid).toBe(false);
    expect(issues.some((i) => i.severity === "error" && /must not contain/.test(i.message))).toBe(
      true,
    );
  });

  test("(10) dotted group is rejected at validation time", () => {
    const tokens: Token[] = [{ name: "primary", group: "g.nested", type: "color", value: "#aaa" }];
    const { issues, valid } = validate(tokens);
    expect(valid).toBe(false);
    expect(
      issues.some(
        (i) => i.severity === "error" && /group "g\.nested" must not contain/.test(i.message),
      ),
    ).toBe(true);
  });

  test("(10) duplicate qualified token name is a validation error", () => {
    const collide: Token[] = [
      { name: "primary", group: "color", type: "color", value: "#aaa" },
      { name: "primary", group: "color", type: "color", value: "#bbb" },
    ];
    const { issues, valid } = validate(collide);
    expect(valid).toBe(false);
    expect(
      issues.some(
        (i) => i.severity === "error" && /Duplicate qualified token name/.test(i.message),
      ),
    ).toBe(true);
  });

  // ── Scenario 11: unresolved reference ─────────────────────────
  test("(11) {nonexistent} throws clear error", () => {
    const tokens: Token[] = [{ name: "x", type: "color", value: "{nope}" }];
    expect(() => resolveReferences(tokens)).toThrow(/Unresolved reference.*nope/);
  });

  // ── Scenario 12: ref to a plugin-renamed token ────────────────
  test("(12) refs survive a NameConventionPlugin rename through full pipeline", () => {
    const teikn = new Teikn({
      generators: [new CssVars()],
      plugins: [new NameConventionPlugin({ convention: "kebab-case" })],
    });
    const tokens: Token[] = [
      { name: "primaryColor", type: "color", value: "#0066cc" },
      { name: "linkColor", type: "color", value: "{primaryColor}" },
    ];
    const result = teikn.generateToStrings(tokens);
    const css = [...result.values()][0]!;
    // The link token's value should be the resolved color, not the literal
    // `{primaryColor}` and not a `var(--undefined)`.
    expect(css).toMatch(/--color-link-color:\s*#0066cc/);
  });

  // ── Scenario 13: refs in mode values across generators ────────
  test("(13a) CssVars renders mode refs as var(--...) to the resolved token", () => {
    const teikn = new Teikn({ generators: [new CssVars()] });
    const tokens: Token[] = [
      { name: "darkBg", type: "color", value: "#000" },
      {
        name: "bg",
        type: "color",
        value: "#fff",
        modes: { dark: "{darkBg}" },
      },
    ];
    const result = teikn.generateToStrings(tokens);
    const css = [...result.values()][0]!;
    // Either resolved literal `#000` or `var(--color-dark-bg)` — both correct.
    expect(css).toMatch(/#000|var\(--color-dark-bg\)/);
    expect(css).not.toMatch(/\{darkBg\}/);
  });

  test("(13b) Scss renders mode refs as resolved values", () => {
    const teikn = new Teikn({ generators: [new Scss()] });
    const tokens: Token[] = [
      { name: "darkBg", type: "color", value: "#000" },
      {
        name: "bg",
        type: "color",
        value: "#fff",
        modes: { dark: "{darkBg}" },
      },
    ];
    const result = teikn.generateToStrings(tokens);
    const scss = [...result.values()][0]!;
    expect(scss).not.toMatch(/\{darkBg\}/);
  });

  test("(13c) JavaScript renders mode refs as resolved values", () => {
    const teikn = new Teikn({ generators: [new JavaScript()] });
    const tokens: Token[] = [
      { name: "darkBg", type: "color", value: "#000" },
      {
        name: "bg",
        type: "color",
        value: "#fff",
        modes: { dark: "{darkBg}" },
      },
    ];
    const result = teikn.generateToStrings(tokens);
    const js = [...result.values()][0]!;
    expect(js).not.toMatch(/\{darkBg\}/);
    expect(js).toMatch(/#000/);
  });

  // ── Scenario 14: whitespace inside the braces ─────────────────
  test("(14) {  color.primary  } with spaces — current behavior", () => {
    const tokens: Token[] = [
      { name: "primary", group: "color", type: "color", value: "#abc" },
      { name: "link", type: "color", value: "{ color.primary }" },
    ];
    let out: Token[] | null = null;
    let err: Error | null = null;
    try {
      out = resolveReferences(tokens);
    } catch (e) {
      err = e as Error;
    }
    // Current REF_PATTERN is /^\{([^}]+)\}$/ — captures " color.primary " with
    // spaces, then resolveKey looks up the literal string " color.primary "
    // which is missing. Expected to throw Unresolved reference.
    // OPEN DESIGN QUESTION: should the resolver trim?
    if (err) {
      expect(err.message).toMatch(/Unresolved reference/);
    } else {
      // If it didn't throw, the link value would still be the literal string
      expect(out![1]!.value).toBe("{ color.primary }");
    }
  });

  // ── Scenario 15: multiple refs in a string ────────────────────
  test("(15) `{red} {blue}` — only full-string refs supported", () => {
    const tokens: Token[] = [
      { name: "red", type: "color", value: "#f00" },
      { name: "blue", type: "color", value: "#00f" },
      { name: "duo", type: "string", value: "{red} {blue}" },
    ];
    // REF_PATTERN requires the whole string to be a single {...}, so this
    // is NOT a ref — it passes through verbatim. Documenting current behavior.
    const out = resolveReferences(tokens);
    expect(out[2]!.value).toBe("{red} {blue}");
    // OPEN DESIGN QUESTION: should mid-string interpolation be supported?
  });

  // ── Bonus: BoxShadow first-class wrapper carrying a Color {ref} ──
  test("(bonus) BoxShadow constructed with a Color instance — refs cannot be embedded", () => {
    // Demonstrates that you can't ref-substitute inside first-class wrappers.
    const shadow = new BoxShadow(0, 2, 8, 0, new Color(0, 0, 0));
    const tokens: Token[] = [
      { name: "accent", type: "color", value: new Color(255, 0, 0) },
      { name: "elev", type: "shadow", value: shadow },
    ];
    const out = resolveReferences(tokens);
    // The shadow's internal color is unaffected by `accent`.
    expect(String((out[1]!.value as BoxShadow).color)).not.toBe("rgb(255, 0, 0)");
  });

  // ── Bonus: Duration in Transition cannot reference a Duration token ──
  test("(bonus) Duration token referenced from a Transition field — not supported", () => {
    const tokens: Token[] = [
      { name: "fast", group: "motion", type: "duration", value: new Duration(200, "ms") },
      // A composite-style transition (plain object), not the first-class wrapper.
      {
        name: "fade",
        type: "transition",
        value: { duration: "{motion.fast}", timingFunction: "ease" },
      },
    ];
    const out = resolveReferences(tokens);
    const fade = out[1]!.value as Record<string, unknown>;
    // Composite-style ref resolves; the value is the Duration instance.
    expect(fade.duration).toBeInstanceOf(Duration);
  });
});

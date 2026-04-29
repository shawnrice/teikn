import { describe, expect, test } from "bun:test";

import { resolveReferences } from "./resolve.js";
import type { Token } from "./Token.js";
import { BoxShadow, BoxShadowList } from "./TokenTypes/BoxShadow.js";
import { Color } from "./TokenTypes/Color/index.js";
import { CubicBezier } from "./TokenTypes/CubicBezier.js";
import { LinearGradient, RadialGradient } from "./TokenTypes/Gradient.js";
import { Transition } from "./TokenTypes/Transition.js";

describe("resolveReferences", () => {
  test("resolves simple references", () => {
    const tokens: Token[] = [
      { name: "primary", type: "color", value: "#0066cc" },
      { name: "link", type: "color", value: "{primary}" },
    ];

    const result = resolveReferences(tokens);
    expect(result[1]!.value).toBe("#0066cc");
  });

  test("resolves chained references", () => {
    const tokens: Token[] = [
      { name: "base", type: "color", value: "#0066cc" },
      { name: "primary", type: "color", value: "{base}" },
      { name: "link", type: "color", value: "{primary}" },
    ];

    const result = resolveReferences(tokens);
    expect(result[2]!.value).toBe("#0066cc");
  });

  test("leaves non-reference values unchanged", () => {
    const tokens: Token[] = [
      { name: "primary", type: "color", value: "#0066cc" },
      { name: "size", type: "spacing", value: "1rem" },
    ];

    const result = resolveReferences(tokens);
    expect(result[0]!.value).toBe("#0066cc");
    expect(result[1]!.value).toBe("1rem");
  });

  test("throws on circular references", () => {
    const tokens: Token[] = [
      { name: "a", type: "color", value: "{b}" },
      { name: "b", type: "color", value: "{a}" },
    ];

    expect(() => resolveReferences(tokens)).toThrow("Circular reference");
  });

  test("circular reference error includes the full chain, not just the last hop", () => {
    const tokens: Token[] = [
      { name: "a", type: "color", value: "{b}" },
      { name: "b", type: "color", value: "{c}" },
      { name: "c", type: "color", value: "{a}" },
    ];

    expect(() => resolveReferences(tokens)).toThrow(/a\s*->\s*b\s*->\s*c\s*->\s*a/);
  });

  test("chained-ref unresolved error reports the qualified name of the source token", () => {
    const tokens: Token[] = [
      { name: "primary", type: "color", group: "color", value: "{missing}" },
      { name: "link", type: "color", value: "{color.primary}" },
    ];

    expect(() => resolveReferences(tokens)).toThrow(/color\.primary/);
  });

  test("throws on unresolved references", () => {
    const tokens: Token[] = [{ name: "link", type: "color", value: "{nonexistent}" }];

    expect(() => resolveReferences(tokens)).toThrow("Unresolved reference");
  });

  test("throws on ambiguous bare references across groups", () => {
    const tokens: Token[] = [
      { name: "primary", type: "color", group: "color", value: "#0066cc" },
      { name: "primary", type: "size", group: "size", value: "16px" },
      { name: "link", type: "color", value: "{primary}" },
    ];

    expect(() => resolveReferences(tokens)).toThrow("Ambiguous token reference");
  });

  test("qualified reference disambiguates an otherwise-ambiguous bare name", () => {
    const tokens: Token[] = [
      { name: "primary", type: "color", group: "color", value: "#0066cc" },
      { name: "primary", type: "size", group: "size", value: "16px" },
      { name: "link", type: "color", value: "{color.primary}" },
    ];

    const resolved = resolveReferences(tokens);
    expect(resolved[2]!.value).toBe("#0066cc");
  });

  test("qualified reference works even when the bare name is unique", () => {
    const tokens: Token[] = [
      { name: "primary", type: "color", group: "color", value: "#0066cc" },
      { name: "link", type: "color", value: "{color.primary}" },
    ];

    const resolved = resolveReferences(tokens);
    expect(resolved[1]!.value).toBe("#0066cc");
  });

  test("tokens with only literal modes preserve object identity through resolveReferences", () => {
    const tokens: Token[] = [
      {
        name: "surface",
        type: "color",
        value: "#ffffff",
        modes: { dark: "#1a1a1a" },
      },
    ];

    const result = resolveReferences(tokens);
    expect(result[0]).toBe(tokens[0]);
  });

  test("composite __proto__ field is stored as a data property, not a prototype setter", () => {
    const payload = JSON.parse('{"__proto__": {"polluted": true}}');
    const tokens: Token[] = [{ name: "obj", type: "composite", value: payload }];
    const result = resolveReferences(tokens);
    const resolvedValue = result[0]!.value as Record<string, unknown>;

    // The `__proto__` entry should be a data property, not swallowed
    // by the setter. `resolvedValue.polluted` should be undefined
    // (would be `true` via prototype inheritance if the setter fired).
    expect(resolvedValue.polluted).toBeUndefined();
  });

  test("composite fields can reference the same token without spurious circular error", () => {
    const tokens: Token[] = [
      { name: "primary", type: "color", value: "#0066cc" },
      {
        name: "banner",
        type: "typography",
        value: {
          fontFamily: "Inter",
          fontSize: "1rem",
          fontWeight: 400,
          lineHeight: 1.2,
          color: "{primary}",
          background: "{primary}",
        },
      },
    ];

    const resolved = resolveReferences(tokens);
    const banner = resolved[1]!.value as Record<string, unknown>;
    expect(banner.color).toBe("#0066cc");
    expect(banner.background).toBe("#0066cc");
  });

  test("does not mutate original tokens", () => {
    const tokens: Token[] = [
      { name: "primary", type: "color", value: "#0066cc" },
      { name: "link", type: "color", value: "{primary}" },
    ];

    const result = resolveReferences(tokens);
    expect(tokens[1]!.value).toBe("{primary}");
    expect(result[1]!.value).toBe("#0066cc");
  });

  test("CubicBezier values are NOT destructured as composites", () => {
    const cb = new CubicBezier(0.4, 0, 0.2, 1);
    const tokens: Token[] = [{ name: "easing", type: "timing", value: cb }];
    const result = resolveReferences(tokens);
    expect(result[0]!.value).toBe(cb);
  });

  test("BoxShadow values are NOT destructured as composites", () => {
    const shadow = new BoxShadow(0, 2, 8, 0, new Color(0, 0, 0));
    const tokens: Token[] = [{ name: "shadow", type: "shadow", value: shadow }];
    const result = resolveReferences(tokens);
    expect(result[0]!.value).toBe(shadow);
  });

  test("Transition values are NOT destructured as composites", () => {
    const t = new Transition("0.2s", "ease");
    const tokens: Token[] = [{ name: "fade", type: "transition", value: t }];
    const result = resolveReferences(tokens);
    expect(result[0]!.value).toBe(t);
  });

  test("LinearGradient values are NOT destructured as composites", () => {
    const lg = new LinearGradient(180, [
      [new Color(255, 0, 0), "0%"],
      [new Color(0, 0, 255), "100%"],
    ]);
    const tokens: Token[] = [{ name: "grad", type: "gradient", value: lg }];
    const result = resolveReferences(tokens);
    expect(result[0]!.value).toBe(lg);
  });

  test("RadialGradient values are NOT destructured as composites", () => {
    const rg = new RadialGradient({ shape: "circle" }, [
      new Color(255, 0, 0),
      new Color(0, 0, 255),
    ]);
    const tokens: Token[] = [{ name: "radGrad", type: "gradient", value: rg }];
    const result = resolveReferences(tokens);
    expect(result[0]!.value).toBe(rg);
  });

  test("Color values are NOT destructured as composites", () => {
    const c = new Color(255, 0, 0);
    const tokens: Token[] = [{ name: "red", type: "color", value: c }];
    const result = resolveReferences(tokens);
    expect(result[0]!.value).toBe(c);
  });

  test("composite values with nested references get resolved", () => {
    const tokens: Token[] = [
      { name: "bodyFont", type: "font-family", value: "Inter" },
      {
        name: "bodyText",
        type: "typography",
        value: { fontFamily: "{bodyFont}", fontSize: "2rem" },
      },
    ];
    const result = resolveReferences(tokens);
    expect(result[1]!.value).toEqual({ fontFamily: "Inter", fontSize: "2rem" });
  });

  test("deeply nested composite references get resolved", () => {
    const tokens: Token[] = [
      { name: "base", type: "color", value: "#333" },
      {
        name: "card",
        type: "border",
        value: { width: "1px", style: "solid", color: "{base}" },
      },
    ];
    const result = resolveReferences(tokens);
    expect(result[1]!.value).toEqual({ width: "1px", style: "solid", color: "#333" });
  });

  // ─── Mode resolution ──────────────────────────────────────────

  test("resolves references in mode values", () => {
    const tokens: Token[] = [
      { name: "primary", type: "color", value: "#0066cc" },
      { name: "darkPrimary", type: "color", value: "#3399ff" },
      {
        name: "surface",
        type: "color",
        value: "#ffffff",
        modes: { dark: "{darkPrimary}" },
      },
    ];

    const result = resolveReferences(tokens);
    expect(result[2]!.modes!["dark"]).toBe("#3399ff");
  });

  test("leaves non-reference mode values unchanged", () => {
    const tokens: Token[] = [
      {
        name: "surface",
        type: "color",
        value: "#ffffff",
        modes: { dark: "#1a1a1a" },
      },
    ];

    const result = resolveReferences(tokens);
    expect(result[0]!.modes!["dark"]).toBe("#1a1a1a");
  });

  test("throws on unresolved mode references", () => {
    const tokens: Token[] = [
      {
        name: "surface",
        type: "color",
        value: "#ffffff",
        modes: { dark: "{nonexistent}" },
      },
    ];

    expect(() => resolveReferences(tokens)).toThrow("Unresolved reference");
  });

  test("throws on circular references in modes", () => {
    const tokens: Token[] = [
      {
        name: "a",
        type: "color",
        value: "#000",
        modes: { dark: "{a}" },
      },
    ];

    expect(() => resolveReferences(tokens)).toThrow("Circular reference");
  });

  test("tokens without modes are returned unchanged", () => {
    const tokens: Token[] = [{ name: "primary", type: "color", value: "#0066cc" }];

    const result = resolveReferences(tokens);
    expect(result[0]).toBe(tokens[0]);
    expect(result[0]!.modes).toBeUndefined();
  });

  test("BoxShadowList values are NOT destructured as composites", () => {
    const list = new BoxShadowList([
      new BoxShadow(0, 1, 2, 0, "#000"),
      new BoxShadow(0, 4, 8, 0, "#000"),
    ]);
    const tokens: Token[] = [{ name: "shadow", type: "shadow", value: list }];
    const result = resolveReferences(tokens);
    expect(result[0]!.value).toBe(list);
  });

  // ─── Ref edge cases ────────────────────────────────────────

  test("resolves composite refs in mode values", () => {
    const tokens: Token[] = [
      { name: "borderColor", type: "color", value: "#e0e0e0" },
      {
        name: "card",
        type: "border",
        value: { width: "1px", style: "solid", color: "#ccc" },
        modes: { dark: { width: "1px", style: "solid", color: "{borderColor}" } },
      },
    ];
    const result = resolveReferences(tokens);
    expect((result[1]!.modes!["dark"] as Record<string, unknown>).color).toBe("#e0e0e0");
  });

  test("preserves modes on tokens that are not themselves refs", () => {
    const tokens: Token[] = [
      {
        name: "surface",
        type: "color",
        value: "#ffffff",
        modes: { dark: "#1a1a1a", dim: "#333333" },
      },
    ];
    const result = resolveReferences(tokens);
    expect(result[0]!.modes!["dark"]).toBe("#1a1a1a");
    expect(result[0]!.modes!["dim"]).toBe("#333333");
  });

  test("self-referencing token in mode throws circular", () => {
    const tokens: Token[] = [{ name: "x", type: "color", value: "#000", modes: { dark: "{x}" } }];
    expect(() => resolveReferences(tokens)).toThrow("Circular reference");
  });

  test("three-token circular through modes throws", () => {
    const tokens: Token[] = [
      { name: "a", type: "color", value: "#000", modes: { dark: "{b}" } },
      { name: "b", type: "color", value: "{c}" },
      { name: "c", type: "color", value: "{a}" },
    ];
    expect(() => resolveReferences(tokens)).toThrow("Circular reference");
  });

  test("resolves chain of refs in mode value", () => {
    const tokens: Token[] = [
      { name: "base", type: "color", value: "#111" },
      { name: "alias", type: "color", value: "{base}" },
      {
        name: "surface",
        type: "color",
        value: "#fff",
        modes: { dark: "{alias}" },
      },
    ];
    const result = resolveReferences(tokens);
    expect(result[2]!.modes!["dark"]).toBe("#111");
  });
});

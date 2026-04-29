import { describe, expect, test } from "bun:test";

import { Color } from "./TokenTypes/Color/index.js";
import type { Token } from "./Token.js";
import { validate } from "./validate.js";

describe("validate", () => {
  test("returns valid for correct tokens", () => {
    const tokens: Token[] = [
      { name: "primary", type: "color", value: "#0066cc", usage: "Brand color" },
      { name: "spacing", type: "spacing", value: "1rem" },
    ];

    const result = validate(tokens);
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  test("detects missing name", () => {
    const tokens = [{ name: "", type: "color", value: "#000" }] as Token[];

    const result = validate(tokens);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.message.includes("name"))).toBe(true);
  });

  test("detects missing value", () => {
    const tokens = [{ name: "test", type: "color", value: undefined }] as unknown as Token[];

    const result = validate(tokens);
    expect(result.valid).toBe(false);
  });

  test("detects missing type", () => {
    const tokens = [{ name: "test", type: "", value: "#000" }] as Token[];

    const result = validate(tokens);
    expect(result.valid).toBe(false);
  });

  test("detects duplicate names", () => {
    const tokens: Token[] = [
      { name: "primary", type: "color", value: "#000" },
      { name: "primary", type: "color", value: "#fff" },
    ];

    const result = validate(tokens);
    expect(result.issues.some((i) => i.message.includes("Duplicate"))).toBe(true);
  });

  test("warns on unparseable color values", () => {
    const tokens: Token[] = [{ name: "bad", type: "color", value: "not-a-color-value" }];

    const result = validate(tokens);
    expect(result.issues.some((i) => i.message.includes("could not be parsed"))).toBe(true);
  });

  test("accepts valid color values", () => {
    const tokens: Token[] = [
      { name: "hex", type: "color", value: "#ff0000" },
      { name: "named", type: "color", value: "aliceblue" },
      { name: "instance", type: "color", value: new Color(255, 0, 0) },
    ];

    const result = validate(tokens);
    const colorIssues = result.issues.filter((i) => i.message.includes("parsed"));
    expect(colorIssues).toHaveLength(0);
  });

  test("detects unresolved references", () => {
    const tokens: Token[] = [{ name: "link", type: "color", value: "{nonexistent}" }];

    const result = validate(tokens);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.message.includes("Unresolved reference"))).toBe(true);
  });

  test("detects ambiguous bare references across groups", () => {
    const tokens: Token[] = [
      { name: "primary", type: "color", group: "color", value: "#0066cc" },
      { name: "primary", type: "size", group: "size", value: "16px" },
      { name: "link", type: "color", value: "{primary}" },
    ];

    const result = validate(tokens);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.message.includes("Ambiguous token reference"))).toBe(true);
  });

  test("qualified reference is accepted even when bare name is ambiguous", () => {
    const tokens: Token[] = [
      { name: "primary", type: "color", group: "color", value: "#0066cc" },
      { name: "primary", type: "size", group: "size", value: "16px" },
      { name: "link", type: "color", value: "{color.primary}" },
    ];

    const result = validate(tokens);
    expect(result.valid).toBe(true);
    expect(result.issues.filter((i) => i.severity === "error")).toHaveLength(0);
  });

  test("detects circular references", () => {
    const tokens: Token[] = [
      { name: "a", type: "color", value: "{b}" },
      { name: "b", type: "color", value: "{a}" },
    ];

    const result = validate(tokens);
    expect(result.issues.some((i) => i.message.includes("Circular"))).toBe(true);
  });

  test("detects circular references inside composite field values", () => {
    const tokens: Token[] = [
      {
        name: "heading",
        type: "typography",
        value: {
          fontFamily: "Inter",
          fontSize: "{sizeRef}",
          fontWeight: 400,
          lineHeight: 1.2,
        },
      },
      { name: "sizeRef", type: "dimension", value: "{heading}" },
    ];

    const result = validate(tokens);
    expect(result.issues.some((i) => i.message.includes("Circular"))).toBe(true);
  });

  test("detects circular references inside composite mode values", () => {
    const tokens: Token[] = [
      {
        name: "surface",
        type: "color",
        value: "#fff",
        modes: {
          dark: { fontFamily: "Inter", fontSize: "{loopback}" } as unknown as string,
        },
      },
      { name: "loopback", type: "color", value: "{surface}" },
    ];

    const result = validate(tokens);
    expect(result.issues.some((i) => i.message.includes("Circular"))).toBe(true);
  });

  test("validates composite token shapes", () => {
    const tokens: Token[] = [
      {
        name: "heading",
        type: "typography",
        value: { fontFamily: "Rubik", fontSize: "2rem" },
      },
    ];

    const result = validate(tokens);
    expect(result.issues.some((i) => i.message.includes("missing fields"))).toBe(true);
  });

  test("accepts valid composite tokens", () => {
    const tokens: Token[] = [
      {
        name: "heading",
        type: "typography",
        value: {
          fontFamily: "Rubik",
          fontSize: "2rem",
          fontWeight: 700,
          lineHeight: 1.2,
          letterSpacing: "0",
        },
      },
    ];

    const result = validate(tokens);
    const typographyIssues = result.issues.filter((i) => i.message.includes("missing"));
    expect(typographyIssues).toHaveLength(0);
  });

  // ─── Mode validation ──────────────────────────────────────────

  test("warns on unparseable color in mode value", () => {
    const tokens: Token[] = [
      {
        name: "surface",
        type: "color",
        value: "#ffffff",
        modes: { dark: "not-a-color-value" },
      },
    ];

    const result = validate(tokens);
    expect(
      result.issues.some(
        (i) => i.message.includes('mode "dark"') && i.message.includes("could not be parsed"),
      ),
    ).toBe(true);
  });

  test("detects unresolved references in mode values", () => {
    const tokens: Token[] = [
      {
        name: "surface",
        type: "color",
        value: "#ffffff",
        modes: { dark: "{nonexistent}" },
      },
    ];

    const result = validate(tokens);
    expect(result.valid).toBe(false);
    expect(
      result.issues.some(
        (i) => i.message.includes('mode "dark"') && i.message.includes("Unresolved reference"),
      ),
    ).toBe(true);
  });

  test("accepts valid mode values", () => {
    const tokens: Token[] = [
      {
        name: "primary",
        type: "color",
        value: "#0066cc",
        modes: { dark: "#3399ff" },
      },
    ];

    const result = validate(tokens);
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  test("accepts mode values that reference existing tokens", () => {
    const tokens: Token[] = [
      { name: "darkBlue", type: "color", value: "#3399ff" },
      {
        name: "primary",
        type: "color",
        value: "#0066cc",
        modes: { dark: "{darkBlue}" },
      },
    ];

    const result = validate(tokens);
    const modeIssues = result.issues.filter((i) => i.message.includes("mode"));
    expect(modeIssues).toHaveLength(0);
  });

  // ─── Empty values ──────────────────────────────────────────

  test("warns on empty string value", () => {
    const tokens: Token[] = [{ name: "empty", type: "spacing", value: "" }];
    const result = validate(tokens);
    expect(result.issues.some((i) => i.message.includes("Empty string value"))).toBe(true);
  });

  test("warns on empty string in mode value", () => {
    const tokens: Token[] = [
      { name: "gap", type: "spacing", value: "1rem", modes: { compact: "" } },
    ];
    const result = validate(tokens);
    expect(
      result.issues.some(
        (i) => i.message.includes('mode "compact"') && i.message.includes("Empty string"),
      ),
    ).toBe(true);
  });

  // ─── Circular refs in modes ────────────────────────────────

  test("detects circular self-reference in mode value", () => {
    const tokens: Token[] = [
      {
        name: "surface",
        type: "color",
        value: "#ffffff",
        modes: { dark: "{surface}" },
      },
    ];

    const result = validate(tokens);
    expect(result.issues.some((i) => i.message.includes("Circular"))).toBe(true);
  });

  test("detects circular reference chain through modes", () => {
    const tokens: Token[] = [
      { name: "a", type: "color", value: "#000", modes: { dark: "{b}" } },
      { name: "b", type: "color", value: "{a}" },
    ];

    const result = validate(tokens);
    expect(result.issues.some((i) => i.message.includes("Circular"))).toBe(true);
  });

  // ─── Composite shape validation in modes ───────────────────

  test("warns on incomplete composite shape in mode value", () => {
    const tokens: Token[] = [
      {
        name: "heading",
        type: "typography",
        value: {
          fontFamily: "Rubik",
          fontSize: "2rem",
          fontWeight: 700,
          lineHeight: 1.2,
          letterSpacing: "0",
        },
        modes: {
          mobile: { fontSize: "1.5rem" },
        },
      },
    ];

    const result = validate(tokens);
    expect(
      result.issues.some(
        (i) => i.message.includes('mode "mobile"') && i.message.includes("missing fields"),
      ),
    ).toBe(true);
  });
});

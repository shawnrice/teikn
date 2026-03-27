import { describe, expect, test } from "bun:test";

import { Color } from "../TokenTypes/Color";
import { Dimension } from "../TokenTypes/Dimension";
import { Duration } from "../TokenTypes/Duration";
import { BoxShadow } from "../TokenTypes/BoxShadow";
import { CubicBezier } from "../TokenTypes/CubicBezier";
import { Transition } from "../TokenTypes/Transition";
import { LinearGradient } from "../TokenTypes/Gradient";
import type { Token } from "../Token";
import { CssVars } from "./CssVars";
import { Scss } from "./Scss";
import { ScssVars } from "./ScssVars";
import { EsModule } from "./EsModule";
import { JavaScript } from "./JavaScript";
import { Json } from "./Json";
import { testOpts } from "../fixtures/testOpts";

// ─── Helpers ─────────────────────────────────────────────────

const opts = testOpts;

const cssGenerators = () =>
  [
    ["CssVars", new CssVars(opts)] as const,
    ["Scss", new Scss(opts)] as const,
    ["ScssVars", new ScssVars(opts)] as const,
  ];

const jsGenerators = () =>
  [
    ["EsModule", new EsModule(opts)] as const,
    ["JavaScript", new JavaScript(opts)] as const,
  ];

const allGenerators = () =>
  [
    ...cssGenerators(),
    ...jsGenerators(),
    ["Json", new Json()] as const,
  ];

// ─── Dimension tokens ───────────────────────────────────────

describe("Dimension values serialize correctly", () => {
  const dimensionToken: Token[] = [
    { name: "spacingMd", type: "spacing", value: new Dimension(1, "rem") },
  ];

  const dimensionWithModes: Token[] = [
    {
      name: "spacingMd",
      type: "spacing",
      value: new Dimension(1, "rem"),
      modes: { compact: new Dimension(0.5, "rem") },
    },
  ];

  for (const [name, gen] of allGenerators()) {
    test(`${name} outputs "1rem" for Dimension token`, () => {
      const output = gen.generate(dimensionToken);
      expect(output).toContain("1rem");
      expect(output).not.toContain("[object Object]");
    });
  }

  for (const [name, gen] of allGenerators()) {
    test(`${name} does not produce empty values for Dimension`, () => {
      const output = gen.generate(dimensionToken);
      // Empty value patterns: `: ;` (CSS), `: ,` (SCSS map), `''` (JS empty string)
      expect(output).not.toMatch(/:\s*[;,]\s/);
      expect(output).not.toContain("''");
    });
  }

  for (const [name, gen] of cssGenerators()) {
    test(`${name} outputs Dimension in mode values`, () => {
      const output = gen.generate(dimensionWithModes);
      expect(output).toContain("1rem");
      expect(output).toContain("0.5rem");
    });
  }

  for (const [name, gen] of jsGenerators()) {
    test(`${name} outputs Dimension in mode values`, () => {
      const output = gen.generate(dimensionWithModes);
      expect(output).toContain("1rem");
      expect(output).toContain("0.5rem");
    });
  }

  test("Json outputs Dimension in mode values", () => {
    const output = new Json().generate(dimensionWithModes);
    const parsed = JSON.parse(output);
    expect(parsed.spacingMd.value).toBe("1rem");
    expect(parsed.spacingMd.modes.compact).toBe("0.5rem");
  });
});

// ─── Duration tokens ────────────────────────────────────────

describe("Duration values serialize correctly", () => {
  const durationToken: Token[] = [
    { name: "transitionFast", type: "duration", value: new Duration(200, "ms") },
  ];

  const durationWithModes: Token[] = [
    {
      name: "transitionFast",
      type: "duration",
      value: new Duration(200, "ms"),
      modes: { reduced: new Duration(0, "ms") },
    },
  ];

  for (const [name, gen] of allGenerators()) {
    test(`${name} outputs "200ms" for Duration token`, () => {
      const output = gen.generate(durationToken);
      expect(output).toContain("200ms");
    });
  }

  for (const [name, gen] of cssGenerators()) {
    test(`${name} outputs Duration in mode values`, () => {
      const output = gen.generate(durationWithModes);
      expect(output).toContain("200ms");
      expect(output).toContain("0ms");
    });
  }
});

// ─── Composite tokens with nested first-class values ────────

describe("composite tokens with nested Dimension values", () => {
  const typographyToken: Token[] = [
    {
      name: "headingLg",
      type: "typography",
      value: {
        fontFamily: '"Quicksand", sans-serif',
        fontSize: new Dimension(1.375, "rem"),
        fontWeight: 600,
        lineHeight: 1.4,
      },
    },
  ];

  for (const [name, gen] of cssGenerators()) {
    test(`${name} serializes nested Dimension in composite`, () => {
      const output = gen.generate(typographyToken);
      expect(output).toContain("1.375rem");
      expect(output).not.toContain("[object Object]");
    });
  }

  test("Json serializes nested Dimension in composite", () => {
    const output = new Json().generate(typographyToken);
    const parsed = JSON.parse(output);
    expect(parsed.headingLg.value.fontSize).toBe("1.375rem");
  });
});

describe("composite tokens with nested Color values", () => {
  const borderToken: Token[] = [
    {
      name: "borderPrimary",
      type: "border",
      value: {
        width: new Dimension(1, "px"),
        style: "solid",
        color: new Color("#4a90d9"),
      },
    },
  ];

  for (const [name, gen] of cssGenerators()) {
    test(`${name} serializes border with Dimension and Color`, () => {
      const output = gen.generate(borderToken);
      expect(output).toContain("1px");
      expect(output).toContain("solid");
      // Color will be converted by stringifyValues
      expect(output).not.toContain("[object Object]");
    });
  }
});

// ─── dp() helper ────────────────────────────────────────────

describe("dp() helper produces correct output", () => {
  // dp(16) => Dimension(1, 'rem'), dp(8) => Dimension(0.5, 'rem')
  const dp = (px: number): Dimension => new Dimension(px / 16, "rem");

  const spacingTokens: Token[] = [
    { name: "spacingXs", type: "spacing", value: dp(4) },
    { name: "spacingSm", type: "spacing", value: dp(8) },
    { name: "spacingMd", type: "spacing", value: dp(16) },
    { name: "spacingLg", type: "spacing", value: dp(24) },
  ];

  for (const [name, gen] of cssGenerators()) {
    test(`${name} correctly outputs dp() spacing scale`, () => {
      const output = gen.generate(spacingTokens);
      expect(output).toContain("0.25rem");
      expect(output).toContain("0.5rem");
      expect(output).toContain("1rem");
      expect(output).toContain("1.5rem");
    });
  }

  test("Json correctly outputs dp() spacing scale", () => {
    const output = new Json().generate(spacingTokens);
    const parsed = JSON.parse(output);
    expect(parsed["spacingXs"].value).toBe("0.25rem");
    expect(parsed["spacingSm"].value).toBe("0.5rem");
    expect(parsed["spacingMd"].value).toBe("1rem");
    expect(parsed["spacingLg"].value).toBe("1.5rem");
  });
});

// ─── Multiple first-class types in one token set ────────────

describe("mixed first-class value types in a single generation", () => {
  const mixedTokens: Token[] = [
    { name: "primary", type: "color", value: new Color("#4a90d9") },
    { name: "spacingMd", type: "spacing", value: new Dimension(1, "rem") },
    { name: "transitionFast", type: "duration", value: new Duration(200, "ms") },
    { name: "ease", type: "timing", value: CubicBezier.standard },
    {
      name: "elevation",
      type: "shadow",
      value: new BoxShadow(0, 2, 8, 0, new Color(0, 0, 0, 0.12)),
    },
    {
      name: "fade",
      type: "transition",
      value: Transition.fade,
    },
    {
      name: "brandGradient",
      type: "gradient",
      value: new LinearGradient(90, [
        ["#ff0000", "0%"],
        ["#0000ff", "100%"],
      ]),
    },
  ];

  for (const [name, gen] of allGenerators()) {
    test(`${name} outputs all first-class types without empty values or [object Object]`, () => {
      const output = gen.generate(mixedTokens);
      expect(output).not.toContain("[object Object]");
      expect(output).toContain("1rem");
      expect(output).toContain("200ms");
    });
  }
});

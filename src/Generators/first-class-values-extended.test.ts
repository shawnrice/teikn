import { describe, expect, test } from "bun:test";

import { BoxShadow } from "../TokenTypes/BoxShadow";
import { Color } from "../TokenTypes/Color";
import { Dimension } from "../TokenTypes/Dimension";
import { Duration } from "../TokenTypes/Duration";
import type { Token } from "../Token";
import { Html } from "./Html";
import { Storybook } from "./Storybook";
import { DtcgGenerator } from "./Dtcg";
import { testOpts } from "../fixtures/testOpts";

// ─── Helpers ─────────────────────────────────────────────────

const htmlOpts = testOpts;
const sbOpts = testOpts;

// ─── Dimension tokens ───────────────────────────────────────

describe("Dimension values serialize correctly", () => {
  const dimensionToken: Token[] = [
    { name: "spacingMd", type: "spacing", value: new Dimension(1, "rem") },
  ];

  test("Html outputs '1rem' for Dimension token", () => {
    const output = new Html(htmlOpts).generate(dimensionToken);
    expect(output).toContain("1rem");
    expect(output).not.toContain("[object Object]");
  });

  test("Storybook generates story for Dimension token", () => {
    const output = new Storybook(sbOpts).generate(dimensionToken);
    expect(output).toContain("SpacingBar");
    expect(output).toContain("spacingMd");
    expect(output).not.toContain("[object Object]");
  });

  test("Dtcg outputs Dimension as {value, unit} object", () => {
    const gen = new DtcgGenerator({ hierarchical: false });
    const output = gen.generate(dimensionToken);
    const parsed = JSON.parse(output);
    expect(parsed.spacingMd.$value).toEqual({ value: 1, unit: "rem" });
    expect(parsed.spacingMd.$type).toBe("dimension");
  });
});

// ─── Duration tokens ────────────────────────────────────────

describe("Duration values serialize correctly", () => {
  const durationToken: Token[] = [
    { name: "transitionFast", type: "duration", value: new Duration(200, "ms") },
  ];

  test("Html outputs '200ms' for Duration token", () => {
    const output = new Html(htmlOpts).generate(durationToken);
    expect(output).toContain("200ms");
  });

  test("Storybook generates story for Duration token", () => {
    const output = new Storybook(sbOpts).generate(durationToken);
    expect(output).toContain("DurationBar");
    expect(output).toContain("transitionFast");
    expect(output).not.toContain("[object Object]");
  });

  test("Dtcg outputs Duration as {value, unit} object", () => {
    const gen = new DtcgGenerator({ hierarchical: false });
    const output = gen.generate(durationToken);
    const parsed = JSON.parse(output);
    expect(parsed.transitionFast.$value).toEqual({ value: 200, unit: "ms" });
    expect(parsed.transitionFast.$type).toBe("duration");
  });
});

// ─── Dimension in modes ─────────────────────────────────────

describe("Dimension in mode values", () => {
  const dimensionWithModes: Token[] = [
    {
      name: "spacingMd",
      type: "spacing",
      value: new Dimension(1, "rem"),
      modes: { compact: new Dimension(0.5, "rem") },
    },
  ];

  test("Html outputs Dimension in mode values", () => {
    const output = new Html(htmlOpts).generate(dimensionWithModes);
    expect(output).toContain("1rem");
    expect(output).toContain("0.5rem");
    expect(output).not.toContain("[object Object]");
  });

  test("Storybook emits modesData with stringified Dimension", () => {
    const output = new Storybook(sbOpts).generate(dimensionWithModes);
    expect(output).toContain("0.5rem");
    expect(output).toContain("modesData");
    expect(output).toContain("compact");
  });

  test("Dtcg outputs Dimension in mode values via $extensions", () => {
    const gen = new DtcgGenerator({ hierarchical: false });
    const output = gen.generate(dimensionWithModes);
    const parsed = JSON.parse(output);
    expect(parsed.spacingMd.$value).toEqual({ value: 1, unit: "rem" });
    expect(parsed.spacingMd.$extensions.mode.compact).toEqual({ value: 0.5, unit: "rem" });
  });
});

// ─── Composite with nested Dimension ────────────────────────

describe("composite tokens with nested Dimension values", () => {
  const typographyToken: Token[] = [
    {
      name: "headingLg",
      type: "typography",
      value: {
        fontFamily: '"Quicksand", sans-serif',
        fontSize: new Dimension(1.5, "rem"),
        fontWeight: 600,
        lineHeight: 1.4,
      },
    },
  ];

  test("Html serializes nested Dimension in composite", () => {
    const output = new Html(htmlOpts).generate(typographyToken);
    expect(output).toContain("1.5rem");
    expect(output).not.toContain("[object Object]");
  });

  test("Storybook renders typography with TypographyBlock", () => {
    const output = new Storybook(sbOpts).generate(typographyToken);
    expect(output).toContain("headingLg");
    expect(output).toContain("TypographyBlock");
    expect(output).not.toContain("[object Object]");
  });

  test("Dtcg serializes nested Dimension in composite", () => {
    const gen = new DtcgGenerator({ hierarchical: false });
    const output = gen.generate(typographyToken);
    const parsed = JSON.parse(output);
    expect(parsed.headingLg.$value.fontSize).toEqual({ value: 1.5, unit: "rem" });
  });
});

// ─── Mixed first-class types ────────────────────────────────

describe("mixed first-class value types in a single generation", () => {
  const mixedTokens: Token[] = [
    { name: "primary", type: "color", value: new Color("#4a90d9") },
    { name: "spacingMd", type: "spacing", value: new Dimension(1, "rem") },
    { name: "transitionFast", type: "duration", value: new Duration(200, "ms") },
    {
      name: "elevation",
      type: "shadow",
      value: new BoxShadow(0, 2, 8, 0, new Color(0, 0, 0, 0.12)),
    },
  ];

  test("Html outputs all first-class types without [object Object]", () => {
    const output = new Html(htmlOpts).generate(mixedTokens);
    expect(output).not.toContain("[object Object]");
    expect(output).toContain("1rem");
    expect(output).toContain("200ms");
  });

  test("Storybook generates stories for all types", () => {
    const output = new Storybook(sbOpts).generate(mixedTokens);
    expect(output).not.toContain("[object Object]");
    expect(output).toContain("Swatch");
    expect(output).toContain("SpacingBar");
    expect(output).toContain("DurationBar");
    expect(output).toContain("ShadowBox");
  });

  test("Dtcg contains correct $value fields for all types", () => {
    const gen = new DtcgGenerator({ hierarchical: false });
    const output = gen.generate(mixedTokens);
    const parsed = JSON.parse(output);
    expect(parsed.primary.$value.colorSpace).toBe("srgb");
    expect(parsed.spacingMd.$value).toEqual({ value: 1, unit: "rem" });
    expect(parsed.transitionFast.$value).toEqual({ value: 200, unit: "ms" });
    expect(parsed.elevation.$value.blur).toEqual({ value: 8, unit: "px" });
  });
});

// ─── Border composite with Dimension width ──────────────────

describe("border composite with Dimension width", () => {
  const borderToken: Token[] = [
    {
      name: "borderPrimary",
      type: "border",
      value: {
        width: new Dimension(1, "px"),
        style: "solid",
        color: new Color("#000"),
      },
    },
  ];

  test("Html serializes border with Dimension width and Color", () => {
    const output = new Html(htmlOpts).generate(borderToken);
    expect(output).toContain("1px");
    expect(output).toContain("solid");
    expect(output).not.toContain("[object Object]");
  });

  test("Storybook renders border story with BorderDemo", () => {
    const output = new Storybook(sbOpts).generate(borderToken);
    expect(output).toContain("BorderDemo");
    expect(output).toContain("borderPrimary");
    expect(output).not.toContain("[object Object]");
  });

  test("Dtcg serializes border width as dimension object", () => {
    const gen = new DtcgGenerator({ hierarchical: false });
    const output = gen.generate(borderToken);
    const parsed = JSON.parse(output);
    expect(parsed.borderPrimary.$value.width).toEqual({ value: 1, unit: "px" });
    expect(parsed.borderPrimary.$value.style).toBe("solid");
    expect(parsed.borderPrimary.$value.color.colorSpace).toBe("srgb");
  });
});

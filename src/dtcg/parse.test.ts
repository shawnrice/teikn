import { describe, expect, test } from "bun:test";

import { resolveReferences } from "../resolve.js";
import { BoxShadow } from "../TokenTypes/BoxShadow.js";
import { Color } from "../TokenTypes/Color/index.js";
import { CubicBezier } from "../TokenTypes/CubicBezier.js";
import { Dimension } from "../TokenTypes/Dimension.js";
import { Duration } from "../TokenTypes/Duration.js";
import { LinearGradient } from "../TokenTypes/Gradient.js";
import { parseDtcg } from "./parse.js";
import type { DtcgDocument } from "./types.js";

describe("parseDtcg", () => {
  test("parses a simple color token", () => {
    const doc: DtcgDocument = {
      primary: {
        $value: { colorSpace: "srgb", components: [1, 0, 0] },
        $type: "color",
      },
    };
    const tokens = parseDtcg(doc);
    expect(tokens).toHaveLength(1);
    expect(tokens[0]!.name).toBe("primary");
    expect(tokens[0]!.type).toBe("color");
    expect(tokens[0]!.value).toBeInstanceOf(Color);
    expect(tokens[0]!.value.red).toBe(255);
    expect(tokens[0]!.value.green).toBe(0);
    expect(tokens[0]!.value.blue).toBe(0);
  });

  test("parses a color with alpha", () => {
    const doc: DtcgDocument = {
      overlay: {
        $value: { colorSpace: "srgb", components: [0, 0, 0], alpha: 0.5 },
        $type: "color",
      },
    };
    const tokens = parseDtcg(doc);
    expect(tokens[0]!.value.alpha).toBe(0.5);
  });

  test("groups inherit $type to children", () => {
    const doc: DtcgDocument = {
      color: {
        $type: "color",
        primary: {
          $value: { colorSpace: "srgb", components: [1, 0, 0] },
        },
        secondary: {
          $value: { colorSpace: "srgb", components: [0, 0, 1] },
        },
      },
    };
    const tokens = parseDtcg(doc);
    expect(tokens).toHaveLength(2);
    expect(tokens[0]!.type).toBe("color");
    expect(tokens[1]!.type).toBe("color");
  });

  test("child $type overrides inherited type", () => {
    const doc: DtcgDocument = {
      tokens: {
        $type: "color",
        size: {
          $value: { value: 16, unit: "px" },
          $type: "dimension",
        },
      },
    };
    const tokens = parseDtcg(doc);
    expect(tokens[0]!.type).toBe("dimension");
    expect(tokens[0]!.value).toBeInstanceOf(Dimension);
    expect(tokens[0]!.value.toString()).toBe("16px");
  });

  test("nested groups produce dot-separated names", () => {
    const doc: DtcgDocument = {
      color: {
        brand: {
          primary: {
            $value: { colorSpace: "srgb", components: [1, 0, 0] },
            $type: "color",
          },
        },
      },
    };
    const tokens = parseDtcg(doc);
    expect(tokens[0]!.name).toBe("color.brand.primary");
  });

  test("custom separator works", () => {
    const doc: DtcgDocument = {
      color: {
        primary: {
          $value: { colorSpace: "srgb", components: [1, 0, 0] },
          $type: "color",
        },
      },
    };
    const tokens = parseDtcg(doc, { separator: "/" });
    expect(tokens[0]!.name).toBe("color/primary");
  });

  test("dimension values are converted to Dimension instances", () => {
    const doc: DtcgDocument = {
      spacing: {
        sm: {
          $value: { value: 8, unit: "px" },
          $type: "dimension",
        },
        md: {
          $value: { value: 1, unit: "rem" },
          $type: "dimension",
        },
      },
    };
    const tokens = parseDtcg(doc);
    expect(tokens[0]!.value).toBeInstanceOf(Dimension);
    expect(tokens[0]!.value.toString()).toBe("8px");
    expect(tokens[1]!.value).toBeInstanceOf(Dimension);
    expect(tokens[1]!.value.toString()).toBe("1rem");
  });

  test("duration values are converted to Duration instances", () => {
    const doc: DtcgDocument = {
      fast: {
        $value: { value: 200, unit: "ms" },
        $type: "duration",
      },
      slow: {
        $value: { value: 0.5, unit: "s" },
        $type: "duration",
      },
    };
    const tokens = parseDtcg(doc);
    expect(tokens[0]!.value).toBeInstanceOf(Duration);
    expect(tokens[0]!.value.toString()).toBe("200ms");
    expect(tokens[1]!.value).toBeInstanceOf(Duration);
    expect(tokens[1]!.value.toString()).toBe("0.5s");
  });

  test("cubicBezier values are converted to CubicBezier instances", () => {
    const doc: DtcgDocument = {
      ease: {
        $value: [0.42, 0, 0.58, 1],
        $type: "cubicBezier",
      },
    };
    const tokens = parseDtcg(doc);
    expect(tokens[0]!.value).toBeInstanceOf(CubicBezier);
    expect(tokens[0]!.value.x1).toBe(0.42);
    expect(tokens[0]!.value.y1).toBe(0);
    expect(tokens[0]!.value.x2).toBe(0.58);
    expect(tokens[0]!.value.y2).toBe(1);
    // type should be mapped to teikn's "timing"
    expect(tokens[0]!.type).toBe("timing");
  });

  test("number type is preserved", () => {
    const doc: DtcgDocument = {
      opacity: {
        $value: 0.5,
        $type: "number",
      },
    };
    const tokens = parseDtcg(doc);
    expect(tokens[0]!.value).toBe(0.5);
    expect(tokens[0]!.type).toBe("number");
  });

  test("fontFamily string is preserved", () => {
    const doc: DtcgDocument = {
      body: {
        $value: "Arial",
        $type: "fontFamily",
      },
    };
    const tokens = parseDtcg(doc);
    expect(tokens[0]!.value).toBe("Arial");
    expect(tokens[0]!.type).toBe("font-family");
  });

  test("fontFamily array is joined", () => {
    const doc: DtcgDocument = {
      body: {
        $value: ["Roboto", "Arial", "sans-serif"],
        $type: "fontFamily",
      },
    };
    const tokens = parseDtcg(doc);
    expect(tokens[0]!.value).toBe("Roboto, Arial, sans-serif");
  });

  test("fontWeight is preserved", () => {
    const doc: DtcgDocument = {
      bold: {
        $value: 700,
        $type: "fontWeight",
      },
    };
    const tokens = parseDtcg(doc);
    expect(tokens[0]!.value).toBe(700);
    expect(tokens[0]!.type).toBe("font-weight");
  });

  test("strokeStyle string is preserved", () => {
    const doc: DtcgDocument = {
      border: {
        $value: "dashed",
        $type: "strokeStyle",
      },
    };
    const tokens = parseDtcg(doc);
    expect(tokens[0]!.value).toBe("dashed");
  });

  test("strokeStyle object is preserved", () => {
    const doc: DtcgDocument = {
      border: {
        $value: { dashArray: [2, 4], lineCap: "round" },
        $type: "strokeStyle",
      },
    };
    const tokens = parseDtcg(doc);
    expect(tokens[0]!.value).toEqual({ dashArray: [2, 4], lineCap: "round" });
  });

  test("fontStyle is preserved", () => {
    const doc: DtcgDocument = {
      italic: {
        $value: "italic",
        $type: "fontStyle",
      },
    };
    const tokens = parseDtcg(doc);
    expect(tokens[0]!.value).toBe("italic");
    expect(tokens[0]!.type).toBe("font-style");
  });

  test("parses mode values from $extensions.mode", () => {
    const doc: DtcgDocument = {
      surface: {
        $value: { colorSpace: "srgb", components: [1, 1, 1] },
        $type: "color",
        $extensions: {
          mode: {
            dark: { colorSpace: "srgb", components: [0.1, 0.1, 0.1] },
          },
        },
      },
    };

    const tokens = parseDtcg(doc);
    expect(tokens[0]!.modes).toBeDefined();
    expect(tokens[0]!.modes!.dark).toBeInstanceOf(Color);
  });

  test("$extensions.mode value of null does not crash the parser", () => {
    const doc: DtcgDocument = {
      surface: {
        $value: { colorSpace: "srgb", components: [1, 1, 1] },
        $type: "color",
        $extensions: {
          mode: {
            dark: null as never,
          },
        },
      },
    };

    expect(() => parseDtcg(doc)).not.toThrow();
  });

  test("shadow composite values are converted to BoxShadow", () => {
    const doc: DtcgDocument = {
      elevation: {
        $value: {
          color: { colorSpace: "srgb", components: [0, 0, 0], alpha: 0.25 },
          offsetX: { value: 0, unit: "px" },
          offsetY: { value: 4, unit: "px" },
          blur: { value: 8, unit: "px" },
          spread: { value: 0, unit: "px" },
        },
        $type: "shadow",
      },
    };
    const tokens = parseDtcg(doc);
    expect(tokens[0]!.value).toBeInstanceOf(BoxShadow);
    expect(tokens[0]!.value.offsetY).toBe(4);
    expect(tokens[0]!.value.blur).toBe(8);
  });

  test("gradient values are converted to LinearGradient", () => {
    const doc: DtcgDocument = {
      bg: {
        $value: [
          { color: { colorSpace: "srgb", components: [1, 0, 0] }, position: 0 },
          { color: { colorSpace: "srgb", components: [0, 0, 1] }, position: 1 },
        ],
        $type: "gradient",
      },
    };
    const tokens = parseDtcg(doc);
    expect(tokens[0]!.value).toBeInstanceOf(LinearGradient);
    expect(tokens[0]!.value.stops).toHaveLength(2);
  });

  test("border composite is converted to an object", () => {
    const doc: DtcgDocument = {
      divider: {
        $value: {
          color: { colorSpace: "srgb", components: [0, 0, 0] },
          width: { value: 1, unit: "px" },
          style: "solid",
        },
        $type: "border",
      },
    };
    const tokens = parseDtcg(doc);
    expect(tokens[0]!.value.color).toBeInstanceOf(Color);
    expect(tokens[0]!.value.width).toBeInstanceOf(Dimension);
    expect(tokens[0]!.value.width.toString()).toBe("1px");
    expect(tokens[0]!.value.style).toBe("solid");
  });

  test("transition composite is converted to an object", () => {
    const doc: DtcgDocument = {
      fade: {
        $value: {
          duration: { value: 200, unit: "ms" },
          timingFunction: [0.42, 0, 0.58, 1],
          delay: { value: 0, unit: "ms" },
        },
        $type: "transition",
      },
    };
    const tokens = parseDtcg(doc);
    expect(tokens[0]!.value.duration).toBeInstanceOf(Duration);
    expect(tokens[0]!.value.duration.toString()).toBe("200ms");
    expect(tokens[0]!.value.timingFunction).toBeInstanceOf(CubicBezier);
    expect(tokens[0]!.value.delay).toBeInstanceOf(Duration);
    expect(tokens[0]!.value.delay.toString()).toBe("0ms");
  });

  test("typography composite is converted", () => {
    const doc: DtcgDocument = {
      heading: {
        $value: {
          fontFamily: ["Inter", "sans-serif"],
          fontSize: { value: 24, unit: "px" },
          fontWeight: 700,
          lineHeight: 1.2,
        },
        $type: "typography",
      },
    };
    const tokens = parseDtcg(doc);
    expect(tokens[0]!.value.fontSize).toBeInstanceOf(Dimension);
    expect(tokens[0]!.value.fontSize.toString()).toBe("24px");
    expect(tokens[0]!.value.fontWeight).toBe(700);
    expect(tokens[0]!.value.lineHeight).toBe(1.2);
  });

  test("alias references are preserved", () => {
    const doc: DtcgDocument = {
      color: {
        $type: "color",
        primary: {
          $value: { colorSpace: "srgb", components: [1, 0, 0] },
        },
        action: {
          $value: "{color.primary}",
        },
      },
    };
    const tokens = parseDtcg(doc);
    const action = tokens.find((t) => t.name === "color.action");
    expect(action!.value).toBe("{color.primary}");
  });

  test("$description maps to usage", () => {
    const doc: DtcgDocument = {
      primary: {
        $value: { colorSpace: "srgb", components: [1, 0, 0] },
        $type: "color",
        $description: "The primary brand color",
      },
    };
    const tokens = parseDtcg(doc);
    expect(tokens[0]!.usage).toBe("The primary brand color");
  });

  test("$deprecated boolean is included in usage", () => {
    const doc: DtcgDocument = {
      old: {
        $value: { colorSpace: "srgb", components: [1, 0, 0] },
        $type: "color",
        $deprecated: true,
        $description: "Use primary instead",
      },
    };
    const tokens = parseDtcg(doc);
    expect(tokens[0]!.usage).toBe("[DEPRECATED] Use primary instead");
  });

  test("$deprecated string is included in usage", () => {
    const doc: DtcgDocument = {
      old: {
        $value: { colorSpace: "srgb", components: [1, 0, 0] },
        $type: "color",
        $deprecated: "Removed in v3",
      },
    };
    const tokens = parseDtcg(doc);
    expect(tokens[0]!.usage).toBe("[Removed in v3]");
  });

  test("mapTypes: false preserves Dtcg type names", () => {
    const doc: DtcgDocument = {
      ease: {
        $value: [0.42, 0, 0.58, 1],
        $type: "cubicBezier",
      },
    };
    const tokens = parseDtcg(doc, { mapTypes: false });
    expect(tokens[0]!.type).toBe("cubicBezier");
  });

  test("empty document returns empty array", () => {
    expect(parseDtcg({})).toEqual([]);
  });

  test("ignores non-object children", () => {
    const doc = {
      $description: "Top-level description",
      primary: {
        $value: { colorSpace: "srgb", components: [1, 0, 0] },
        $type: "color",
      },
    } as DtcgDocument;
    const tokens = parseDtcg(doc);
    expect(tokens).toHaveLength(1);
  });

  test("DTCG-flattened dotted names resolve as fully-qualified alias targets", () => {
    // parseDtcg flattens nested groups into dotted names like
    // `color.brand.primary`. Such a name has no `group` field but IS a
    // valid full-key in `tokenKey`'s output, and `resolveKey` should
    // resolve `{color.brand.primary}` to it via the fullKeys check.
    const doc: DtcgDocument = {
      color: {
        brand: {
          primary: {
            $value: { colorSpace: "srgb", components: [1, 0, 0] },
            $type: "color",
          },
        },
      },
      link: {
        $value: "{color.brand.primary}",
        $type: "color",
      },
    };

    const tokens = parseDtcg(doc);
    const resolved = resolveReferences(tokens);

    // The link token should now point at the same Color value as the
    // brand primary — proving the dotted name resolved through the
    // alias index without ambiguity.
    expect(resolved[1]!.value).toBe(resolved[0]!.value);
  });
});

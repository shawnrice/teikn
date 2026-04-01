import { describe, expect, test } from "bun:test";

import type { Token } from "../Token";
import { BoxShadow } from "../TokenTypes/BoxShadow";
import { Color } from "../TokenTypes/Color";
import { CubicBezier } from "../TokenTypes/CubicBezier";
import { Duration } from "../TokenTypes/Duration";
import { LinearGradient } from "../TokenTypes/Gradient";
import { Transition } from "../TokenTypes/Transition";
import { parseDtcg } from "./parse";
import { serializeDtcg } from "./serialize";

describe("serializeDtcg", () => {
  test("serializes a simple color token", () => {
    const tokens: Token[] = [{ name: "primary", value: new Color(255, 0, 0), type: "color" }];
    const doc = serializeDtcg(tokens);
    const primary = doc.primary as any;
    expect(primary.$value).toEqual({
      colorSpace: "srgb",
      components: [1, 0, 0],
    });
    expect(primary.$type).toBe("color");
  });

  test("serializes a color with alpha", () => {
    const tokens: Token[] = [
      { name: "overlay", value: new Color(0, 0, 0).setAlpha(0.5), type: "color" },
    ];
    const doc = serializeDtcg(tokens);
    const overlay = doc.overlay as any;
    expect(overlay.$value.alpha).toBe(0.5);
  });

  test("serializes CubicBezier to array", () => {
    const tokens: Token[] = [
      { name: "ease", value: new CubicBezier(0.42, 0, 0.58, 1), type: "timing" },
    ];
    const doc = serializeDtcg(tokens);
    const ease = doc.ease as any;
    expect(ease.$value).toEqual([0.42, 0, 0.58, 1]);
    expect(ease.$type).toBe("cubicBezier");
  });

  test("serializes BoxShadow to Dtcg shadow", () => {
    const tokens: Token[] = [
      { name: "shadow", value: new BoxShadow(0, 4, 8, 0, new Color(0, 0, 0)), type: "shadow" },
    ];
    const doc = serializeDtcg(tokens);
    const shadow = doc.shadow as any;
    expect(shadow.$value.offsetY).toEqual({ value: 4, unit: "px" });
    expect(shadow.$value.blur).toEqual({ value: 8, unit: "px" });
    expect(shadow.$value.color.colorSpace).toBe("srgb");
  });

  test("serializes LinearGradient to Dtcg gradient stops", () => {
    const tokens: Token[] = [
      {
        name: "bg",
        value: new LinearGradient(180, [
          [new Color(255, 0, 0), "0%"],
          [new Color(0, 0, 255), "100%"],
        ]),
        type: "gradient",
      },
    ];
    const doc = serializeDtcg(tokens);
    const bg = doc.bg as any;
    expect(bg.$value).toHaveLength(2);
    expect(bg.$value[0].position).toBe(0);
    expect(bg.$value[1].position).toBe(1);
  });

  test("hierarchical mode reconstructs groups", () => {
    const tokens: Token[] = [
      { name: "color.primary", value: new Color(255, 0, 0), type: "color" },
      { name: "color.secondary", value: new Color(0, 0, 255), type: "color" },
    ];
    const doc = serializeDtcg(tokens, { hierarchical: true });
    const color = doc.color as any;
    expect(color).toBeDefined();
    expect(color.$type).toBe("color");
    expect(color.primary.$value).toBeDefined();
    expect(color.secondary.$value).toBeDefined();
    // Type should be hoisted to group, not on children
    expect(color.primary.$type).toBeUndefined();
  });

  test("flat mode puts all tokens at root", () => {
    const tokens: Token[] = [
      { name: "color.primary", value: new Color(255, 0, 0), type: "color" },
      { name: "color.secondary", value: new Color(0, 0, 255), type: "color" },
    ];
    const doc = serializeDtcg(tokens, { hierarchical: false });
    expect(doc["color.primary"]).toBeDefined();
    expect(doc["color.secondary"]).toBeDefined();
    expect(doc.color).toBeUndefined();
  });

  test("preserves usage as $description", () => {
    const tokens: Token[] = [
      { name: "primary", value: new Color(255, 0, 0), type: "color", usage: "Brand color" },
    ];
    const doc = serializeDtcg(tokens);
    expect((doc.primary as any).$description).toBe("Brand color");
  });

  test("maps teikn type names to Dtcg", () => {
    const tokens: Token[] = [{ name: "sm", value: "8px", type: "spacing" }];
    const doc = serializeDtcg(tokens);
    const sm = doc.sm as any;
    expect(sm.$type).toBe("dimension");
    expect(sm.$value).toEqual({ value: 8, unit: "px" });
  });

  test("maps font-family to fontFamily", () => {
    const tokens: Token[] = [{ name: "body", value: "Arial, sans-serif", type: "font-family" }];
    const doc = serializeDtcg(tokens);
    expect((doc.body as any).$type).toBe("fontFamily");
  });

  test("maps font-weight to fontWeight", () => {
    const tokens: Token[] = [{ name: "bold", value: 700, type: "font-weight" }];
    const doc = serializeDtcg(tokens);
    expect((doc.bold as any).$type).toBe("fontWeight");
    expect((doc.bold as any).$value).toBe(700);
  });

  test("serializes string dimension values", () => {
    const tokens: Token[] = [{ name: "gap", value: "1rem", type: "spacing" }];
    const doc = serializeDtcg(tokens);
    expect((doc.gap as any).$value).toEqual({ value: 1, unit: "rem" });
  });

  test("serializes number values", () => {
    const tokens: Token[] = [{ name: "opacity", value: 0.5, type: "opacity" }];
    const doc = serializeDtcg(tokens);
    expect((doc.opacity as any).$value).toBe(0.5);
    expect((doc.opacity as any).$type).toBe("number");
  });

  test("round-trip: parse then serialize produces equivalent data", () => {
    const original = {
      color: {
        $type: "color",
        red: {
          $value: { colorSpace: "srgb", components: [1, 0, 0] },
          $description: "Pure red",
        },
        blue: {
          $value: { colorSpace: "srgb", components: [0, 0, 1] },
        },
      },
      spacing: {
        $type: "dimension",
        sm: {
          $value: { value: 8, unit: "px" },
        },
      },
    };

    const tokens = parseDtcg(original);
    const result = serializeDtcg(tokens);

    // Color group should be reconstructed
    const colorGroup = result.color as any;
    expect(colorGroup.$type).toBe("color");
    expect(colorGroup.red.$value.components[0]).toBeCloseTo(1, 2);
    expect(colorGroup.red.$description).toBe("Pure red");
    expect(colorGroup.blue.$value.components[2]).toBeCloseTo(1, 2);

    // Spacing group should be reconstructed
    const spacingGroup = result.spacing as any;
    expect(spacingGroup.$type).toBe("dimension");
    expect(spacingGroup.sm.$value).toEqual({ value: 8, unit: "px" });
  });

  test("does not hoist $type when children have different types", () => {
    const tokens: Token[] = [
      { name: "theme.primary", value: new Color(255, 0, 0), type: "color" },
      { name: "theme.spacing", value: "8px", type: "spacing" },
    ];
    const doc = serializeDtcg(tokens, { hierarchical: true });
    const theme = doc.theme as any;
    // Different types → no hoisting
    expect(theme.$type).toBeUndefined();
    expect(theme.primary.$type).toBe("color");
    expect(theme.spacing.$type).toBe("dimension");
  });

  test("serializes Transition to Dtcg transition composite", () => {
    const tokens: Token[] = [
      {
        name: "fade",
        value: new Transition("300ms", new CubicBezier(0.4, 0, 0.2, 1)),
        type: "transition",
      },
    ];
    const doc = serializeDtcg(tokens);
    const fade = doc.fade as any;
    expect(fade.$type).toBe("transition");
    expect(fade.$value.duration).toEqual({ value: 300, unit: "ms" });
    expect(fade.$value.timingFunction).toEqual([0.4, 0, 0.2, 1]);
  });

  test("serializes Transition with delay and property", () => {
    const tokens: Token[] = [
      {
        name: "slide",
        value: new Transition("0.3s", "ease", "0.1s", "transform"),
        type: "transition",
      },
    ];
    const doc = serializeDtcg(tokens);
    const slide = doc.slide as any;
    expect(slide.$value.delay).toEqual({ value: 0.1, unit: "s" });
    expect(slide.$value.property).toBe("transform");
  });

  test("includes $extensions.mode when token has modes", () => {
    const tokens: Token[] = [
      {
        name: "surface",
        value: new Color(255, 255, 255),
        type: "color",
        modes: { dark: new Color(26, 26, 26) },
      },
    ];
    const doc = serializeDtcg(tokens);
    const surface = doc.surface as any;
    expect(surface.$extensions).toBeDefined();
    expect(surface.$extensions.mode).toBeDefined();
    expect(surface.$extensions.mode.dark).toEqual({
      colorSpace: "srgb",
      components: [
        expect.closeTo(26 / 255, 2),
        expect.closeTo(26 / 255, 2),
        expect.closeTo(26 / 255, 2),
      ],
    });
  });

  test("does not include $extensions when token has no modes", () => {
    const tokens: Token[] = [{ name: "primary", value: new Color(255, 0, 0), type: "color" }];
    const doc = serializeDtcg(tokens);
    expect((doc.primary as any).$extensions).toBeUndefined();
  });

  test("mode values go through teiknValueToDtcg conversion", () => {
    const tokens: Token[] = [
      {
        name: "gap",
        value: "16px",
        type: "spacing",
        modes: { compact: "8px" },
      },
    ];
    const doc = serializeDtcg(tokens);
    const gap = doc.gap as any;
    expect(gap.$extensions.mode.compact).toEqual({ value: 8, unit: "px" });
  });

  test("transition emits DTCG aliases for referenced duration and timing tokens", () => {
    const fast = new Duration(100, "ms");
    const standard = new CubicBezier(0.4, 0, 0.2, 1);
    const tokens: Token[] = [
      { name: "fast", type: "duration", value: fast },
      { name: "standard", type: "timing", value: standard },
      { name: "fade", type: "transition", value: new Transition(fast, standard) },
    ];
    const doc = serializeDtcg(tokens);
    const fade = doc.fade as any;
    expect(fade.$value.duration).toBe("{fast}");
    expect(fade.$value.timingFunction).toBe("{standard}");
  });

  test("transition inlines values when no matching token exists", () => {
    const tokens: Token[] = [
      { name: "fade", type: "transition", value: new Transition("100ms", "ease") },
    ];
    const doc = serializeDtcg(tokens);
    const fade = doc.fade as any;
    expect(fade.$value.duration).toEqual({ value: 100, unit: "ms" });
    expect(fade.$value.timingFunction).toEqual([0.25, 0.1, 0.25, 1]);
  });

  test("shadow emits DTCG alias for referenced color token", () => {
    const shadowColor = new Color(0, 0, 0, 0.12);
    const tokens: Token[] = [
      { name: "shadow-color", type: "color", value: shadowColor },
      { name: "sm", type: "shadow", value: new BoxShadow({ offsetY: 1, blur: 2, color: shadowColor }) },
    ];
    const doc = serializeDtcg(tokens);
    const sm = doc.sm as any;
    expect(sm.$value.color).toBe("{shadow-color}");
    expect(sm.$value.offsetY).toEqual({ value: 1, unit: "px" });
  });
});

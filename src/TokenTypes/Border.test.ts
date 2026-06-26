import { describe, expect, test } from "bun:test";
import { Border, borderStyles, isBorderStyle } from "./Border.js";
import { Color } from "./Color/index.js";
import { Dimension } from "./Dimension.js";

describe("Border", () => {
  describe("construction", () => {
    test("from an object", () => {
      const b = new Border({ width: new Dimension("1px"), style: "solid", color: "#e0e0e0" });
      expect(b.width.toString()).toBe("1px");
      expect(b.style).toBe("solid");
      expect(b.color).toBeInstanceOf(Color);
    });

    test("width string coerces to Dimension", () => {
      const b = new Border({ width: "2px", style: "dashed", color: "steelblue" });
      expect(b.width).toBeInstanceOf(Dimension);
      expect(b.width.toString()).toBe("2px");
    });

    test("color instance is kept", () => {
      const c = new Color(70, 130, 180);
      const b = new Border({ width: "1px", style: "solid", color: c });
      expect(b.color).toBe(c);
    });

    test("copy constructor", () => {
      const original = new Border({ width: "1px", style: "solid", color: "#000" });
      const copy = new Border(original);
      expect(copy.width.toString()).toBe("1px");
      expect(copy.style).toBe("solid");
    });

    test("parses the CSS shorthand string", () => {
      const b = new Border("2px dashed #e0e0e0");
      expect(b.width.toString()).toBe("2px");
      expect(b.style).toBe("dashed");
      expect(b.color.toString()).toBe("rgb(224, 224, 224)");
    });

    test("parses shorthand with a named color", () => {
      const b = new Border("1px solid steelblue");
      expect(b.color.toString()).toBe("rgb(70, 130, 180)");
    });
  });

  describe("validation", () => {
    test("bare-number width is rejected (no unit)", () => {
      expect(() => new Border({ width: 1 as never, style: "solid", color: "#000" })).toThrow(
        /must carry a unit/,
      );
    });

    test("invalid style keyword is rejected", () => {
      expect(() => new Border({ width: "1px", style: "squiggly", color: "#000" })).toThrow(
        /Invalid border style/,
      );
    });

    test("unparseable shorthand is rejected", () => {
      expect(() => new Border("just-a-color")).toThrow(/Invalid border/);
    });

    test("a whole-value reference string is rejected", () => {
      expect(() => new Border("{border.default}")).toThrow(/reference/);
    });
  });

  describe("per-field references", () => {
    test("a `{ref}` string is accepted and stored verbatim in any field", () => {
      const b = new Border({ width: "{borderWidth.thin}", style: "solid", color: "{color.line}" });
      expect(b.width).toBe("{borderWidth.thin}");
      expect(b.color).toBe("{color.line}");
    });

    test("style may also be a reference", () => {
      const b = new Border({ width: "1px", style: "{border.style}", color: "#000" });
      expect(b.style).toBe("{border.style}");
    });

    test("__teikn_fromFields__ rebuilds with resolved field values", () => {
      const withRef = new Border({ width: "{w}", style: "solid", color: "#000" });
      const resolved = withRef.__teikn_fromFields__({
        ...withRef.__teikn_fields__(),
        width: new Dimension("3px"),
      });
      expect((resolved as Border).width.toString()).toBe("3px");
    });
  });

  describe("serialization", () => {
    test("toString emits the CSS border shorthand", () => {
      const b = new Border({ width: "1px", style: "solid", color: "#e0e0e0" });
      expect(b.toString()).toBe("1px solid rgb(224, 224, 224)");
    });

    test("toJSON mirrors toString", () => {
      const b = new Border({ width: "1px", style: "solid", color: "#000" });
      expect(b.toJSON()).toBe(b.toString());
    });
  });

  describe("with", () => {
    test("returns a new instance with overrides applied", () => {
      const base = new Border({ width: "1px", style: "solid", color: "#000" });
      const thick = base.with({ width: "3px" });
      expect(thick.width.toString()).toBe("3px");
      expect(base.width.toString()).toBe("1px");
      expect(thick.style).toBe("solid");
    });
  });

  describe("style helpers", () => {
    test("isBorderStyle recognizes valid keywords", () => {
      expect(isBorderStyle("solid")).toBe(true);
      expect(isBorderStyle("dashed")).toBe(true);
      expect(isBorderStyle("squiggly")).toBe(false);
    });

    test("borderStyles contains the CSS line-style set", () => {
      expect(borderStyles.has("double")).toBe(true);
      expect(borderStyles.has("none")).toBe(true);
    });
  });
});

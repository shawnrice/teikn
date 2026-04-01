import { describe, expect, it } from "bun:test";
import { BoxShadow, BoxShadowList } from "./BoxShadow";
import { Color } from "./Color";

describe("BoxShadow", () => {
  // ─── Construction ────────────────────────────────────────────

  it("creates from numbers", () => {
    const s = new BoxShadow(0, 2, 8, 0, "rgba(0,0,0,.12)");
    expect(s.offsetX).toBe(0);
    expect(s.offsetY).toBe(2);
    expect(s.blur).toBe(8);
    expect(s.spread).toBe(0);
    expect(s.color).toBeInstanceOf(Color);
    expect(s.inset).toBe(false);
  });

  it("creates from numbers with defaults", () => {
    const s = new BoxShadow(1, 2);
    expect(s.blur).toBe(0);
    expect(s.spread).toBe(0);
    expect(s.inset).toBe(false);
  });

  it("creates from a Color instance", () => {
    const c = new Color(255, 0, 0);
    const s = new BoxShadow(0, 4, 8, 0, c);
    expect(s.color.red).toBe(255);
  });

  it("creates with inset flag", () => {
    const s = new BoxShadow(0, 2, 4, 0, "#000", true);
    expect(s.inset).toBe(true);
  });

  it("creates from a CSS string", () => {
    const s = new BoxShadow("0 1px 2px rgba(0,0,0,.1)");
    expect(s.offsetX).toBe(0);
    expect(s.offsetY).toBe(1);
    expect(s.blur).toBe(2);
    expect(s.spread).toBe(0);
  });

  it("creates from a CSS string with spread", () => {
    const s = new BoxShadow("0 2px 8px 4px rgba(0,0,0,.12)");
    expect(s.offsetX).toBe(0);
    expect(s.offsetY).toBe(2);
    expect(s.blur).toBe(8);
    expect(s.spread).toBe(4);
  });

  it("creates from a CSS string with inset at start", () => {
    const s = new BoxShadow("inset 0 2px 4px #000");
    expect(s.inset).toBe(true);
    expect(s.offsetX).toBe(0);
    expect(s.offsetY).toBe(2);
    expect(s.blur).toBe(4);
  });

  it("creates from a CSS string with inset at end", () => {
    const s = new BoxShadow("0 2px 4px #000 inset");
    expect(s.inset).toBe(true);
  });

  it("creates from a CSS string with hex color", () => {
    const s = new BoxShadow("0 1px 2px #ff0000");
    expect(s.color.red).toBe(255);
    expect(s.color.green).toBe(0);
    expect(s.color.blue).toBe(0);
  });

  it("creates from a CSS string with negative offsets", () => {
    const s = new BoxShadow("-2px 4px 8px #000");
    expect(s.offsetX).toBe(-2);
    expect(s.offsetY).toBe(4);
  });

  it("creates as a copy", () => {
    const a = new BoxShadow(0, 4, 12, 2, "#333");
    const b = new BoxShadow(a);
    expect(b.offsetX).toBe(a.offsetX);
    expect(b.offsetY).toBe(a.offsetY);
    expect(b.blur).toBe(a.blur);
    expect(b.spread).toBe(a.spread);
  });

  // ─── from() ─────────────────────────────────────────────────

  it("from() accepts a CSS string", () => {
    const s = BoxShadow.from("0 2px 8px rgba(0,0,0,.12)");
    expect(s.offsetY).toBe(2);
    expect(s.blur).toBe(8);
  });

  it("from() accepts an options object", () => {
    const s = BoxShadow.from({ offsetY: 4, blur: 12, color: "#000" });
    expect(s.offsetY).toBe(4);
    expect(s.blur).toBe(12);
  });

  it("from() accepts a BoxShadow instance", () => {
    const a = new BoxShadow(0, 2, 4);
    const b = BoxShadow.from(a);
    expect(b.offsetY).toBe(2);
    expect(b).not.toBe(a);
  });

  // ─── Object constructor ──────────────────────────────────────

  it("creates from an options object with all fields", () => {
    const s = new BoxShadow({ offsetX: 1, offsetY: 2, blur: 8, spread: 1, color: "#ff0000", inset: true });
    expect(s.offsetX).toBe(1);
    expect(s.offsetY).toBe(2);
    expect(s.blur).toBe(8);
    expect(s.spread).toBe(1);
    expect(s.color.red).toBe(255);
    expect(s.inset).toBe(true);
  });

  it("creates from an options object with defaults", () => {
    const s = new BoxShadow({ offsetY: 4, blur: 12, color: "rgba(0,0,0,.2)" });
    expect(s.offsetX).toBe(0);
    expect(s.offsetY).toBe(4);
    expect(s.blur).toBe(12);
    expect(s.spread).toBe(0);
    expect(s.inset).toBe(false);
  });

  it("creates from an options object with Color instance", () => {
    const c = new Color(0, 128, 255);
    const s = new BoxShadow({ offsetY: 2, blur: 4, color: c });
    expect(s.color.blue).toBe(255);
  });

  it("creates from an empty options object", () => {
    const s = new BoxShadow({});
    expect(s.offsetX).toBe(0);
    expect(s.offsetY).toBe(0);
    expect(s.blur).toBe(0);
    expect(s.spread).toBe(0);
    expect(s.inset).toBe(false);
  });

  // ─── .with() ───────────────────────────────────────────────

  it("with({ offsetX }) returns new instance", () => {
    const a = new BoxShadow(0, 2, 4);
    const b = a.with({ offsetX: 5 });
    expect(b.offsetX).toBe(5);
    expect(a.offsetX).toBe(0);
  });

  it("with({ offsetY }) returns new instance", () => {
    const a = new BoxShadow(0, 2, 4);
    const b = a.with({ offsetY: 10 });
    expect(b.offsetY).toBe(10);
    expect(a.offsetY).toBe(2);
  });

  it("with({ blur }) returns new instance", () => {
    const a = new BoxShadow(0, 2, 4);
    const b = a.with({ blur: 16 });
    expect(b.blur).toBe(16);
    expect(a.blur).toBe(4);
  });

  it("with({ spread }) returns new instance", () => {
    const a = new BoxShadow(0, 2, 4);
    const b = a.with({ spread: 8 });
    expect(b.spread).toBe(8);
    expect(a.spread).toBe(0);
  });

  it("with({ color }) accepts a string", () => {
    const a = new BoxShadow(0, 2, 4, 0, "#000");
    const b = a.with({ color: "red" });
    expect(b.color.red).toBe(255);
  });

  it("with({ color }) accepts a Color", () => {
    const a = new BoxShadow(0, 2, 4, 0, "#000");
    const b = a.with({ color: new Color(0, 255, 0) });
    expect(b.color.green).toBe(255);
  });

  it("with({ inset }) returns new instance", () => {
    const a = new BoxShadow(0, 2, 4);
    const b = a.with({ inset: true });
    expect(b.inset).toBe(true);
    expect(a.inset).toBe(false);
  });

  it("with() supports multiple fields at once", () => {
    const a = new BoxShadow(0, 2, 4, 0, "#000");
    const b = a.with({ offsetX: 3, blur: 12, inset: true });
    expect(b.offsetX).toBe(3);
    expect(b.offsetY).toBe(2);
    expect(b.blur).toBe(12);
    expect(b.inset).toBe(true);
  });

  // ─── Manipulation ────────────────────────────────────────────

  it("scale multiplies all numeric values", () => {
    const a = new BoxShadow(1, 2, 4, 1, "#000");
    const b = a.scale(2);
    expect(b.offsetX).toBe(2);
    expect(b.offsetY).toBe(4);
    expect(b.blur).toBe(8);
    expect(b.spread).toBe(2);
  });

  // ─── Serialization ──────────────────────────────────────────

  it("toString() outputs CSS box-shadow value", () => {
    const s = new BoxShadow(0, 2, 8, 0, new Color(0, 0, 0, 0.12));
    const str = s.toString();
    expect(str).toContain("0 2px 8px");
    expect(str).toContain("rgba");
  });

  it("toString() omits blur and spread when both zero", () => {
    const s = new BoxShadow(0, 0, 0, 0, "#000");
    const str = s.toString();
    expect(str).toBe("0 0 rgb(0, 0, 0)");
  });

  it("toString() includes spread when non-zero", () => {
    const s = new BoxShadow(0, 0, 0, 4, "#000");
    const str = s.toString();
    expect(str).toBe("0 0 0 4px rgb(0, 0, 0)");
  });

  it("toString() includes inset keyword", () => {
    const s = new BoxShadow(0, 2, 4, 0, "#000", true);
    expect(s.toString()).toMatch(/^inset /);
  });

  it("toJSON() equals toString()", () => {
    const s = new BoxShadow(0, 2, 4, 0, "#000");
    expect(s.toJSON()).toBe(s.toString());
  });

  // ─── Static methods ─────────────────────────────────────────

  it("combine() joins multiple shadows", () => {
    const a = new BoxShadow(0, 1, 2, 0, "#000");
    const b = new BoxShadow(0, 4, 8, 0, "#000");
    const combined = BoxShadow.combine(a, b);
    expect(combined).toBe(`${a.toString()}, ${b.toString()}`);
  });
});

describe("BoxShadowList", () => {
  it("creates from an array of BoxShadow instances", () => {
    const a = new BoxShadow(0, 1, 2, 0, "#000");
    const b = new BoxShadow(0, 4, 8, 0, "#000");
    const list = new BoxShadowList([a, b]);
    expect(list.length).toBe(2);
    expect(list.at(0)!.offsetY).toBe(1);
    expect(list.at(1)!.blur).toBe(8);
  });

  it("creates from a CSS multi-shadow string", () => {
    const list = new BoxShadowList("0 1px 2px rgba(0,0,0,.1), 0 4px 8px rgba(0,0,0,.05)");
    expect(list.length).toBe(2);
    expect(list.at(0)!.offsetY).toBe(1);
    expect(list.at(0)!.blur).toBe(2);
    expect(list.at(1)!.offsetY).toBe(4);
    expect(list.at(1)!.blur).toBe(8);
  });

  it("creates as a copy from another BoxShadowList", () => {
    const original = new BoxShadowList([
      new BoxShadow(0, 1, 2, 0, "#000"),
      new BoxShadow(0, 4, 8, 0, "#000"),
    ]);
    const copy = new BoxShadowList(original);
    expect(copy.length).toBe(2);
    expect(copy.toString()).toBe(original.toString());
  });

  it("toString() joins shadows with commas", () => {
    const a = new BoxShadow(0, 1, 2, 0, "#000");
    const b = new BoxShadow(0, 4, 8, 0, "#000");
    const list = new BoxShadowList([a, b]);
    expect(list.toString()).toBe(`${a.toString()}, ${b.toString()}`);
  });

  it("toJSON() equals toString()", () => {
    const list = new BoxShadowList([new BoxShadow(0, 1, 2, 0, "#000")]);
    expect(list.toJSON()).toBe(list.toString());
  });

  it("map() transforms each shadow", () => {
    const list = new BoxShadowList([
      new BoxShadow(1, 2, 4, 1, "#000"),
      new BoxShadow(2, 4, 8, 2, "#000"),
    ]);
    const scaled = list.map((s) => s.scale(2));
    expect(scaled.at(0)!.offsetX).toBe(2);
    expect(scaled.at(1)!.offsetX).toBe(4);
  });

  it("layers property returns readonly array", () => {
    const list = new BoxShadowList([new BoxShadow(0, 1, 2, 0, "#000")]);
    expect(list.layers).toHaveLength(1);
  });

  it("parses complex multi-shadow with inset", () => {
    const list = new BoxShadowList("inset 0 1px 2px #000, 0 4px 8px rgba(0,0,0,.1)");
    expect(list.length).toBe(2);
    expect(list.at(0)!.inset).toBe(true);
    expect(list.at(1)!.inset).toBe(false);
  });
});

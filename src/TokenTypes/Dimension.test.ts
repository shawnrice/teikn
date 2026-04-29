import { describe, expect, test } from "bun:test";
import {
  Dimension,
  absoluteConversions,
  absoluteUnits,
  allUnits,
  containerUnits,
  convertDimension,
  fontRelativeUnits,
  isAbsoluteUnit,
  isConvertible,
  isContainerUnit,
  isDimensionUnit,
  isFontRelativeUnit,
  isViewportUnit,
  viewportUnits,
} from "./Dimension.js";

describe("Dimension", () => {
  describe("constructor overloads", () => {
    test("value and unit", () => {
      const d = new Dimension(16, "px");
      expect(d.value).toBe(16);
      expect(d.unit).toBe("px");
    });

    test("CSS string", () => {
      const d = new Dimension("1.5rem");
      expect(d.value).toBe(1.5);
      expect(d.unit).toBe("rem");
    });

    test("copy constructor", () => {
      const original = new Dimension(24, "px");
      const copy = new Dimension(original);
      expect(copy.value).toBe(24);
      expect(copy.unit).toBe("px");
    });

    test("negative value in CSS string", () => {
      const d = new Dimension("-4px");
      expect(d.value).toBe(-4);
      expect(d.unit).toBe("px");
    });

    test("decimal value in CSS string", () => {
      const d = new Dimension("0.75em");
      expect(d.value).toBe(0.75);
      expect(d.unit).toBe("em");
    });

    test("object with value and unit", () => {
      const d = new Dimension({ value: 16, unit: "px" });
      expect(d.value).toBe(16);
      expect(d.unit).toBe("px");
    });

    test("object with value and unit in rem", () => {
      const d = new Dimension({ value: 1.5, unit: "rem" });
      expect(d.value).toBe(1.5);
      expect(d.unit).toBe("rem");
    });

    test("throws on invalid CSS string", () => {
      expect(() => new Dimension("bad")).toThrow("Invalid dimension");
      expect(() => new Dimension("16")).toThrow("Invalid dimension");
      expect(() => new Dimension("")).toThrow("Invalid dimension");
    });
  });

  describe("static helpers", () => {
    test("from() with CSS string", () => {
      const d = Dimension.from("16px");
      expect(d.value).toBe(16);
      expect(d.unit).toBe("px");
    });

    test("from() with object input", () => {
      const d = Dimension.from({ value: 1.5, unit: "rem" });
      expect(d.value).toBe(1.5);
      expect(d.unit).toBe("rem");
    });

    test("from() with Dimension instance returns copy", () => {
      const a = new Dimension(16, "px");
      const b = Dimension.from(a);
      expect(b.value).toBe(16);
      expect(b.unit).toBe("px");
      expect(b).not.toBe(a);
    });

    test("parse()", () => {
      const d = Dimension.parse("32px");
      expect(d.value).toBe(32);
      expect(d.unit).toBe("px");
    });

    test("zero() defaults to px", () => {
      const d = Dimension.zero();
      expect(d.value).toBe(0);
      expect(d.unit).toBe("px");
    });

    test("zero() with custom unit", () => {
      const d = Dimension.zero("rem");
      expect(d.value).toBe(0);
      expect(d.unit).toBe("rem");
    });

    test("Dimension.convert() static method", () => {
      expect(Dimension.convert(96, "px", "in")).toBeCloseTo(1, 10);
      expect(Dimension.convert(32, "px", "rem")).toBe(2);
      expect(Dimension.convert(1, "in", "cm")).toBeCloseTo(2.54, 10);
    });
  });

  describe("toString / toJSON", () => {
    test("toString", () => {
      expect(new Dimension(16, "px").toString()).toBe("16px");
      expect(new Dimension(1.5, "rem").toString()).toBe("1.5rem");
      expect(new Dimension(0, "px").toString()).toBe("0px");
    });

    test("toJSON matches toString", () => {
      const d = new Dimension(16, "px");
      expect(d.toJSON()).toBe(d.toString());
    });
  });

  describe("equals", () => {
    test("equal dimensions", () => {
      expect(new Dimension(16, "px").equals(new Dimension(16, "px"))).toBe(true);
    });

    test("different value", () => {
      expect(new Dimension(16, "px").equals(new Dimension(24, "px"))).toBe(false);
    });

    test("different unit", () => {
      expect(new Dimension(16, "px").equals(new Dimension(16, "rem"))).toBe(false);
    });
  });

  describe("math operations", () => {
    test("scale", () => {
      const d = new Dimension(8, "px").scale(2);
      expect(d.value).toBe(16);
      expect(d.unit).toBe("px");
    });

    test("add same unit", () => {
      const d = new Dimension(8, "px").add(new Dimension(4, "px"));
      expect(d.value).toBe(12);
      expect(d.unit).toBe("px");
    });

    test("add throws on different units", () => {
      expect(() => new Dimension(8, "px").add(new Dimension(1, "rem"))).toThrow("Cannot add");
    });

    test("subtract same unit", () => {
      const d = new Dimension(16, "px").subtract(new Dimension(4, "px"));
      expect(d.value).toBe(12);
      expect(d.unit).toBe("px");
    });

    test("subtract throws on different units", () => {
      expect(() => new Dimension(8, "rem").subtract(new Dimension(1, "em"))).toThrow(
        "Cannot subtract",
      );
    });

    test("negate", () => {
      const d = new Dimension(16, "px").negate();
      expect(d.value).toBe(-16);
      expect(d.unit).toBe("px");
    });

    test("negate negative becomes positive", () => {
      const d = new Dimension(-4, "rem").negate();
      expect(d.value).toBe(4);
      expect(d.unit).toBe("rem");
    });
  });

  describe("unit conversion: px ↔ rem", () => {
    test("px to rem (default base 16)", () => {
      const d = new Dimension(32, "px").toRem();
      expect(d.value).toBe(2);
      expect(d.unit).toBe("rem");
    });

    test("rem to px (default base 16)", () => {
      const d = new Dimension(1.5, "rem").toPx();
      expect(d.value).toBe(24);
      expect(d.unit).toBe("px");
    });

    test("px to rem with custom base", () => {
      const d = new Dimension(20, "px").toRem(10);
      expect(d.value).toBe(2);
      expect(d.unit).toBe("rem");
    });

    test("rem to px with custom base", () => {
      const d = new Dimension(2, "rem").toPx(10);
      expect(d.value).toBe(20);
      expect(d.unit).toBe("px");
    });
  });

  describe("unit conversion: absolute units", () => {
    test("px to in", () => {
      const d = new Dimension(96, "px").to("in");
      expect(d.value).toBeCloseTo(1, 10);
      expect(d.unit).toBe("in");
    });

    test("in to px", () => {
      const d = new Dimension(1, "in").to("px");
      expect(d.value).toBeCloseTo(96, 10);
    });

    test("px to cm", () => {
      const d = new Dimension(96, "px").to("cm");
      expect(d.value).toBeCloseTo(2.54, 10);
    });

    test("cm to px", () => {
      const d = new Dimension(2.54, "cm").to("px");
      expect(d.value).toBeCloseTo(96, 10);
    });

    test("px to mm", () => {
      const d = new Dimension(96, "px").to("mm");
      expect(d.value).toBeCloseTo(25.4, 10);
    });

    test("px to pt", () => {
      const d = new Dimension(96, "px").to("pt");
      expect(d.value).toBeCloseTo(72, 10);
    });

    test("pt to px", () => {
      const d = new Dimension(72, "pt").to("px");
      expect(d.value).toBeCloseTo(96, 10);
    });

    test("px to pc", () => {
      const d = new Dimension(16, "px").to("pc");
      expect(d.value).toBeCloseTo(1, 10);
    });

    test("pc to px", () => {
      const d = new Dimension(1, "pc").to("px");
      expect(d.value).toBeCloseTo(16, 10);
    });

    test("px to Q", () => {
      const d = new Dimension(96, "px").to("Q");
      expect(d.value).toBeCloseTo(101.6, 10);
    });

    test("Q to px", () => {
      const d = new Dimension(101.6, "Q").to("px");
      expect(d.value).toBeCloseTo(96, 10);
    });

    test("in to cm", () => {
      const d = new Dimension(1, "in").to("cm");
      expect(d.value).toBeCloseTo(2.54, 10);
    });

    test("same unit returns new instance", () => {
      const d = new Dimension(16, "px").to("px");
      expect(d.value).toBe(16);
      expect(d.unit).toBe("px");
    });
  });

  describe("conversion: px ↔ rem via to()", () => {
    test("px to rem via to()", () => {
      const d = new Dimension(32, "px").to("rem");
      expect(d.value).toBe(2);
    });

    test("rem to px via to()", () => {
      const d = new Dimension(2, "rem").to("px");
      expect(d.value).toBe(32);
    });

    test("px to rem via to() with custom base", () => {
      const d = new Dimension(20, "px").to("rem", { remBase: 10 });
      expect(d.value).toBe(2);
    });
  });

  describe("incompatible conversions throw", () => {
    test("px to vw throws", () => {
      expect(() => new Dimension(100, "px").to("vw")).toThrow("Cannot convert");
    });

    test("em to px throws", () => {
      expect(() => new Dimension(1, "em").to("px")).toThrow("Cannot convert");
    });

    test("% to rem throws", () => {
      expect(() => new Dimension(50, "%").to("rem")).toThrow("Cannot convert");
    });

    test("vw to vh throws", () => {
      expect(() => new Dimension(100, "vw").to("vh")).toThrow("Cannot convert");
    });
  });

  describe("all supported units parse", () => {
    const units = [
      "px",
      "rem",
      "em",
      "%",
      "cm",
      "mm",
      "in",
      "pt",
      "pc",
      "Q",
      "vw",
      "vh",
      "vmin",
      "vmax",
      "ch",
      "ex",
      "fr",
      "svw",
      "svh",
      "lvw",
      "lvh",
      "dvw",
      "dvh",
      "lh",
      "rlh",
      "cqi",
      "cqb",
    ] as const;
    for (const unit of units) {
      test(`parses 1${unit}`, () => {
        const d = new Dimension(`1${unit}`);
        expect(d.value).toBe(1);
        expect(d.unit).toBe(unit);
      });
    }
  });

  describe("immutability", () => {
    test("scale returns new instance", () => {
      const a = new Dimension(8, "px");
      const b = a.scale(2);
      expect(a.value).toBe(8);
      expect(b.value).toBe(16);
    });

    test("add returns new instance", () => {
      const a = new Dimension(8, "px");
      const b = new Dimension(4, "px");
      const c = a.add(b);
      expect(a.value).toBe(8);
      expect(b.value).toBe(4);
      expect(c.value).toBe(12);
    });
  });

  describe("unit classification (instance)", () => {
    test("px is absolute", () => {
      const d = new Dimension(16, "px");
      expect(d.isAbsolute).toBe(true);
      expect(d.isRelative).toBe(false);
      expect(d.isViewport).toBe(false);
      expect(d.isFontRelative).toBe(false);
      expect(d.isContainer).toBe(false);
    });

    test("rem is font-relative", () => {
      const d = new Dimension(1, "rem");
      expect(d.isAbsolute).toBe(false);
      expect(d.isRelative).toBe(true);
      expect(d.isFontRelative).toBe(true);
    });

    test("vw is viewport", () => {
      const d = new Dimension(100, "vw");
      expect(d.isViewport).toBe(true);
      expect(d.isRelative).toBe(true);
      expect(d.isAbsolute).toBe(false);
    });

    test("cqi is container", () => {
      const d = new Dimension(50, "cqi");
      expect(d.isContainer).toBe(true);
      expect(d.isRelative).toBe(true);
    });

    test("cm is absolute", () => {
      expect(new Dimension(1, "cm").isAbsolute).toBe(true);
    });
  });

  describe("isConvertibleTo()", () => {
    test("px to rem is convertible", () => {
      expect(new Dimension(16, "px").isConvertibleTo("rem")).toBe(true);
    });

    test("rem to px is convertible", () => {
      expect(new Dimension(1, "rem").isConvertibleTo("px")).toBe(true);
    });

    test("px to cm is convertible", () => {
      expect(new Dimension(16, "px").isConvertibleTo("cm")).toBe(true);
    });

    test("in to pt is convertible", () => {
      expect(new Dimension(1, "in").isConvertibleTo("pt")).toBe(true);
    });

    test("same unit is always convertible", () => {
      expect(new Dimension(100, "vw").isConvertibleTo("vw")).toBe(true);
    });

    test("px to vw is not convertible", () => {
      expect(new Dimension(16, "px").isConvertibleTo("vw")).toBe(false);
    });

    test("em to px is not convertible", () => {
      expect(new Dimension(1, "em").isConvertibleTo("px")).toBe(false);
    });

    test("% to rem is not convertible", () => {
      expect(new Dimension(50, "%").isConvertibleTo("rem")).toBe(false);
    });
  });
});

describe("unit predicates", () => {
  test("isAbsoluteUnit", () => {
    expect(isAbsoluteUnit("px")).toBe(true);
    expect(isAbsoluteUnit("cm")).toBe(true);
    expect(isAbsoluteUnit("Q")).toBe(true);
    expect(isAbsoluteUnit("rem")).toBe(false);
    expect(isAbsoluteUnit("vw")).toBe(false);
  });

  test("isViewportUnit", () => {
    expect(isViewportUnit("vw")).toBe(true);
    expect(isViewportUnit("dvh")).toBe(true);
    expect(isViewportUnit("svw")).toBe(true);
    expect(isViewportUnit("px")).toBe(false);
  });

  test("isFontRelativeUnit", () => {
    expect(isFontRelativeUnit("rem")).toBe(true);
    expect(isFontRelativeUnit("em")).toBe(true);
    expect(isFontRelativeUnit("ch")).toBe(true);
    expect(isFontRelativeUnit("lh")).toBe(true);
    expect(isFontRelativeUnit("px")).toBe(false);
  });

  test("isContainerUnit", () => {
    expect(isContainerUnit("cqi")).toBe(true);
    expect(isContainerUnit("cqb")).toBe(true);
    expect(isContainerUnit("vw")).toBe(false);
  });

  test("isDimensionUnit", () => {
    expect(isDimensionUnit("px")).toBe(true);
    expect(isDimensionUnit("rem")).toBe(true);
    expect(isDimensionUnit("vw")).toBe(true);
    expect(isDimensionUnit("cqi")).toBe(true);
    expect(isDimensionUnit("fr")).toBe(true);
    expect(isDimensionUnit("%")).toBe(true);
    expect(isDimensionUnit("bogus")).toBe(false);
    expect(isDimensionUnit("ms")).toBe(false);
  });
});

describe("unit sets", () => {
  test("absoluteUnits contains all 7 absolute units", () => {
    expect(absoluteUnits.size).toBe(7);
    expect(absoluteUnits.has("px")).toBe(true);
    expect(absoluteUnits.has("Q")).toBe(true);
  });

  test("viewportUnits contains 10 viewport units", () => {
    expect(viewportUnits.size).toBe(10);
    expect(viewportUnits.has("dvh")).toBe(true);
    expect(viewportUnits.has("svw")).toBe(true);
  });

  test("fontRelativeUnits contains 6 font-relative units", () => {
    expect(fontRelativeUnits.size).toBe(6);
    expect(fontRelativeUnits.has("rlh")).toBe(true);
  });

  test("containerUnits contains 2 container units", () => {
    expect(containerUnits.size).toBe(2);
  });

  test("allUnits contains all 27 supported units", () => {
    expect(allUnits.size).toBe(27);
  });
});

describe("isConvertible (static)", () => {
  test("same unit is always convertible", () => {
    expect(isConvertible("vw", "vw")).toBe(true);
    expect(isConvertible("%", "%")).toBe(true);
  });

  test("absolute to absolute", () => {
    expect(isConvertible("px", "in")).toBe(true);
    expect(isConvertible("cm", "mm")).toBe(true);
  });

  test("px ↔ rem", () => {
    expect(isConvertible("px", "rem")).toBe(true);
    expect(isConvertible("rem", "px")).toBe(true);
  });

  test("incompatible pairs", () => {
    expect(isConvertible("px", "vw")).toBe(false);
    expect(isConvertible("em", "rem")).toBe(false);
    expect(isConvertible("%", "px")).toBe(false);
  });
});

describe("convertDimension (static)", () => {
  test("px to in", () => {
    expect(convertDimension(96, "px", "in")).toBeCloseTo(1, 10);
  });

  test("px to rem with default base", () => {
    expect(convertDimension(32, "px", "rem")).toBe(2);
  });

  test("px to rem with custom base", () => {
    expect(convertDimension(20, "px", "rem", { remBase: 10 })).toBe(2);
  });

  test("rem to px", () => {
    expect(convertDimension(2, "rem", "px")).toBe(32);
  });

  test("same unit returns same value", () => {
    expect(convertDimension(42, "px", "px")).toBe(42);
  });

  test("throws on incompatible", () => {
    expect(() => convertDimension(100, "px", "vw")).toThrow("Cannot convert");
  });
});

describe("absoluteConversions", () => {
  test("1in = 96px", () => {
    expect(absoluteConversions.in).toBe(96);
  });

  test("1cm = 96/2.54 px", () => {
    expect(absoluteConversions.cm).toBeCloseTo(96 / 2.54, 10);
  });

  test("1pt = 96/72 px", () => {
    expect(absoluteConversions.pt).toBeCloseTo(96 / 72, 10);
  });

  test("1pc = 16px", () => {
    expect(absoluteConversions.pc).toBe(16);
  });

  test("1Q = 96/101.6 px", () => {
    expect(absoluteConversions.Q).toBeCloseTo(96 / 101.6, 10);
  });

  test("all 7 absolute units have factors", () => {
    expect(Object.keys(absoluteConversions)).toHaveLength(7);
  });
});

import { describe, expect, test } from "bun:test";
import { Duration, convertDuration, durationUnits, isDurationUnit } from "./Duration";

describe("Duration", () => {
  describe("constructor overloads", () => {
    test("value and unit", () => {
      const d = new Duration(200, "ms");
      expect(d.value).toBe(200);
      expect(d.unit).toBe("ms");
    });

    test("CSS string ms", () => {
      const d = new Duration("300ms");
      expect(d.value).toBe(300);
      expect(d.unit).toBe("ms");
    });

    test("CSS string s", () => {
      const d = new Duration("0.5s");
      expect(d.value).toBe(0.5);
      expect(d.unit).toBe("s");
    });

    test("copy constructor", () => {
      const original = new Duration(200, "ms");
      const copy = new Duration(original);
      expect(copy.value).toBe(200);
      expect(copy.unit).toBe("ms");
    });

    test("negative value in CSS string", () => {
      const d = new Duration("-100ms");
      expect(d.value).toBe(-100);
      expect(d.unit).toBe("ms");
    });

    test("object with value and unit", () => {
      const d = new Duration({ value: 200, unit: "ms" });
      expect(d.value).toBe(200);
      expect(d.unit).toBe("ms");
    });

    test("object with value and unit in seconds", () => {
      const d = new Duration({ value: 0.5, unit: "s" });
      expect(d.value).toBe(0.5);
      expect(d.unit).toBe("s");
    });

    test("throws on invalid CSS string", () => {
      expect(() => new Duration("bad")).toThrow("Invalid duration");
      expect(() => new Duration("200")).toThrow("Invalid duration");
      expect(() => new Duration("")).toThrow("Invalid duration");
      expect(() => new Duration("200px")).toThrow("Invalid duration");
    });
  });

  describe("static helpers", () => {
    test("parse()", () => {
      const d = Duration.parse("500ms");
      expect(d.value).toBe(500);
      expect(d.unit).toBe("ms");
    });

    test("zero() defaults to ms", () => {
      const d = Duration.zero();
      expect(d.value).toBe(0);
      expect(d.unit).toBe("ms");
    });

    test("zero() with s", () => {
      const d = Duration.zero("s");
      expect(d.value).toBe(0);
      expect(d.unit).toBe("s");
    });

    test("Duration.convert() static method", () => {
      expect(Duration.convert(1000, "ms", "s")).toBe(1);
      expect(Duration.convert(0.5, "s", "ms")).toBe(500);
      expect(Duration.convert(200, "ms", "ms")).toBe(200);
    });

    test("from() with CSS string", () => {
      const d = Duration.from("2s");
      expect(d.value).toBe(2);
      expect(d.unit).toBe("s");
    });

    test("from() with ms string", () => {
      const d = Duration.from("200ms");
      expect(d.value).toBe(200);
      expect(d.unit).toBe("ms");
    });

    test("from() with object input", () => {
      const d = Duration.from({ value: 200, unit: "ms" });
      expect(d.value).toBe(200);
      expect(d.unit).toBe("ms");
    });

    test("from() with Duration instance returns copy", () => {
      const a = new Duration(200, "ms");
      const b = Duration.from(a);
      expect(b.value).toBe(200);
      expect(b.unit).toBe("ms");
      expect(b).not.toBe(a);
    });
  });

  describe("toString / toJSON", () => {
    test("toString ms", () => {
      expect(new Duration(200, "ms").toString()).toBe("200ms");
    });

    test("toString s", () => {
      expect(new Duration(0.2, "s").toString()).toBe("0.2s");
    });

    test("toJSON matches toString", () => {
      const d = new Duration(200, "ms");
      expect(d.toJSON()).toBe(d.toString());
    });
  });

  describe("equals", () => {
    test("equal durations", () => {
      expect(new Duration(200, "ms").equals(new Duration(200, "ms"))).toBe(true);
    });

    test("different value", () => {
      expect(new Duration(200, "ms").equals(new Duration(300, "ms"))).toBe(false);
    });

    test("different unit", () => {
      expect(new Duration(200, "ms").equals(new Duration(200, "s"))).toBe(false);
    });

    test("equivalent but different units are not equal", () => {
      expect(new Duration(1000, "ms").equals(new Duration(1, "s"))).toBe(false);
    });
  });

  describe("unit conversion", () => {
    test("ms to s", () => {
      const d = new Duration(1000, "ms").to("s");
      expect(d.value).toBe(1);
      expect(d.unit).toBe("s");
    });

    test("s to ms", () => {
      const d = new Duration(0.5, "s").to("ms");
      expect(d.value).toBe(500);
      expect(d.unit).toBe("ms");
    });

    test("toMs()", () => {
      const d = new Duration(1.5, "s").toMs();
      expect(d.value).toBe(1500);
      expect(d.unit).toBe("ms");
    });

    test("toS()", () => {
      const d = new Duration(250, "ms").toS();
      expect(d.value).toBe(0.25);
      expect(d.unit).toBe("s");
    });

    test("same unit returns new instance", () => {
      const d = new Duration(200, "ms").to("ms");
      expect(d.value).toBe(200);
      expect(d.unit).toBe("ms");
    });
  });

  describe("ms() helper", () => {
    test("returns value when already ms", () => {
      expect(new Duration(300, "ms").ms()).toBe(300);
    });

    test("converts s to ms", () => {
      expect(new Duration(0.3, "s").ms()).toBe(300);
    });
  });

  describe("math operations", () => {
    test("scale", () => {
      const d = new Duration(200, "ms").scale(2);
      expect(d.value).toBe(400);
      expect(d.unit).toBe("ms");
    });

    test("add same unit", () => {
      const d = new Duration(200, "ms").add(new Duration(100, "ms"));
      expect(d.value).toBe(300);
      expect(d.unit).toBe("ms");
    });

    test("add converts to this.unit", () => {
      const d = new Duration(200, "ms").add(new Duration(0.5, "s"));
      expect(d.value).toBe(700);
      expect(d.unit).toBe("ms");
    });

    test("add s + ms converts to s", () => {
      const d = new Duration(1, "s").add(new Duration(500, "ms"));
      expect(d.value).toBe(1.5);
      expect(d.unit).toBe("s");
    });

    test("subtract same unit", () => {
      const d = new Duration(500, "ms").subtract(new Duration(200, "ms"));
      expect(d.value).toBe(300);
      expect(d.unit).toBe("ms");
    });

    test("subtract converts to this.unit", () => {
      const d = new Duration(1, "s").subtract(new Duration(500, "ms"));
      expect(d.value).toBe(0.5);
      expect(d.unit).toBe("s");
    });
  });

  describe("immutability", () => {
    test("scale returns new instance", () => {
      const a = new Duration(200, "ms");
      const b = a.scale(2);
      expect(a.value).toBe(200);
      expect(b.value).toBe(400);
    });

    test("to returns new instance", () => {
      const a = new Duration(1000, "ms");
      const b = a.toS();
      expect(a.value).toBe(1000);
      expect(a.unit).toBe("ms");
      expect(b.value).toBe(1);
      expect(b.unit).toBe("s");
    });
  });

  describe("edge cases", () => {
    test("zero duration", () => {
      const d = new Duration(0, "ms");
      expect(d.toString()).toBe("0ms");
      expect(d.ms()).toBe(0);
    });

    test("very small duration", () => {
      const d = new Duration(0.001, "s");
      expect(d.toMs().value).toBe(1);
    });
  });
});

describe("isDurationUnit", () => {
  test("ms is a duration unit", () => {
    expect(isDurationUnit("ms")).toBe(true);
  });

  test("s is a duration unit", () => {
    expect(isDurationUnit("s")).toBe(true);
  });

  test("px is not a duration unit", () => {
    expect(isDurationUnit("px")).toBe(false);
  });

  test("empty string is not a duration unit", () => {
    expect(isDurationUnit("")).toBe(false);
  });
});

describe("durationUnits", () => {
  test("contains ms and s", () => {
    expect(durationUnits.has("ms")).toBe(true);
    expect(durationUnits.has("s")).toBe(true);
    expect(durationUnits.size).toBe(2);
  });
});

describe("convertDuration (static)", () => {
  test("ms to s", () => {
    expect(convertDuration(1000, "ms", "s")).toBe(1);
  });

  test("s to ms", () => {
    expect(convertDuration(0.5, "s", "ms")).toBe(500);
  });

  test("same unit returns same value", () => {
    expect(convertDuration(200, "ms", "ms")).toBe(200);
  });
});

import { describe, expect, it } from "bun:test";
import { CubicBezier } from "./CubicBezier";
import { Duration } from "./Duration";
import { Transition, TransitionList } from "./Transition";

describe("Transition", () => {
  // ─── Construction ────────────────────────────────────────────

  it("constructs from duration string and timing string", () => {
    const t = new Transition("0.2s", "ease");
    expect(t.duration).toBeInstanceOf(Duration);
    expect(t.duration.toString()).toBe("0.2s");
    expect(t.timingFunction).toBeInstanceOf(CubicBezier);
    expect(t.timingFunction.keyword).toBe("ease");
  });

  it("constructs from duration string and CubicBezier", () => {
    const t = new Transition("300ms", CubicBezier.standard);
    expect(t.duration.toString()).toBe("300ms");
    expect(t.timingFunction.x1).toBe(0.4);
  });

  it("constructs with delay string", () => {
    const t = new Transition("0.2s", "ease", "50ms");
    expect(t.delay).toBeInstanceOf(Duration);
    expect(t.delay.toString()).toBe("50ms");
  });

  it("constructs with property", () => {
    const t = new Transition("0.2s", "ease", "0s", "opacity");
    expect(t.property).toBe("opacity");
  });

  it("constructs with all parameters as strings", () => {
    const t = new Transition("200ms", CubicBezier.standard, "50ms", "transform");
    expect(t.duration.toString()).toBe("200ms");
    expect(t.timingFunction.x1).toBe(0.4);
    expect(t.delay.toString()).toBe("50ms");
    expect(t.property).toBe("transform");
  });

  it("constructs with Duration for duration", () => {
    const t = new Transition(new Duration(200, "ms"), "ease");
    expect(t.duration.toString()).toBe("200ms");
    expect(t.timingFunction.keyword).toBe("ease");
  });

  it("constructs with Duration for both duration and delay", () => {
    const t = new Transition(new Duration(300, "ms"), CubicBezier.standard, new Duration(50, "ms"), "transform");
    expect(t.duration.toString()).toBe("300ms");
    expect(t.delay.toString()).toBe("50ms");
    expect(t.property).toBe("transform");
  });

  it("constructs with Duration in seconds", () => {
    const t = new Transition(new Duration(0.2, "s"), "ease-in-out");
    expect(t.duration.toString()).toBe("0.2s");
  });

  it("constructs from options object", () => {
    const t = new Transition({ duration: "200ms", timingFunction: CubicBezier.standard });
    expect(t.duration.toString()).toBe("200ms");
    expect(t.timingFunction.x1).toBe(0.4);
    expect(t.delay.toString()).toBe("0s");
    expect(t.property).toBe("all");
  });

  it("constructs from options object with all fields", () => {
    const t = new Transition({
      duration: new Duration(300, "ms"),
      timingFunction: "ease-in-out",
      delay: new Duration(50, "ms"),
      property: "opacity",
    });
    expect(t.duration.toString()).toBe("300ms");
    expect(t.timingFunction.keyword).toBe("ease-in-out");
    expect(t.delay.toString()).toBe("50ms");
    expect(t.property).toBe("opacity");
  });

  it("from() accepts a CSS string", () => {
    const t = Transition.from("opacity 0.2s ease");
    expect(t.property).toBe("opacity");
    expect(t.duration.toString()).toBe("0.2s");
  });

  it("from() accepts an options object", () => {
    const t = Transition.from({ duration: "200ms", timingFunction: "ease", property: "opacity" });
    expect(t.duration.toString()).toBe("200ms");
    expect(t.property).toBe("opacity");
  });

  it("from() accepts a Transition instance", () => {
    const a = new Transition("200ms", "ease");
    const b = Transition.from(a);
    expect(b.duration.toString()).toBe("200ms");
    expect(b).not.toBe(a);
  });

  it("defaults delay to 0s", () => {
    const t = new Transition("0.2s", "ease");
    expect(t.delay.toString()).toBe("0s");
  });

  it("defaults property to all", () => {
    const t = new Transition("0.2s", "ease");
    expect(t.property).toBe("all");
  });

  // ─── CSS string parsing ──────────────────────────────────────

  it('parses simple CSS: "0.2s ease"', () => {
    const t = new Transition("0.2s ease");
    expect(t.duration.toString()).toBe("0.2s");
    expect(t.timingFunction.keyword).toBe("ease");
    expect(t.delay.toString()).toBe("0s");
    expect(t.property).toBe("all");
  });

  it('parses with property: "opacity 0.2s ease"', () => {
    const t = new Transition("opacity 0.2s ease");
    expect(t.property).toBe("opacity");
    expect(t.duration.toString()).toBe("0.2s");
    expect(t.timingFunction.keyword).toBe("ease");
  });

  it('parses with delay: "all 200ms ease 50ms"', () => {
    const t = new Transition("all 200ms ease 50ms");
    expect(t.property).toBe("all");
    expect(t.duration.toString()).toBe("200ms");
    expect(t.timingFunction.keyword).toBe("ease");
    expect(t.delay.toString()).toBe("50ms");
  });

  it('parses cubic-bezier: "0.3s cubic-bezier(0.4, 0, 0.2, 1)"', () => {
    const t = new Transition("0.3s cubic-bezier(0.4, 0, 0.2, 1)");
    expect(t.duration.toString()).toBe("0.3s");
    expect(t.timingFunction.x1).toBe(0.4);
    expect(t.timingFunction.y1).toBe(0);
    expect(t.timingFunction.x2).toBe(0.2);
    expect(t.timingFunction.y2).toBe(1);
  });

  it('parses full: "transform 200ms cubic-bezier(0.4, 0, 0.2, 1) 50ms"', () => {
    const t = new Transition("transform 200ms cubic-bezier(0.4, 0, 0.2, 1) 50ms");
    expect(t.property).toBe("transform");
    expect(t.duration.toString()).toBe("200ms");
    expect(t.timingFunction.x1).toBe(0.4);
    expect(t.delay.toString()).toBe("50ms");
  });

  it("parses keyword timings: ease-in, ease-out, ease-in-out, linear", () => {
    expect(new Transition("0.2s ease-in").timingFunction.keyword).toBe("ease-in");
    expect(new Transition("0.2s ease-out").timingFunction.keyword).toBe("ease-out");
    expect(new Transition("0.2s ease-in-out").timingFunction.keyword).toBe("ease-in-out");
    expect(new Transition("0.2s linear").timingFunction.keyword).toBe("linear");
  });

  // ─── Copy constructor ────────────────────────────────────────

  it("copies from existing Transition", () => {
    const a = new Transition("200ms", CubicBezier.standard, "50ms", "transform");
    const b = new Transition(a);
    expect(b.duration.equals(a.duration)).toBe(true);
    expect(b.timingFunction.controlPoints).toEqual(a.timingFunction.controlPoints);
    expect(b.delay.equals(a.delay)).toBe(true);
    expect(b.property).toBe(a.property);
    expect(b).not.toBe(a);
  });

  // ─── Getters ─────────────────────────────────────────────────

  it("duration getter returns Duration", () => {
    const d = new Transition("0.3s", "ease").duration;
    expect(d).toBeInstanceOf(Duration);
    expect(d.toString()).toBe("0.3s");
  });

  it("timingFunction getter returns CubicBezier", () => {
    const t = new Transition("0.2s", CubicBezier.easeIn);
    expect(t.timingFunction).toBeInstanceOf(CubicBezier);
    expect(t.timingFunction.keyword).toBe("ease-in");
  });

  it("delay getter returns Duration", () => {
    const d = new Transition("0.2s", "ease", "100ms").delay;
    expect(d).toBeInstanceOf(Duration);
    expect(d.toString()).toBe("100ms");
  });

  it("property getter returns property string", () => {
    expect(new Transition("0.2s", "ease", "0s", "opacity").property).toBe("opacity");
  });

  // ─── Immutable setters ───────────────────────────────────────

  it("setDuration with string returns new instance", () => {
    const a = new Transition("0.2s", "ease");
    const b = a.setDuration("0.5s");
    expect(b.duration.toString()).toBe("0.5s");
    expect(a.duration.toString()).toBe("0.2s");
  });

  it("setDuration with Duration returns new instance", () => {
    const a = new Transition("0.2s", "ease");
    const b = a.setDuration(new Duration(500, "ms"));
    expect(b.duration.toString()).toBe("500ms");
    expect(a.duration.toString()).toBe("0.2s");
  });

  it("setTimingFunction with CubicBezier", () => {
    const a = new Transition("0.2s", "ease");
    const b = a.setTimingFunction(CubicBezier.standard);
    expect(b.timingFunction.x1).toBe(0.4);
    expect(a.timingFunction.keyword).toBe("ease");
  });

  it("setTimingFunction with string", () => {
    const a = new Transition("0.2s", "ease");
    const b = a.setTimingFunction("ease-in-out");
    expect(b.timingFunction.keyword).toBe("ease-in-out");
    expect(a.timingFunction.keyword).toBe("ease");
  });

  it("setDelay with string returns new instance", () => {
    const a = new Transition("0.2s", "ease");
    const b = a.setDelay("100ms");
    expect(b.delay.toString()).toBe("100ms");
    expect(a.delay.toString()).toBe("0s");
  });

  it("setDelay with Duration returns new instance", () => {
    const a = new Transition("0.2s", "ease");
    const b = a.setDelay(new Duration(100, "ms"));
    expect(b.delay.toString()).toBe("100ms");
    expect(a.delay.toString()).toBe("0s");
  });

  it("setProperty returns new instance", () => {
    const a = new Transition("0.2s", "ease");
    const b = a.setProperty("opacity");
    expect(b.property).toBe("opacity");
    expect(a.property).toBe("all");
  });

  // ─── Math: scale ────────────────────────────────────────────

  it("scale(k) multiplies duration and delay by k", () => {
    const t = new Transition("200ms", "ease", "100ms", "opacity");
    const scaled = t.scale(2);
    expect(scaled.duration.toString()).toBe("400ms");
    expect(scaled.delay.toString()).toBe("200ms");
  });

  it("scale preserves timingFunction and property", () => {
    const t = new Transition("200ms", CubicBezier.standard, "0s", "transform");
    const scaled = t.scale(3);
    expect(scaled.timingFunction.x1).toBe(0.4);
    expect(scaled.property).toBe("transform");
  });

  it("scale(0) produces zero durations (reduced motion)", () => {
    const t = new Transition("300ms", "ease", "100ms");
    const instant = t.scale(0);
    expect(instant.duration.toString()).toBe("0ms");
    expect(instant.delay.toString()).toBe("0ms");
  });

  it("scale(0.5) halves duration and delay", () => {
    const t = new Transition("400ms", "ease", "200ms");
    const halved = t.scale(0.5);
    expect(halved.duration.toString()).toBe("200ms");
    expect(halved.delay.toString()).toBe("100ms");
  });

  it("scale is immutable", () => {
    const t = new Transition("200ms", "ease");
    const scaled = t.scale(3);
    expect(t.duration.toString()).toBe("200ms");
    expect(scaled.duration.toString()).toBe("600ms");
  });

  // ─── Math: shift ────────────────────────────────────────────

  it("shift(Δ) adds to delay", () => {
    const t = new Transition("200ms", "ease", "50ms");
    const shifted = t.shift(new Duration(100, "ms"));
    expect(shifted.delay.toString()).toBe("150ms");
  });

  it("shift preserves duration, timingFunction, and property", () => {
    const t = new Transition("200ms", CubicBezier.standard, "0s", "opacity");
    const shifted = t.shift(new Duration(50, "ms"));
    expect(shifted.duration.toString()).toBe("200ms");
    expect(shifted.timingFunction.x1).toBe(0.4);
    expect(shifted.property).toBe("opacity");
  });

  it("shift accepts string", () => {
    const t = new Transition("200ms", "ease");
    const shifted = t.shift("100ms");
    // default delay is 0s, so add(100ms) converts to s
    expect(shifted.delay.ms()).toBe(100);
  });

  it("shift with cross-unit converts to delay's unit", () => {
    const t = new Transition("200ms", "ease", "0.1s");
    const shifted = t.shift(new Duration(200, "ms"));
    // Duration.add preserves this.unit (s), so 0.1s + 200ms = 0.3s
    expect(shifted.delay.unit).toBe("s");
    expect(shifted.delay.amount).toBeCloseTo(0.3);
  });

  it("shift is immutable", () => {
    const t = new Transition("200ms", "ease", "50ms");
    const shifted = t.shift(new Duration(100, "ms"));
    expect(t.delay.toString()).toBe("50ms");
    expect(shifted.delay.toString()).toBe("150ms");
  });

  it("shift composes for stagger patterns", () => {
    const base = new Transition("200ms", "ease");
    const gap = new Duration(50, "ms");
    const staggered = [0, 1, 2].map((i) => base.shift(gap.scale(i)));
    expect(staggered[0]!.delay.ms()).toBe(0);
    expect(staggered[1]!.delay.ms()).toBe(50);
    expect(staggered[2]!.delay.ms()).toBe(100);
  });

  // ─── Math: reverse ─────────────────────────────────────────

  it("reverse() reverses the timing function", () => {
    const t = new Transition("200ms", CubicBezier.easeIn);
    const reversed = t.reverse();
    // easeIn reversed should be easeOut's control points
    const original = t.timingFunction;
    const rev = reversed.timingFunction;
    expect(rev.x1).toBe(1 - original.x2);
    expect(rev.y1).toBe(1 - original.y2);
    expect(rev.x2).toBe(1 - original.x1);
    expect(rev.y2).toBe(1 - original.y1);
  });

  it("reverse preserves duration, delay, and property", () => {
    const t = new Transition("300ms", CubicBezier.standard, "50ms", "opacity");
    const reversed = t.reverse();
    expect(reversed.duration.toString()).toBe("300ms");
    expect(reversed.delay.toString()).toBe("50ms");
    expect(reversed.property).toBe("opacity");
  });

  it("reverse is immutable", () => {
    const t = new Transition("200ms", CubicBezier.easeIn);
    const reversed = t.reverse();
    expect(t.timingFunction.keyword).toBe("ease-in");
    expect(reversed.timingFunction.keyword).not.toBe("ease-in");
  });

  it("reverse().reverse() round-trips", () => {
    const t = new Transition("200ms", new CubicBezier(0.4, 0, 0.2, 1));
    const roundTripped = t.reverse().reverse();
    expect(roundTripped.timingFunction.x1).toBeCloseTo(t.timingFunction.x1);
    expect(roundTripped.timingFunction.y1).toBeCloseTo(t.timingFunction.y1);
    expect(roundTripped.timingFunction.x2).toBeCloseTo(t.timingFunction.x2);
    expect(roundTripped.timingFunction.y2).toBeCloseTo(t.timingFunction.y2);
  });

  // ─── Derived: totalTime ──────────────────────────────────────

  it("totalTime returns duration + delay", () => {
    const t = new Transition("200ms", "ease", "50ms");
    const total = t.totalTime;
    expect(total).toBeInstanceOf(Duration);
    expect(total.toString()).toBe("250ms");
  });

  it("totalTime with zero delay equals duration", () => {
    const t = new Transition("300ms", "ease");
    expect(t.totalTime.toString()).toBe("300ms");
  });

  it("totalTime with cross-unit values converts to duration's unit", () => {
    const t = new Transition("0.2s", "ease", "100ms");
    const total = t.totalTime;
    expect(total.unit).toBe("s");
    expect(total.amount).toBeCloseTo(0.3);
  });

  // ─── Serialization ──────────────────────────────────────────

  it("toString with defaults omits property and delay", () => {
    const t = new Transition("0.2s", "ease");
    expect(t.toString()).toBe("0.2s ease");
  });

  it('toString includes property when not "all"', () => {
    const t = new Transition("0.2s", "ease", "0s", "opacity");
    expect(t.toString()).toBe("opacity 0.2s ease");
  });

  it('toString includes delay when not "0s"', () => {
    const t = new Transition("0.2s", "ease", "50ms");
    expect(t.toString()).toBe("0.2s ease 50ms");
  });

  it("toString with cubic-bezier timing", () => {
    const t = new Transition("200ms", CubicBezier.standard, "50ms", "transform");
    expect(t.toString()).toBe("transform 200ms cubic-bezier(0.4, 0, 0.2, 1) 50ms");
  });

  it("toJSON returns same as toString", () => {
    const t = new Transition("0.2s", "ease", "50ms", "opacity");
    expect(t.toJSON()).toBe(t.toString());
  });

  // ─── Static presets ──────────────────────────────────────────

  it("Transition.fade exists", () => {
    expect(Transition.fade.duration.toString()).toBe("0.2s");
    expect(Transition.fade.timingFunction.keyword).toBe("ease");
    expect(Transition.fade.toString()).toBe("0.2s ease");
  });

  it("Transition.slide uses Material standard curve", () => {
    expect(Transition.slide.duration.toString()).toBe("0.3s");
    expect(Transition.slide.timingFunction.x1).toBe(0.4);
    expect(Transition.slide.timingFunction.y2).toBe(1);
  });

  it("Transition.quick is fast", () => {
    expect(Transition.quick.duration.toString()).toBe("0.1s");
    expect(Transition.quick.timingFunction.keyword).toBe("ease");
  });

  // ─── Round-trip ──────────────────────────────────────────────

  it("parsing toString output produces equivalent Transition", () => {
    const original = new Transition("200ms", CubicBezier.standard, "50ms", "transform");
    const roundTripped = new Transition(original.toString());
    expect(roundTripped.duration.equals(original.duration)).toBe(true);
    expect(roundTripped.timingFunction.controlPoints).toEqual(
      original.timingFunction.controlPoints,
    );
    expect(roundTripped.delay.equals(original.delay)).toBe(true);
    expect(roundTripped.property).toBe(original.property);
  });
});

describe("TransitionList", () => {
  const t1 = new Transition("0.2s", "ease", "0s", "opacity");
  const t2 = new Transition("0.3s", CubicBezier.standard, "0s", "transform");

  it("creates from an array of Transitions", () => {
    const list = new TransitionList([t1, t2]);
    expect(list.length).toBe(2);
    expect(list.at(0)!.property).toBe("opacity");
    expect(list.at(1)!.property).toBe("transform");
  });

  it("creates from a CSS string", () => {
    const css = "opacity 0.2s ease, transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)";
    const list = new TransitionList(css);
    expect(list.length).toBe(2);
    expect(list.at(0)!.property).toBe("opacity");
    expect(list.at(0)!.duration.toString()).toBe("0.2s");
    expect(list.at(1)!.property).toBe("transform");
    expect(list.at(1)!.duration.toString()).toBe("0.3s");
  });

  it("creates as a copy", () => {
    const a = new TransitionList([t1, t2]);
    const b = new TransitionList(a);
    expect(b.length).toBe(2);
    expect(b.toString()).toBe(a.toString());
  });

  it("layers returns readonly array", () => {
    const list = new TransitionList([t1]);
    expect(list.layers).toHaveLength(1);
  });

  it("at() returns undefined for out-of-bounds", () => {
    const list = new TransitionList([t1]);
    expect(list.at(5)).toBeUndefined();
  });

  it("map() transforms each transition", () => {
    const list = new TransitionList([t1, t2]);
    const mapped = list.map((t) => t.setDuration("1s"));
    expect(mapped.at(0)!.duration.toString()).toBe("1s");
    expect(mapped.at(1)!.duration.toString()).toBe("1s");
    expect(t1.duration.toString()).toBe("0.2s"); // original unchanged
  });

  it("toString() joins with comma", () => {
    const list = new TransitionList([t1, t2]);
    const str = list.toString();
    expect(str).toBe("opacity 0.2s ease, transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)");
  });

  it("toJSON() equals toString()", () => {
    const list = new TransitionList([t1, t2]);
    expect(list.toJSON()).toBe(list.toString());
  });

  it("handles CSS with cubic-bezier parentheses correctly", () => {
    const css = "opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s ease-in-out";
    const list = new TransitionList(css);
    expect(list.length).toBe(2);
    expect(list.at(0)!.timingFunction.x1).toBe(0.4);
    expect(list.at(1)!.timingFunction.keyword).toBe("ease-in-out");
  });
});

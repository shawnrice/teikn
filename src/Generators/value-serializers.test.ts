import { describe, expect, test } from "bun:test";

import { BoxShadow } from "../TokenTypes/BoxShadow";
import { Color } from "../TokenTypes/Color";
import { CubicBezier } from "../TokenTypes/CubicBezier";
import { Duration } from "../TokenTypes/Duration";
import { Transition } from "../TokenTypes/Transition";
import {
  stringifyBoxShadowWithRefs,
  stringifyTransitionWithRefs,
  stringifyWithRefs,
  valueDependencies,
  visitComponents,
} from "./value-serializers";

const noRef = () => null;

describe("stringifyTransitionWithRefs", () => {
  test("all components referenced", () => {
    const dur = new Duration(200, "ms");
    const cb = CubicBezier.standard;
    const t = new Transition(dur, cb);
    const refs = new Map<unknown, string>([
      [dur, "var(--fast)"],
      [cb, "var(--standard)"],
    ]);
    const ref = (v: unknown) => refs.get(v) ?? null;
    expect(stringifyTransitionWithRefs(t, ref)).toBe("var(--fast) var(--standard)");
  });

  test("no components referenced", () => {
    const t = new Transition("200ms", "ease");
    expect(stringifyTransitionWithRefs(t, noRef)).toBe("200ms ease");
  });

  test("partial refs — only duration", () => {
    const dur = new Duration(200, "ms");
    const t = new Transition(dur, "ease");
    const ref = (v: unknown) => (v === dur ? "var(--fast)" : null);
    expect(stringifyTransitionWithRefs(t, ref)).toBe("var(--fast) ease");
  });

  test("includes property when not all", () => {
    const t = new Transition("200ms", "ease", "0s", "opacity");
    expect(stringifyTransitionWithRefs(t, noRef)).toBe("opacity 200ms ease");
  });

  test("includes delay when non-zero", () => {
    const delay = new Duration(50, "ms");
    const t = new Transition("200ms", "ease", delay);
    const ref = (v: unknown) => (v === delay ? "var(--delay)" : null);
    expect(stringifyTransitionWithRefs(t, ref)).toBe("200ms ease var(--delay)");
  });

  test("timing uses keyword when not referenced", () => {
    const t = new Transition("200ms", "ease-in-out");
    expect(stringifyTransitionWithRefs(t, noRef)).toBe("200ms ease-in-out");
  });

  test("timing uses cubic-bezier() when custom and not referenced", () => {
    const t = new Transition("200ms", new CubicBezier(0.1, 0.2, 0.3, 0.4));
    expect(stringifyTransitionWithRefs(t, noRef)).toBe("200ms cubic-bezier(0.1, 0.2, 0.3, 0.4)");
  });
});

describe("stringifyBoxShadowWithRefs", () => {
  test("color referenced", () => {
    const c = new Color(0, 0, 0);
    const s = new BoxShadow({ offsetY: 2, blur: 4, color: c });
    const ref = (v: unknown) => (v === c ? "var(--black)" : null);
    expect(stringifyBoxShadowWithRefs(s, ref)).toBe("0 2px 4px var(--black)");
  });

  test("color not referenced", () => {
    const s = new BoxShadow({ offsetY: 2, blur: 4, color: "#000" });
    expect(stringifyBoxShadowWithRefs(s, noRef)).toBe("0 2px 4px rgb(0, 0, 0)");
  });

  test("with inset", () => {
    const s = new BoxShadow(0, 2, 4, 0, "#000", true);
    expect(stringifyBoxShadowWithRefs(s, noRef)).toMatch(/^inset /);
  });

  test("with spread", () => {
    const s = new BoxShadow(0, 0, 0, 4, "#000");
    expect(stringifyBoxShadowWithRefs(s, noRef)).toContain("0 0 0 4px");
  });
});

describe("stringifyWithRefs", () => {
  test("falls through to String() for non-Transition, non-BoxShadow", () => {
    const d = new Duration(200, "ms");
    expect(stringifyWithRefs(d, noRef)).toBe("200ms");
  });

  test("routes Transition to stringifyTransitionWithRefs", () => {
    const t = new Transition("200ms", "ease");
    expect(stringifyWithRefs(t, noRef)).toBe("200ms ease");
  });

  test("routes BoxShadow to stringifyBoxShadowWithRefs", () => {
    const s = new BoxShadow({ offsetY: 2, blur: 4, color: "#000" });
    expect(stringifyWithRefs(s, noRef)).toContain("2px 4px");
  });
});

describe("visitComponents", () => {
  test("visits Transition duration, timingFunction", () => {
    const dur = new Duration(200, "ms");
    const cb = CubicBezier.standard;
    const t = new Transition(dur, cb);
    const visited: unknown[] = [];
    visitComponents(t, (v) => visited.push(v));
    expect(visited).toContain(dur);
    expect(visited).toContain(cb);
  });

  test("visits Transition delay when non-zero", () => {
    const delay = new Duration(50, "ms");
    const t = new Transition("200ms", "ease", delay);
    const visited: unknown[] = [];
    visitComponents(t, (v) => visited.push(v));
    expect(visited).toContain(delay);
  });

  test("skips Transition delay when zero", () => {
    const t = new Transition("200ms", "ease");
    const visited: unknown[] = [];
    visitComponents(t, (v) => visited.push(v));
    // duration + timingFunction, no delay
    expect(visited).toHaveLength(2);
  });

  test("visits BoxShadow color", () => {
    const c = new Color(255, 0, 0);
    const s = new BoxShadow({ color: c });
    const visited: unknown[] = [];
    visitComponents(s, (v) => visited.push(v));
    expect(visited).toEqual([c]);
  });

  test("does nothing for unknown value types", () => {
    const visited: unknown[] = [];
    visitComponents("hello", (v) => visited.push(v));
    visitComponents(42, (v) => visited.push(v));
    expect(visited).toHaveLength(0);
  });
});

describe("valueDependencies", () => {
  test("returns matching token names for Transition components", () => {
    const dur = new Duration(200, "ms");
    const cb = CubicBezier.standard;
    const t = new Transition(dur, cb);
    const refMap = new Map<unknown, string>([
      [dur, "fast"],
      [cb, "standard"],
    ]);
    expect(valueDependencies(t, refMap)).toEqual(["fast", "standard"]);
  });

  test("returns empty for unknown value types", () => {
    const refMap = new Map<unknown, string>();
    expect(valueDependencies("hello", refMap)).toEqual([]);
  });

  test("only includes components that are in the refMap", () => {
    const dur = new Duration(200, "ms");
    const t = new Transition(dur, "ease");
    const refMap = new Map<unknown, string>([[dur, "fast"]]);
    // timingFunction is not in refMap (it's a new CubicBezier from "ease")
    expect(valueDependencies(t, refMap)).toEqual(["fast"]);
  });
});

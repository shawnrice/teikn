import { describe, expect, test } from "bun:test";

import type { Token } from "../Token.js";
import { CubicBezier } from "../TokenTypes/CubicBezier.js";
import { Duration } from "../TokenTypes/Duration.js";
import { Transition } from "../TokenTypes/Transition.js";
import { ReducedMotionPlugin } from "./ReducedMotionPlugin.js";

describe("ReducedMotionPlugin", () => {
  const plugin = new ReducedMotionPlugin();

  test("tokenType matches duration, timing, and transition", () => {
    expect(plugin.tokenType.test("duration")).toBe(true);
    expect(plugin.tokenType.test("timing")).toBe(true);
    expect(plugin.tokenType.test("transition")).toBe(true);
    expect(plugin.tokenType.test("color")).toBe(false);
    expect(plugin.tokenType.test("spacing")).toBe(false);
  });

  test("outputType matches anything", () => {
    expect(plugin.outputType.test("css")).toBe(true);
    expect(plugin.outputType.test("json")).toBe(true);
  });

  test("transform returns token unchanged", () => {
    const token: Token = {
      name: "fade-duration",
      type: "duration",
      value: new Duration(200, "ms"),
    };
    const result = plugin.transform(token);
    expect(result).toBe(token);
  });

  test("expand passes through non-motion tokens", () => {
    const token: Token = { name: "primary", type: "color", value: "#ff0000" };
    const result = plugin.expand([token]);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(token);
  });

  test("expand generates reduced duration token with 0s", () => {
    const token: Token = {
      name: "fade-duration",
      type: "duration",
      value: new Duration(200, "ms"),
    };
    const result = plugin.expand([token]);

    expect(result).toHaveLength(2);
    expect(result[0]).toBe(token);

    const reduced = result[1]!;
    expect(reduced.name).toBe("reduced-fade-duration");
    expect(reduced.type).toBe("duration");
    expect(reduced.value.toString()).toBe("0s");
  });

  test("expand generates reduced timing token with linear", () => {
    const token: Token = { name: "ease-standard", type: "timing", value: CubicBezier.ease };
    const result = plugin.expand([token]);

    expect(result).toHaveLength(2);
    const reduced = result[1]!;
    expect(reduced.name).toBe("reduced-ease-standard");
    expect(reduced.type).toBe("timing");
    expect(reduced.value).toBe(CubicBezier.linear);
  });

  test("expand generates reduced transition token", () => {
    const token: Token = {
      name: "fade",
      type: "transition",
      value: new Transition("0.3s", CubicBezier.ease),
    };
    const result = plugin.expand([token]);

    expect(result).toHaveLength(2);
    const reduced = result[1]!;
    expect(reduced.name).toBe("reduced-fade");
    expect(reduced.type).toBe("transition");
    expect(reduced.value).toBeInstanceOf(Transition);
    expect(reduced.value.duration.toString()).toBe("0s");
    expect(reduced.value.timingFunction.keyword).toBe("linear");
  });

  test("custom prefix option", () => {
    const customPlugin = new ReducedMotionPlugin({ prefix: "a11y-" });
    const token: Token = { name: "slide", type: "duration", value: new Duration(300, "ms") };
    const result = customPlugin.expand([token]);

    expect(result[1]!.name).toBe("a11y-slide");
  });

  test("zeroDuration false still generates 0.01s for duration", () => {
    const customPlugin = new ReducedMotionPlugin({ zeroDuration: false });
    const token: Token = { name: "anim", type: "duration", value: new Duration(500, "ms") };
    const result = customPlugin.expand([token]);

    const reduced = result[1]!;
    expect(reduced.value.toString()).toBe("0.01s");
  });

  test("multiple motion tokens each get reduced companions", () => {
    const tokens: Token[] = [
      { name: "fade-dur", type: "duration", value: new Duration(200, "ms") },
      { name: "slide-timing", type: "timing", value: CubicBezier.easeInOut },
      { name: "grow", type: "transition", value: new Transition("0.5s", CubicBezier.ease) },
    ];
    const result = plugin.expand(tokens);

    expect(result).toHaveLength(6);
    expect(result.filter((t) => t.name.startsWith("reduced-"))).toHaveLength(3);
  });

  test("generated tokens preserve group and usage", () => {
    const token: Token = {
      name: "fade",
      type: "duration",
      value: new Duration(200, "ms"),
      group: "motion",
      usage: "Fade animation duration",
    };
    const result = plugin.expand([token]);

    const reduced = result[1]!;
    expect(reduced.group).toBe("motion");
    expect(reduced.usage).toBe("Fade animation duration");
  });
});

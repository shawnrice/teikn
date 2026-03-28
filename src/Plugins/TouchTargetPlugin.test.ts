import { describe, expect, test } from "bun:test";

import type { Token } from "../Token";
import { Dimension } from "../TokenTypes/Dimension";
import { TouchTargetPlugin } from "./TouchTargetPlugin";

describe("TouchTargetPlugin", () => {
  const makeToken = (name: string, value: unknown, type = "size"): Token => ({
    name,
    type,
    value,
  });

  test("transform returns token unchanged", () => {
    const plugin = new TouchTargetPlugin({});
    const token = makeToken("btn", "48px");
    expect(plugin.transform(token)).toBe(token);
  });

  test("passes when size meets minimum", () => {
    const plugin = new TouchTargetPlugin({});
    const tokens = [makeToken("btn", "48px")];
    const issues = plugin.audit!(tokens);
    expect(issues).toHaveLength(0);
  });

  test("warns when size is below minimum (44px)", () => {
    const plugin = new TouchTargetPlugin({});
    const tokens = [makeToken("btn", "32px")];
    const issues = plugin.audit!(tokens);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.severity).toBe("warning");
    expect(issues[0]!.message).toContain("32px");
    expect(issues[0]!.message).toContain("44px");
  });

  test("checks touch-target type by default", () => {
    const plugin = new TouchTargetPlugin({});
    const tokens = [makeToken("target", "24px", "touch-target")];
    const issues = plugin.audit!(tokens);
    expect(issues).toHaveLength(1);
  });

  test("does not check icon type by default", () => {
    const plugin = new TouchTargetPlugin({});
    const tokens = [makeToken("icon-sm", "16px", "icon")];
    const issues = plugin.audit!(tokens);
    expect(issues).toHaveLength(0);
  });

  test("checks icon type when opted in via types option", () => {
    const plugin = new TouchTargetPlugin({ types: ["size", "touch-target", "icon"] });
    const tokens = [makeToken("icon-sm", "16px", "icon")];
    const issues = plugin.audit!(tokens);
    expect(issues).toHaveLength(1);
  });

  test("ignores types not in the default list", () => {
    const plugin = new TouchTargetPlugin({});
    const tokens = [makeToken("spacing", "4px", "spacing")];
    const issues = plugin.audit!(tokens);
    expect(issues).toHaveLength(0);
  });

  test("respects custom types option", () => {
    const plugin = new TouchTargetPlugin({ types: ["button-size"] });
    const tokens = [makeToken("btn", "32px", "button-size"), makeToken("icon", "16px", "icon")];
    const issues = plugin.audit!(tokens);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.token).toBe("btn");
  });

  test("respects custom minPx", () => {
    const plugin = new TouchTargetPlugin({ minPx: 48 });
    const tokens = [makeToken("btn", "44px")];
    const issues = plugin.audit!(tokens);
    expect(issues).toHaveLength(1);
  });

  test("handles rem values", () => {
    const plugin = new TouchTargetPlugin({});
    // 2rem at base 16 = 32px, below 44px
    const tokens = [makeToken("btn", "2rem")];
    const issues = plugin.audit!(tokens);
    expect(issues).toHaveLength(1);
  });

  test("respects custom basePx for rem conversion", () => {
    const plugin = new TouchTargetPlugin({ basePx: 20 });
    // 2.5rem at base 20 = 50px, above 44px
    const tokens = [makeToken("btn", "2.5rem")];
    const issues = plugin.audit!(tokens);
    expect(issues).toHaveLength(0);
  });

  test("handles Dimension instances", () => {
    const plugin = new TouchTargetPlugin({});
    const tokens = [makeToken("btn", new Dimension(32, "px"))];
    const issues = plugin.audit!(tokens);
    expect(issues).toHaveLength(1);
  });

  test("skips non-parseable values", () => {
    const plugin = new TouchTargetPlugin({});
    const tokens = [makeToken("btn", "auto")];
    const issues = plugin.audit!(tokens);
    expect(issues).toHaveLength(0);
  });
});

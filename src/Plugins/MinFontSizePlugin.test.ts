import { describe, expect, test } from "bun:test";

import type { Token } from "../Token";
import { Dimension } from "../TokenTypes/Dimension";
import { MinFontSizePlugin } from "./MinFontSizePlugin";

describe("MinFontSizePlugin", () => {
  const makeToken = (name: string, value: unknown, type = "font-size"): Token => ({
    name,
    type,
    value,
  });

  test("tokenType matches font-size", () => {
    const plugin = new MinFontSizePlugin({});
    expect(plugin.tokenType.test("font-size")).toBe(true);
    expect(plugin.tokenType.test("spacing")).toBe(false);
  });

  test("toJSON returns token unchanged", () => {
    const plugin = new MinFontSizePlugin({});
    const token = makeToken("fs", "16px");
    expect(plugin.toJSON(token)).toBe(token);
  });

  test("passes when font size meets minimum", () => {
    const plugin = new MinFontSizePlugin({});
    const tokens = [makeToken("body", "16px")];
    const issues = plugin.audit!(tokens);
    expect(issues).toHaveLength(0);
  });

  test("warns when px font size is below minimum", () => {
    const plugin = new MinFontSizePlugin({});
    const tokens = [makeToken("tiny", "10px")];
    const issues = plugin.audit!(tokens);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.severity).toBe("warning");
    expect(issues[0]!.message).toContain("10px");
    expect(issues[0]!.message).toContain("12px");
  });

  test("warns when rem font size converts to below minimum", () => {
    const plugin = new MinFontSizePlugin({});
    const tokens = [makeToken("small", "0.5rem")];
    const issues = plugin.audit!(tokens);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.message).toContain("8px");
  });

  test("respects custom basePx for rem conversion", () => {
    const plugin = new MinFontSizePlugin({ basePx: 10 });
    // 1rem at base 10 = 10px, below default 12px min
    const tokens = [makeToken("body", "1rem")];
    const issues = plugin.audit!(tokens);
    expect(issues).toHaveLength(1);
  });

  test("respects custom minPx", () => {
    const plugin = new MinFontSizePlugin({ minPx: 14 });
    const tokens = [makeToken("body", "12px")];
    const issues = plugin.audit!(tokens);
    expect(issues).toHaveLength(1);
  });

  test("handles Dimension instances", () => {
    const plugin = new MinFontSizePlugin({});
    const tokens = [makeToken("tiny", new Dimension(10, "px"))];
    const issues = plugin.audit!(tokens);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.severity).toBe("warning");
  });

  test("handles Dimension with rem unit", () => {
    const plugin = new MinFontSizePlugin({});
    const tokens = [makeToken("small", new Dimension(0.5, "rem"))];
    const issues = plugin.audit!(tokens);
    expect(issues).toHaveLength(1);
  });

  test("skips tokens with non-font-size type", () => {
    const plugin = new MinFontSizePlugin({});
    const tokens = [makeToken("spacing", "4px", "spacing")];
    const issues = plugin.audit!(tokens);
    expect(issues).toHaveLength(0);
  });

  test("skips tokens with non-convertible values", () => {
    const plugin = new MinFontSizePlugin({});
    const tokens = [makeToken("fs", "inherit")];
    const issues = plugin.audit!(tokens);
    expect(issues).toHaveLength(0);
  });

  test("handles pt unit", () => {
    const plugin = new MinFontSizePlugin({});
    // 8pt = 10.67px, below 12px
    const tokens = [makeToken("small", "8pt")];
    const issues = plugin.audit!(tokens);
    expect(issues).toHaveLength(1);
  });
});

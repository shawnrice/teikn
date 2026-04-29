import { describe, expect, test } from "bun:test";

import type { Token } from "../Token.js";
import { Color } from "../TokenTypes/Color/index.js";
import { ColorTransformPlugin } from "./ColorTransformPlugin.js";

describe("ColorTransformPlugin", () => {
  const makeToken = (name: string, value: unknown): Token => ({
    name,
    type: "color",
    value,
  });

  test("tokenType matches color only", () => {
    const plugin = new ColorTransformPlugin({ type: "hex" });
    expect(plugin.tokenType).toBe("color");
  });

  test("transforms a color string to the specified format", () => {
    const plugin = new ColorTransformPlugin({ type: "rgb" });
    const token = makeToken("primary", "#ff0000");
    const result = plugin.transform(token);
    expect(result.value).toBe("rgb(255, 0, 0)");
  });

  test("transforms a Color instance to the specified format", () => {
    const plugin = new ColorTransformPlugin({ type: "hex" });
    const token = makeToken("primary", new Color(255, 0, 0));
    const result = plugin.transform(token);
    expect(result.value).toBe("#ff0000");
  });

  test("passes ref strings through unchanged", () => {
    const plugin = new ColorTransformPlugin({ type: "hex" });
    const token = makeToken("alias", "{primary}");
    const result = plugin.transform(token);
    expect(result).toBe(token);
    expect(result.value).toBe("{primary}");
  });

  test("passes nested ref strings through unchanged", () => {
    const plugin = new ColorTransformPlugin({ type: "rgb" });
    const token = makeToken("alias", "{colors.primary.500}");
    const result = plugin.transform(token);
    expect(result).toBe(token);
  });

  describe("audit", () => {
    test("returns no issues when format is not hex", () => {
      const plugin = new ColorTransformPlugin({ type: "rgb" });
      const tokens = [makeToken("fade", "rgba(255, 0, 0, 0.5)")];
      const issues = plugin.audit!(tokens);
      expect(issues).toHaveLength(0);
    });

    test("returns no issues for opaque hex colors", () => {
      const plugin = new ColorTransformPlugin({ type: "hex" });
      const tokens = [makeToken("solid", "#ff0000")];
      const issues = plugin.audit!(tokens);
      expect(issues).toHaveLength(0);
    });

    test("warns when hex format would discard alpha", () => {
      const plugin = new ColorTransformPlugin({ type: "hex" });
      const tokens = [makeToken("fade", "rgba(255, 0, 0, 0.5)")];
      const issues = plugin.audit!(tokens);
      expect(issues).toHaveLength(1);
      expect(issues[0]!.severity).toBe("warning");
      expect(issues[0]!.token).toBe("fade");
      expect(issues[0]!.message).toContain("alpha");
      expect(issues[0]!.message).toContain("hex");
    });

    test("warns when hex3 format would discard alpha", () => {
      const plugin = new ColorTransformPlugin({ type: "hex3" });
      const tokens = [makeToken("fade", new Color(255, 0, 0, 0.5))];
      const issues = plugin.audit!(tokens);
      expect(issues).toHaveLength(1);
      expect(issues[0]!.severity).toBe("warning");
    });

    test("skips ref strings during audit", () => {
      const plugin = new ColorTransformPlugin({ type: "hex" });
      const tokens = [makeToken("alias", "{primary}")];
      const issues = plugin.audit!(tokens);
      expect(issues).toHaveLength(0);
    });

    test("skips non-color tokens during audit", () => {
      const plugin = new ColorTransformPlugin({ type: "hex" });
      const tokens: Token[] = [{ name: "size", type: "dimension", value: "16px" }];
      const issues = plugin.audit!(tokens);
      expect(issues).toHaveLength(0);
    });
  });
});

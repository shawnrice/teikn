import { describe, expect, test } from "bun:test";

import type { Token } from "../Token";
import { Json } from "../Generators/Json";
import { AlphaMultiplyPlugin } from "./AlphaMultiplyPlugin";
import { ColorTransformPlugin } from "./ColorTransformPlugin";

describe("plugin ordering", () => {
  test("ColorTransformPlugin runs after AlphaMultiplyPlugin regardless of input order", () => {
    const tokens: Token[] = [{ name: "overlay", type: "color", value: "rgba(0, 0, 0, 0.5)" }];

    // Pass ColorTransform BEFORE AlphaMultiply — should still work
    // because ColorTransform declares runAfter: ["AlphaMultiplyPlugin"]
    const wrongOrder = new Json().generate(tokens, [
      new ColorTransformPlugin({ type: "rgba" }),
      new AlphaMultiplyPlugin({ background: "#ffffff" }),
    ]);

    const correctOrder = new Json().generate(tokens, [
      new AlphaMultiplyPlugin({ background: "#ffffff" }),
      new ColorTransformPlugin({ type: "rgba" }),
    ]);

    // Both should produce the same result
    expect(wrongOrder).toBe(correctOrder);

    // The value should be flattened (no alpha) and in rgba format
    const json = JSON.parse(wrongOrder);
    expect(json.overlay.value).toContain("rgba(");
    expect(json.overlay.value).not.toContain("0.5");
  });
});

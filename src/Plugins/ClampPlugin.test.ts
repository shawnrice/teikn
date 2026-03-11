import { describe, expect, test } from "bun:test";

import type { Token } from "../Token";
import { Dimension } from "../TokenTypes/Dimension";
import { ClampPlugin } from "./ClampPlugin";

describe("ClampPlugin", () => {
  const plugin = new ClampPlugin({
    pairs: [{ min: "fontSize-100", max: "fontSize-400", output: "fontSize-fluid" }],
  });

  test("tokenType matches anything", () => {
    expect(plugin.tokenType.test("dimension")).toBe(true);
    expect(plugin.tokenType.test("color")).toBe(true);
  });

  test("outputType matches anything", () => {
    expect(plugin.outputType.test("css")).toBe(true);
    expect(plugin.outputType.test("json")).toBe(true);
  });

  test("toJSON returns token unchanged", () => {
    const token: Token = { name: "fontSize-100", type: "dimension", value: "1rem" };
    const result = plugin.toJSON(token);
    expect(result).toBe(token);
  });

  test("expand with no pairs returns tokens unchanged", () => {
    const emptyPlugin = new ClampPlugin();
    const tokens: Token[] = [{ name: "fontSize-100", type: "dimension", value: "1rem" }];
    const result = emptyPlugin.expand(tokens);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(tokens[0]);
  });

  test("expand generates clamp token from rem pairs", () => {
    const tokens: Token[] = [
      { name: "fontSize-100", type: "dimension", value: new Dimension(1, "rem") },
      { name: "fontSize-400", type: "dimension", value: new Dimension(2, "rem") },
    ];
    const result = plugin.expand(tokens);

    expect(result).toHaveLength(3);
    const fluid = result[2]!;
    expect(fluid.name).toBe("fontSize-fluid");
    expect(fluid.type).toBe("dimension");
    expect(fluid.value).toContain("clamp(");
    expect(fluid.value).toContain("1rem");
    expect(fluid.value).toContain("2rem");
    expect(fluid.value).toContain("vw");
  });

  test("expand generates clamp token from px pairs", () => {
    const tokens: Token[] = [
      { name: "fontSize-100", type: "dimension", value: new Dimension(16, "px") },
      { name: "fontSize-400", type: "dimension", value: new Dimension(32, "px") },
    ];
    const result = plugin.expand(tokens);

    const fluid = result[2]!;
    expect(fluid.name).toBe("fontSize-fluid");
    expect(fluid.value).toContain("clamp(");
    expect(fluid.value).toContain("1rem");
    expect(fluid.value).toContain("2rem");
  });

  test("expand generates clamp token from string values", () => {
    const tokens: Token[] = [
      { name: "fontSize-100", type: "dimension", value: "1rem" },
      { name: "fontSize-400", type: "dimension", value: "2.5rem" },
    ];
    const result = plugin.expand(tokens);

    const fluid = result[2]!;
    expect(fluid.name).toBe("fontSize-fluid");
    expect(fluid.value).toContain("clamp(");
    expect(fluid.value).toContain("1rem");
    expect(fluid.value).toContain("2.5rem");
  });

  test("expand skips pairs where tokens are missing", () => {
    const pluginWithMissing = new ClampPlugin({
      pairs: [{ min: "missing-min", max: "missing-max", output: "missing-fluid" }],
    });
    const tokens: Token[] = [{ name: "fontSize-100", type: "dimension", value: "1rem" }];
    const result = pluginWithMissing.expand(tokens);
    expect(result).toHaveLength(1);
  });

  test("custom viewport options", () => {
    const customPlugin = new ClampPlugin({
      viewportMin: 375,
      viewportMax: 1440,
      pairs: [{ min: "size-sm", max: "size-lg", output: "size-fluid" }],
    });
    const tokens: Token[] = [
      { name: "size-sm", type: "dimension", value: new Dimension(1, "rem") },
      { name: "size-lg", type: "dimension", value: new Dimension(3, "rem") },
    ];
    const result = customPlugin.expand(tokens);

    expect(result).toHaveLength(3);
    const fluid = result[2]!;
    expect(fluid.value).toContain("clamp(");
    expect(fluid.value).toContain("1rem");
    expect(fluid.value).toContain("3rem");
  });

  test("multiple pairs generate multiple clamp tokens", () => {
    const multiPlugin = new ClampPlugin({
      pairs: [
        { min: "fs-sm", max: "fs-lg", output: "fs-fluid" },
        { min: "sp-sm", max: "sp-lg", output: "sp-fluid" },
      ],
    });
    const tokens: Token[] = [
      { name: "fs-sm", type: "dimension", value: "0.875rem" },
      { name: "fs-lg", type: "dimension", value: "1.25rem" },
      { name: "sp-sm", type: "spacing", value: "1rem" },
      { name: "sp-lg", type: "spacing", value: "2rem" },
    ];
    const result = multiPlugin.expand(tokens);

    expect(result).toHaveLength(6);
    expect(result[4]!.name).toBe("fs-fluid");
    expect(result[5]!.name).toBe("sp-fluid");
  });

  test("generated token inherits type from min token", () => {
    const tokens: Token[] = [
      { name: "fontSize-100", type: "fontSize", value: "1rem" },
      { name: "fontSize-400", type: "fontSize", value: "2rem" },
    ];
    const result = plugin.expand(tokens);

    const fluid = result[2]!;
    expect(fluid.type).toBe("fontSize");
  });

  test("numeric values are treated as px", () => {
    const numPlugin = new ClampPlugin({
      pairs: [{ min: "a", max: "b", output: "c" }],
    });
    const tokens: Token[] = [
      { name: "a", type: "dimension", value: 16 },
      { name: "b", type: "dimension", value: 32 },
    ];
    const result = numPlugin.expand(tokens);

    const fluid = result[2]!;
    expect(fluid.value).toContain("clamp(");
    expect(fluid.value).toContain("1rem");
    expect(fluid.value).toContain("2rem");
  });
});

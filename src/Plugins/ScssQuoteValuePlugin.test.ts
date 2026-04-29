import { describe, expect, test } from "bun:test";

import type { Token } from "../Token.js";
import { ScssQuoteValuePlugin } from "./ScssQuoteValuePlugin.js";

describe("ScssQuoteValuePlugin", () => {
  const plugin = new ScssQuoteValuePlugin();

  test("outputType matches scss and sass", () => {
    expect(plugin.outputType.test("scss")).toBe(true);
    expect(plugin.outputType.test("sass")).toBe(true);
    expect(plugin.outputType.test("css")).toBe(false);
  });

  test("tokenType matches font and font-family", () => {
    expect(plugin.tokenType.test("font")).toBe(true);
    expect(plugin.tokenType.test("font-family")).toBe(true);
    expect(plugin.tokenType.test("color")).toBe(false);
  });

  test("transform wraps value with unquote", () => {
    const token: Token = { name: "body", type: "font-family", value: '"Arial", sans-serif' };
    const result = plugin.transform(token);
    expect(result.value).toBe("unquote('#{\"Arial\", sans-serif}')");
    expect(result.name).toBe("body");
    expect(result.type).toBe("font-family");
  });

  test("transform preserves all other token fields", () => {
    const token: Token = { name: "heading", type: "font", value: "Georgia", usage: "Heading font" };
    const result = plugin.transform(token);
    expect(result.usage).toBe("Heading font");
    expect(result.value).toBe("unquote('#{Georgia}')");
  });
});

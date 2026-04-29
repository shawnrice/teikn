import { describe, expect, test } from "bun:test";

import type { Token } from "../Token.js";
import { NameConventionPlugin } from "./NameConventionPlugin.js";

describe("NameConventionPlugin", () => {
  const makeToken = (name: string): Token => ({ name, type: "color", value: "#000" });

  test("tokenType and outputType match everything", () => {
    const plugin = new NameConventionPlugin({ convention: "camelCase" });
    expect(plugin.tokenType.test("color")).toBe(true);
    expect(plugin.outputType.test("json")).toBe(true);
  });

  test("converts to camelCase", () => {
    const plugin = new NameConventionPlugin({ convention: "camelCase" });
    expect(plugin.transform(makeToken("my-color-token")).name).toBe("myColorToken");
    expect(plugin.transform(makeToken("MyColorToken")).name).toBe("myColorToken");
    expect(plugin.transform(makeToken("my_color_token")).name).toBe("myColorToken");
  });

  test("converts to kebab-case", () => {
    const plugin = new NameConventionPlugin({ convention: "kebab-case" });
    expect(plugin.transform(makeToken("myColorToken")).name).toBe("my-color-token");
    expect(plugin.transform(makeToken("MyColorToken")).name).toBe("my-color-token");
    expect(plugin.transform(makeToken("my_color_token")).name).toBe("my-color-token");
  });

  test("converts to snake_case", () => {
    const plugin = new NameConventionPlugin({ convention: "snake_case" });
    expect(plugin.transform(makeToken("myColorToken")).name).toBe("my_color_token");
    expect(plugin.transform(makeToken("my-color-token")).name).toBe("my_color_token");
    expect(plugin.transform(makeToken("MyColorToken")).name).toBe("my_color_token");
  });

  test("converts to PascalCase", () => {
    const plugin = new NameConventionPlugin({ convention: "PascalCase" });
    expect(plugin.transform(makeToken("my-color-token")).name).toBe("MyColorToken");
    expect(plugin.transform(makeToken("myColorToken")).name).toBe("MyColorToken");
    expect(plugin.transform(makeToken("my_color_token")).name).toBe("MyColorToken");
  });

  test("converts to SCREAMING_SNAKE", () => {
    const plugin = new NameConventionPlugin({ convention: "SCREAMING_SNAKE" });
    expect(plugin.transform(makeToken("myColorToken")).name).toBe("MY_COLOR_TOKEN");
    expect(plugin.transform(makeToken("my-color-token")).name).toBe("MY_COLOR_TOKEN");
    expect(plugin.transform(makeToken("my_color_token")).name).toBe("MY_COLOR_TOKEN");
  });

  test("preserves other token fields", () => {
    const plugin = new NameConventionPlugin({ convention: "camelCase" });
    const token: Token = { name: "my-token", type: "color", value: "#fff", usage: "Primary color" };
    const result = plugin.transform(token);
    expect(result.type).toBe("color");
    expect(result.value).toBe("#fff");
    expect(result.usage).toBe("Primary color");
  });

  test("handles single-word names", () => {
    const plugin = new NameConventionPlugin({ convention: "SCREAMING_SNAKE" });
    expect(plugin.transform(makeToken("primary")).name).toBe("PRIMARY");
  });
});

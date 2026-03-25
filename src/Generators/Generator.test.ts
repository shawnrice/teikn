import { describe, expect, test } from "bun:test";

import { Generator } from "./Generator";

describe("Generator base class tests", () => {
  test("It throws when the extension is not set in options", () => {
    expect(() => {
      // @ts-ignore: this is an error test
      new Generator();
    }).toThrow();
  });

  test("It throws when the extension is the wrong type in options", () => {
    expect(() => {
      // @ts-ignore: this is an error test
      new Generator({ ext: true });
    }).toThrow();
  });

  test("It throws when you do not extend it for generate", () => {
    expect(() => {
      // @ts-ignore: this is an error test
      new Generator({ ext: "test" }).generate([]);
    }).toThrow();
  });

  test("It create the correct filename", () => {
    // @ts-ignore: this is an error test
    expect(new Generator({ ext: "test" }).file).toBe("tokens.test");
  });

  test("It strips duplicate extension from filename", () => {
    // @ts-ignore: this is an error test
    expect(new Generator({ ext: "scss", filename: "design-tokens.scss" }).file).toBe(
      "design-tokens.scss",
    );
  });

  test("It does not strip unrelated extension from filename", () => {
    // @ts-ignore: this is an error test
    expect(new Generator({ ext: "scss", filename: "tokens.module" }).file).toBe(
      "tokens.module.scss",
    );
  });

  test("It handles filename with custom name and no extension", () => {
    // @ts-ignore: this is an error test
    expect(new Generator({ ext: "css", filename: "variables" }).file).toBe("variables.css");
  });
});

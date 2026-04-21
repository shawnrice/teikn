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

describe("Generator multi-file emission contract", () => {
  class SingleFile extends Generator {
    constructor(opts = {}) {
      super({ ext: "txt", ...opts });
    }
    generateToken(): string {
      return "";
    }
    // oxlint-disable-next-line class-methods-use-this
    combinator(): string {
      return "body";
    }
  }

  class MultiFile extends Generator {
    constructor(opts = {}) {
      super({ ext: "txt", ...opts });
    }
    generateToken(): string {
      return "";
    }
    // oxlint-disable-next-line class-methods-use-this
    combinator(): string {
      return "";
    }
    override filenames(): string[] {
      const base = this.options.filename ?? "tokens";
      return [`${base}.mjs`, `${base}.d.ts`];
    }
    override generateFiles(): Map<string, string> {
      const base = this.options.filename ?? "tokens";
      return new Map([
        [`${base}.mjs`, "runtime"],
        [`${base}.d.ts`, "types"],
      ]);
    }
  }

  test("default filenames() returns [this.file]", () => {
    expect(new SingleFile().filenames()).toEqual(["tokens.txt"]);
  });

  test("default generateFiles() returns a single-entry map keyed by this.file", () => {
    const files = new SingleFile().generateFiles([]);
    expect([...files.keys()]).toEqual(["tokens.txt"]);
    expect(files.get("tokens.txt")).toBe("body");
  });

  test("multi-file generators can report multiple filenames", () => {
    expect(new MultiFile().filenames()).toEqual(["tokens.mjs", "tokens.d.ts"]);
  });

  test("multi-file generators can emit multiple files", () => {
    const files = new MultiFile().generateFiles([]);
    expect([...files.entries()]).toEqual([
      ["tokens.mjs", "runtime"],
      ["tokens.d.ts", "types"],
    ]);
  });
});

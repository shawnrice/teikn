import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, test } from "bun:test";

import { Teikn } from "../Teikn.js";
import type { Plugin } from "../Plugins/index.js";
import type { Token } from "../Token.js";
import { CssVars } from "./CssVars.js";
import { Generator } from "./Generator.js";
import { JavaScript } from "./JavaScript.js";
import { Json } from "./Json.js";
import { Scss } from "./Scss.js";
import { Storybook } from "./Storybook.js";
import { TypeScript } from "./TypeScript.js";
import { TypeScriptDeclarations } from "./TypeScriptDeclarations.js";

const tokens: Token[] = [
  { name: "primary", type: "color", value: "#0066cc" },
  { name: "sm", type: "spacing", value: "4px" },
];

const fixedDate = () => "2024-01-01";

// ─── Scenario 1: Duplicate filename across generators ─────────────
describe("duplicate filename across generators", () => {
  test("two CssVars with same default filename throw at construction", () => {
    expect(
      () =>
        new Teikn({
          generators: [new CssVars(), new CssVars()],
        }),
    ).toThrow(/Duplicate generator output filenames/);
  });

  test("CssVars + Scss with the same configured filename + ext throw", () => {
    // Both share the same filename but DIFFERENT extensions (.css vs .scss)
    // — so this should NOT collide. Sanity branch.
    expect(
      () =>
        new Teikn({
          generators: [new CssVars({ filename: "shared" }), new Scss({ filename: "shared" })],
        }),
    ).not.toThrow();
  });

  test("two CssVars with same explicit filename throw", () => {
    expect(
      () =>
        new Teikn({
          generators: [new CssVars({ filename: "design" }), new CssVars({ filename: "design" })],
        }),
    ).toThrow(/Duplicate generator output filenames/);
  });

  test("error message names the colliding filename", () => {
    try {
      new Teikn({ generators: [new CssVars(), new CssVars()] });
      throw new Error("did not throw");
    } catch (e) {
      expect((e as Error).message).toContain("tokens.css");
    }
  });

  test("case-insensitive collision (macOS/Windows FS) is caught", () => {
    expect(
      () =>
        new Teikn({
          generators: [new CssVars({ filename: "Tokens" }), new CssVars({ filename: "tokens" })],
        }),
    ).toThrow(/Duplicate/);
  });
});

// ─── Scenario 2: Duplicate filename WITHIN a single generator ─────
describe("duplicate filenames within a single generator", () => {
  test("generator whose filenames() returns duplicates is NOT currently caught", () => {
    class LiarGenerator extends Generator {
      constructor() {
        super({ ext: "txt", filename: "out" });
      }
      generateToken() {
        return "";
      }
      // oxlint-disable-next-line class-methods-use-this
      combinator() {
        return "x";
      }
      override filenames(): string[] {
        return ["a.txt", "a.txt"];
      }
      override generateFiles(): Map<string, string> {
        return new Map([["a.txt", "x"]]);
      }
    }

    expect(() => new Teikn({ generators: [new LiarGenerator()] })).toThrow(
      /LiarGenerator.*duplicate output filenames/,
    );
  });
});

// ─── Scenario 3: TypeScript meta option propagation ───────────────
describe("TypeScript meta option propagation", () => {
  test("filename propagates to both .mjs and .d.ts outputs", () => {
    const ts = new TypeScript({ filename: "design", dateFn: fixedDate });
    const files = ts.filenames();
    expect(files).toContain("design.mjs");
    expect(files).toContain("design.d.ts");
  });

  test("module: 'cjs' emits .cjs for JS; declarations stay .d.ts", () => {
    const ts = new TypeScript({ module: "cjs", filename: "design", dateFn: fixedDate });
    const files = ts.filenames();
    expect(files).toContain("design.cjs");
    // DESIGN QUESTION: when module=cjs, should declarations be .d.cts so
    // Node's conditional resolution picks them up under `require`? Current
    // implementation emits `.d.ts` regardless.
    expect(files).toContain("design.d.ts");
  });

  test("loose: true affects declarations but not JS", () => {
    const out = new TypeScript({
      loose: true,
      dateFn: fixedDate,
      filename: "t",
    }).generateFiles(tokens);
    const dts = out.get("t.d.ts")!;
    const mjs = out.get("t.mjs")!;
    expect(dts).toMatch(/:\s*string;/); // widened
    expect(dts).not.toContain('"#0066cc"');
    // JS unaffected — still emits the literal value
    expect(mjs).toContain("'#0066cc'");
  });

  test("nameTransformer propagates to both", () => {
    const upper = (n: string) => n.toUpperCase();
    const out = new TypeScript({
      nameTransformer: upper,
      dateFn: fixedDate,
      filename: "t",
    }).generateFiles(tokens);
    expect(out.get("t.mjs")).toContain("PRIMARY");
    expect(out.get("t.d.ts")).toContain("PRIMARY");
  });

  test("groups propagates to both", () => {
    const out = new TypeScript({
      groups: true,
      dateFn: fixedDate,
      filename: "t",
    }).generateFiles(tokens);
    expect(out.get("t.mjs")).toMatch(/export const color\s*=/);
    expect(out.get("t.d.ts")).toMatch(/export declare const color:/);
  });

  test("version propagates to both", () => {
    const out = new TypeScript({
      version: "stress-test",
      dateFn: fixedDate,
      filename: "t",
    }).generateFiles(tokens);
    expect(out.get("t.mjs")).toContain("stress-test");
    expect(out.get("t.d.ts")).toContain("stress-test");
  });

  test("dateFn propagates to both", () => {
    const out = new TypeScript({
      dateFn: () => "DATESTAMP",
      filename: "t",
    }).generateFiles(tokens);
    expect(out.get("t.mjs")).toContain("DATESTAMP");
    expect(out.get("t.d.ts")).toContain("DATESTAMP");
  });

  test("explicit ext is rejected on TypeScript meta", () => {
    // @ts-expect-error — ext is intentionally not in TypeScriptOpts surface
    expect(() => new TypeScript({ ext: "ts" })).toThrow(/does not accept an `ext`/);
  });
});

// ─── Scenario 4: TS meta + other generator filename collision ─────
describe("TypeScript meta + sibling collision", () => {
  test("Json sharing TS meta's runtime filename should collide", () => {
    // TS meta emits "design.mjs" + "design.d.ts"; a Json generator
    // configured to "design.mjs" would collide on the .mjs slot.
    expect(
      () =>
        new Teikn({
          generators: [
            new TypeScript({ filename: "design", dateFn: fixedDate }),
            // Json's ext is .json — base "design.mjs" produces "design.mjs.json".
            // To force a real collision we need the same final filename.
            new Json({ filename: "design.mjs" }),
          ],
        }),
      // BUG (suspected): Generator.file appends `.${ext}` unless the filename
      // already ends in `.${ext}`. So `Json({filename:"design.mjs"})` yields
      // `design.mjs.json` and does NOT collide. There's no way to ergonomically
      // force a same-named .json + .mjs check; harness-only collision is the
      // realistic case (same ext, same base).
    ).not.toThrow();
  });

  test("TS meta + JavaScript using same filename collides on .mjs", () => {
    expect(
      () =>
        new Teikn({
          generators: [
            new TypeScript({ filename: "design", dateFn: fixedDate }),
            new JavaScript({ filename: "design" }),
          ],
        }),
    ).toThrow(/Duplicate/);
  });

  test("TS meta + TypeScriptDeclarations using same filename collides on .d.ts", () => {
    expect(
      () =>
        new Teikn({
          generators: [
            new TypeScript({ filename: "design", dateFn: fixedDate }),
            new TypeScriptDeclarations({ filename: "design" }),
          ],
        }),
    ).toThrow(/Duplicate/);
  });
});

// ─── Scenario 5: Empty token set ──────────────────────────────────
describe("empty token set", () => {
  test("CssVars handles empty tokens", () => {
    const out = new CssVars({ dateFn: fixedDate }).generateFiles([]);
    expect(out.size).toBe(1);
    expect(out.get("tokens.css")).toBeDefined();
  });

  test("JavaScript handles empty tokens", () => {
    const out = new JavaScript({ dateFn: fixedDate }).generateFiles([]);
    expect(out.size).toBe(1);
    const content = out.get("tokens.mjs")!;
    expect(content).toContain("export const tokens = {");
  });

  test("Storybook handles empty tokens (with importPath)", () => {
    // Storybook needs a sibling JS generator OR explicit importPath.
    const sb = new Storybook({ importPath: "./tokens", dateFn: fixedDate });
    const out = sb.generateFiles([]);
    expect(out.size).toBe(1);
    expect(out.get("tokens.stories.tsx")).toBeDefined();
  });

  test("Teikn.generateToStrings with no tokens returns expected file set", () => {
    const teikn = new Teikn({
      generators: [new CssVars({ dateFn: fixedDate })],
      validate: false,
    });
    const result = teikn.generateToStrings([]);
    expect([...result.keys()]).toEqual(["tokens.css"]);
  });
});

// ─── Scenario 6: Deterministic iteration order ────────────────────
describe("generateToStrings order is deterministic", () => {
  test("registration order is preserved in output Map", () => {
    const teikn = new Teikn({
      generators: [
        new Json({ filename: "a" }),
        new CssVars({ filename: "b", dateFn: fixedDate }),
        new Scss({ filename: "c", dateFn: fixedDate }),
      ],
      validate: false,
    });
    const keys = [...teikn.generateToStrings(tokens).keys()];
    expect(keys).toEqual(["a.json", "b.css", "c.scss"]);
  });

  test("two consecutive runs produce identical key order", () => {
    const teikn = new Teikn({
      generators: [new Json({ filename: "a" }), new CssVars({ filename: "b", dateFn: fixedDate })],
      validate: false,
    });
    const k1 = [...teikn.generateToStrings(tokens).keys()];
    const k2 = [...teikn.generateToStrings(tokens).keys()];
    expect(k1).toEqual(k2);
  });
});

// ─── Scenario 7: Custom generator collides with built-in ──────────
describe("custom generator collision with built-in", () => {
  test("a custom Generator that outputs tokens.css collides with CssVars", () => {
    class CustomCss extends Generator {
      constructor() {
        super({ ext: "css", filename: "tokens" });
      }
      generateToken() {
        return "";
      }
      // oxlint-disable-next-line class-methods-use-this
      combinator() {
        return "/* custom */";
      }
    }
    expect(
      () =>
        new Teikn({
          generators: [new CssVars(), new CustomCss()],
        }),
    ).toThrow(/Duplicate/);
  });
});

// ─── Scenario 8: Lying generator (more files than declared) ───────
describe("generator that emits more files than declared", () => {
  test("extra files in generateFiles leak through (contract not enforced)", () => {
    class OverDeliver extends Generator {
      constructor() {
        super({ ext: "txt", filename: "a" });
      }
      generateToken() {
        return "";
      }
      // oxlint-disable-next-line class-methods-use-this
      combinator() {
        return "x";
      }
      override filenames(): string[] {
        return ["a.txt"];
      }
      override generateFiles(): Map<string, string> {
        return new Map([
          ["a.txt", "declared content"],
          ["sneaky.txt", "undeclared content"],
        ]);
      }
    }

    const teikn = new Teikn({ generators: [new OverDeliver()], validate: false });
    expect(() => teikn.generateToStrings([])).toThrow(
      /OverDeliver.*did not declare.*sneaky\.txt/,
    );
  });

  test("undeclared file can silently clobber another generator's output", () => {
    class Squatter extends Generator {
      constructor() {
        super({ ext: "txt", filename: "harmless" });
      }
      generateToken() {
        return "";
      }
      // oxlint-disable-next-line class-methods-use-this
      combinator() {
        return "";
      }
      override filenames(): string[] {
        return ["harmless.txt"];
      }
      override generateFiles(): Map<string, string> {
        return new Map([
          ["harmless.txt", "ok"],
          ["tokens.css", "/* CLOBBERED */"],
        ]);
      }
    }

    // CssVars is registered first; Squatter previously overwrote it at merge
    // time. The hard contract now catches this at generateToStrings time.
    const teikn = new Teikn({
      generators: [new CssVars({ dateFn: fixedDate }), new Squatter()],
      validate: false,
    });
    expect(() => teikn.generateToStrings(tokens)).toThrow(
      /Squatter.*did not declare.*tokens\.css/,
    );
  });
});

// ─── Scenario 9: Under-delivering generator ───────────────────────
describe("generator that declares more files than it emits", () => {
  test("missing declared file is NOT surfaced (silent omission)", () => {
    class UnderDeliver extends Generator {
      constructor() {
        super({ ext: "txt", filename: "a" });
      }
      generateToken() {
        return "";
      }
      // oxlint-disable-next-line class-methods-use-this
      combinator() {
        return "";
      }
      override filenames(): string[] {
        return ["a.txt", "b.txt"];
      }
      override generateFiles(): Map<string, string> {
        return new Map([["a.txt", "x"]]);
      }
    }

    const teikn = new Teikn({ generators: [new UnderDeliver()], validate: false });
    expect(() => teikn.generateToStrings([])).toThrow(/UnderDeliver.*declared.*b\.txt/);
  });
});

// ─── Scenario 10: ESM resolution check ────────────────────────────
describe("emitted ESM is loadable by Node's import", () => {
  test("JavaScript({module:'esm'}) output is valid ESM with named export", async () => {
    const teikn = new Teikn({
      generators: [new JavaScript({ filename: "tokens-esm", dateFn: fixedDate })],
      validate: false,
    });
    const result = teikn.generateToStrings(tokens);
    const content = result.get("tokens-esm.mjs")!;

    const tmp = path.join(os.tmpdir(), `teikn-esm-${Date.now()}-${Math.random()}.mjs`);
    fs.writeFileSync(tmp, content);
    try {
      const mod = await import(pathToFileURL(tmp).href);
      expect(mod.tokens).toBeDefined();
      // type-prefixed names: color-primary → camelCase → "colorPrimary"
      expect(typeof mod.tokens).toBe("object");
      expect(mod.default).toBe(mod.tokens);
    } finally {
      fs.unlinkSync(tmp);
    }
  });
});

// ─── Scenario 11: CJS resolution check ────────────────────────────
describe("emitted CJS is loadable by Node's require", () => {
  test("JavaScript({module:'cjs'}) output is valid CJS", () => {
    const teikn = new Teikn({
      generators: [new JavaScript({ module: "cjs", filename: "tokens-cjs", dateFn: fixedDate })],
      validate: false,
    });
    const result = teikn.generateToStrings(tokens);
    const content = result.get("tokens-cjs.cjs")!;

    const tmp = path.join(os.tmpdir(), `teikn-cjs-${Date.now()}-${Math.random()}.cjs`);
    fs.writeFileSync(tmp, content);
    try {
      const req = createRequire(import.meta.url);
      // Bust the cache
      delete req.cache?.[tmp];
      const mod = req(tmp);
      expect(mod.tokens).toBeDefined();
      expect(mod.default).toBe(mod.tokens);
    } finally {
      fs.unlinkSync(tmp);
    }
  });
});

// ─── Scenario 12: Filename with directory separator ───────────────
describe("filename with directory separator", () => {
  test("filename containing / is rejected at construction", () => {
    expect(() => new CssVars({ filename: "subdir/tokens", dateFn: fixedDate })).toThrow(
      /path separators/,
    );
  });

  test("filename containing .. is rejected at construction", () => {
    expect(() => new CssVars({ filename: "../escape", dateFn: fixedDate })).toThrow(
      /path separators|\.\./,
    );
  });

  test("filename containing backslash is rejected at construction", () => {
    expect(() => new CssVars({ filename: "subdir\\tokens", dateFn: fixedDate })).toThrow(
      /path separators/,
    );
  });
});

// ─── Scenario 13: Filename extension handling ─────────────────────
describe("filename extension handling", () => {
  test("user passes filename that already ends in .css → no double extension", () => {
    const out = new CssVars({ filename: "tokens.css", dateFn: fixedDate }).generateFiles(tokens);
    expect([...out.keys()]).toEqual(["tokens.css"]);
  });

  test("user passes filename with WRONG ext (.txt) — gets appended .css", () => {
    const out = new CssVars({ filename: "tokens.txt", dateFn: fixedDate }).generateFiles(tokens);
    // DESIGN QUESTION (src/Generators/Generator.ts:152-160): the generator
    // appends its own ext only when the filename doesn't already end in
    // that ext. So "tokens.txt" → "tokens.txt.css". Probably surprising —
    // a user who explicitly typed `.txt` likely wanted to override the
    // extension, OR they should be warned.
    expect([...out.keys()]).toEqual(["tokens.txt.css"]);
  });

  test("filename with no extension gets ext appended", () => {
    const out = new CssVars({ filename: "tokens", dateFn: fixedDate }).generateFiles(tokens);
    expect([...out.keys()]).toEqual(["tokens.css"]);
  });

  test("JavaScript filename containing .mjs is preserved (no double)", () => {
    const out = new JavaScript({ filename: "tokens.mjs", dateFn: fixedDate }).generateFiles(tokens);
    expect([...out.keys()]).toEqual(["tokens.mjs"]);
  });

  test("JavaScript({module:'cjs'}) with filename 'tokens.mjs' → tokens.mjs.cjs", () => {
    const out = new JavaScript({
      module: "cjs",
      filename: "tokens.mjs",
      dateFn: fixedDate,
    }).generateFiles(tokens);
    // BUG / DESIGN QUESTION: a user-provided `.mjs` filename when
    // module is "cjs" yields the awkward "tokens.mjs.cjs". Suggests
    // the generator should either warn or strip a known-incorrect ext.
    expect([...out.keys()]).toEqual(["tokens.mjs.cjs"]);
  });
});

// ─── Scenario 14: Storybook .tsx vs .jsx output validity ──────────
describe("Storybook output sanity (regex-level)", () => {
  const sanityCheck = (src: string) => {
    // imports
    expect(src).toMatch(/import\s+\{/);
    // story export
    expect(src).toMatch(/export\s+(default|const)/);
    // balanced braces — basic
    const opens = (src.match(/\{/g) || []).length;
    const closes = (src.match(/\}/g) || []).length;
    expect(opens).toBe(closes);
    // balanced angle brackets in JSX-ish form (loose)
    // Just look for at least one <Tag and a closing </ or self-close
    expect(src).toMatch(/<[A-Z]\w*/);
  };

  test(".stories.tsx output has TypeScript-flavored imports", () => {
    const teikn = new Teikn({
      generators: [
        new JavaScript({ filename: "design", dateFn: fixedDate }),
        new Storybook({ dateFn: fixedDate }),
      ],
      validate: false,
    });
    const out = teikn.generateToStrings(tokens);
    const sb = out.get("tokens.stories.tsx")!;
    expect(sb).toContain("import type { Meta, StoryObj }");
    sanityCheck(sb);
  });

  test(".stories.jsx output omits type imports", () => {
    const teikn = new Teikn({
      generators: [
        new JavaScript({ filename: "design", dateFn: fixedDate }),
        new Storybook({ filename: "tokens", dateFn: fixedDate, ext: "stories.jsx" }),
      ],
      validate: false,
    });
    const out = teikn.generateToStrings(tokens);
    const sb = out.get("tokens.stories.jsx")!;
    expect(sb).not.toContain("import type");
    expect(sb).not.toMatch(/:\s*Meta</);
    sanityCheck(sb);
  });
});

// ─── Scenario 15: Repeat runs are identical ───────────────────────
describe("idempotence of generateToStrings", () => {
  test("calling twice produces identical Maps", () => {
    const teikn = new Teikn({
      generators: [
        new CssVars({ dateFn: fixedDate }),
        new JavaScript({ filename: "tokens-rt", dateFn: fixedDate }),
      ],
      validate: false,
    });
    const a = teikn.generateToStrings(tokens);
    const b = teikn.generateToStrings(tokens);
    expect([...a.entries()]).toEqual([...b.entries()]);
  });
});

// ─── Scenario 16: Mutating tokens between runs ────────────────────
describe("token mutation between runs", () => {
  test("mutating the input array between runs IS reflected (no caching)", () => {
    const local: Token[] = [{ name: "primary", type: "color", value: "#000000" }];
    const teikn = new Teikn({
      generators: [new CssVars({ dateFn: fixedDate })],
      validate: false,
    });
    const first = teikn.generateToStrings(local).get("tokens.css")!;
    expect(first).toContain("#000000");

    // Replace contents in-place (the user-controlled mutation case).
    local[0] = { name: "primary", type: "color", value: "#ffffff" };
    const second = teikn.generateToStrings(local).get("tokens.css")!;
    expect(second).toContain("#ffffff");
    expect(second).not.toContain("#000000");
  });

  test("mutating a token object in place is reflected on next run", () => {
    const t: Token = { name: "primary", type: "color", value: "#000000" };
    const local: Token[] = [t];
    const teikn = new Teikn({
      generators: [new CssVars({ dateFn: fixedDate })],
      validate: false,
    });
    const a = teikn.generateToStrings(local).get("tokens.css")!;
    // mutate the token directly
    (t as { value: string }).value = "#abcabc";
    const b = teikn.generateToStrings(local).get("tokens.css")!;
    expect(a).not.toBe(b);
    expect(b).toContain("#abcabc");
  });
});

// ─── Bonus: empty plugins array path ──────────────────────────────
describe("Plugin pipeline edge cases", () => {
  test("generators accept undefined plugins argument", () => {
    expect(() => new CssVars({ dateFn: fixedDate }).generateFiles(tokens)).not.toThrow();
  });

  test("generator receives empty plugins[] without crashing", () => {
    const plugins: Plugin[] = [];
    expect(() =>
      new JavaScript({ dateFn: fixedDate }).generateFiles(tokens, plugins),
    ).not.toThrow();
  });
});

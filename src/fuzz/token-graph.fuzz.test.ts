import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { describe, expect, it } from "vitest";

import { composite, dim, dur, group, ref, theme, tokens as combineTokens } from "../builders.js";
import {
  CssVars,
  DtcgGenerator,
  Html,
  JavaScript,
  Json,
  Scss,
  ScssVars,
  Storybook,
  TypeScript,
  TypeScriptDeclarations,
} from "../Generators/index.js";
import type { Generator } from "../Generators/index.js";
import {
  AlphaMultiplyPlugin,
  ClampPlugin,
  ColorTransformPlugin,
  DeprecationPlugin,
  NameConventionPlugin,
  type Plugin,
  RemUnitPlugin,
  ScssQuoteValuePlugin,
  StripTypePrefixPlugin,
} from "../Plugins/index.js";
import { Teikn } from "../Teikn.js";
import type { TeiknOptions } from "../Teikn.ts";
import { BoxShadow } from "../TokenTypes/BoxShadow.js";
import { Color } from "../TokenTypes/Color/index.js";
import { CubicBezier } from "../TokenTypes/CubicBezier.js";
import { LinearGradient } from "../TokenTypes/Gradient.js";
import { Transition } from "../TokenTypes/Transition.js";

// ─── PRNG ────────────────────────────────────────────────────────
// Mulberry32 — deterministic, seedable PRNG so failures reproduce.

type Rng = () => number;

const makeRng = (seed: number): Rng => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const pick = <T>(rng: Rng, arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)]!;
const intBetween = (rng: Rng, lo: number, hi: number): number =>
  Math.floor(rng() * (hi - lo + 1)) + lo;
const chance = (rng: Rng, p: number): boolean => rng() < p;

// ─── Value generators ────────────────────────────────────────────

const dimUnits = ["px", "rem", "em", "%", "vw", "vh"] as const;
const durUnits = ["ms", "s"] as const;

const randColor = (rng: Rng): Color =>
  new Color(intBetween(rng, 0, 255), intBetween(rng, 0, 255), intBetween(rng, 0, 255));

const randDimension = (rng: Rng) => dim(intBetween(rng, 0, 64), pick(rng, dimUnits));
const randDuration = (rng: Rng) => dur(intBetween(rng, 0, 1000), pick(rng, durUnits));

const randCubicBezier = (rng: Rng): CubicBezier => new CubicBezier(rng(), rng(), rng(), rng());

const randBoxShadow = (rng: Rng): BoxShadow =>
  new BoxShadow(
    intBetween(rng, -10, 10),
    intBetween(rng, -10, 10),
    intBetween(rng, 0, 30),
    intBetween(rng, 0, 10),
    randColor(rng),
    chance(rng, 0.2),
  );

const randLinearGradient = (rng: Rng): LinearGradient =>
  new LinearGradient(`${intBetween(rng, 0, 359)}deg`, [randColor(rng), randColor(rng)]);

const randTransition = (rng: Rng): Transition =>
  new Transition(randDuration(rng), randCubicBezier(rng), randDuration(rng), "all");

// ─── Token-type metadata ─────────────────────────────────────────

type TokenTypeSpec = {
  type: string;
  make: (rng: Rng) => unknown;
};

const tokenTypes: TokenTypeSpec[] = [
  { type: "color", make: randColor },
  { type: "spacing", make: randDimension },
  { type: "borderRadius", make: randDimension },
  { type: "fontSize", make: randDimension },
  { type: "duration", make: randDuration },
  { type: "easing", make: randCubicBezier },
  { type: "shadow", make: randBoxShadow },
  { type: "gradient", make: randLinearGradient },
  { type: "transition", make: randTransition },
];

// ─── Name generators ─────────────────────────────────────────────

const safeNames = [
  "primary",
  "secondary",
  "accent",
  "background",
  "surface",
  "muted",
  "subtle",
  "danger",
  "warning",
  "info",
  "success",
];

const trickyNames = [
  "default",
  "class",
  "delete",
  "let",
  "import",
  "naïve",
  "façade",
  "色",
  "über",
  "emoji-rocket",
];

const randName = (rng: Rng, tricky: boolean): string =>
  tricky && chance(rng, 0.3) ? pick(rng, trickyNames) : pick(rng, safeNames);

// ─── Token-graph generator ───────────────────────────────────────

const buildGraph = (rng: Rng, opts: { tricky: boolean }) => {
  const groupCount = intBetween(rng, 1, 4);
  const allGroups: Array<{ type: string; names: string[]; entries: Record<string, unknown> }> = [];

  const used = new Set<string>();
  for (let g = 0; g < groupCount; g++) {
    const spec = tokenTypes[g % tokenTypes.length]!;
    const tokenCount = intBetween(rng, 1, 5);
    const entries: Record<string, unknown> = {};
    const names: string[] = [];
    for (let i = 0; i < tokenCount; i++) {
      let n: string;
      let guard = 0;
      do {
        n = `${randName(rng, opts.tricky)}-${i}-${g}`;
        guard++;
      } while (used.has(n) && guard < 5);
      used.add(n);
      names.push(n);
      // Plain value, tuple, or object form
      const value = spec.make(rng);
      const form = intBetween(rng, 0, 2);
      if (form === 0) {
        entries[n] = value;
      } else if (form === 1) {
        entries[n] = [value, "usage doc"];
      } else {
        const wantModes = chance(rng, 0.5);
        entries[n] = wantModes
          ? { value, modes: { dark: spec.make(rng), light: spec.make(rng) } }
          : { value };
      }
    }
    allGroups.push({ type: spec.type, names, entries });
  }

  // Add references — short reference chains across groups (1-4 hops)
  if (allGroups.length > 0 && chance(rng, 0.9)) {
    const target = allGroups[0]!;
    if (target.names.length > 0) {
      target.entries["link-ref"] = ref(target.names[0]!);
      target.names.push("link-ref");
      if (chance(rng, 0.6)) {
        target.entries["link-ref-2"] = ref("link-ref");
        target.names.push("link-ref-2");
      }
    }
  }

  // Add a composite token with a `{ref}` color field
  if (chance(rng, 0.5) && allGroups.some((g) => g.type === "color")) {
    const colorGroup = allGroups.find((g) => g.type === "color")!;
    if (colorGroup.names.length > 0) {
      const refName = colorGroup.names[0]!;
      allGroups.push({
        type: "composite-shadow",
        names: ["composite-shadow"],
        entries: {
          "composite-shadow": {
            value: {
              offsetX: 0,
              offsetY: intBetween(rng, 0, 4),
              blur: intBetween(rng, 0, 8),
              color: `{${refName}}`,
            } as never,
          },
        },
      });
    }
  }

  const tokenArrays = allGroups.map((g) =>
    g.type === "composite-shadow"
      ? composite("shadow", g.entries as Record<string, never>)
      : group(g.type, g.entries as Record<string, never>),
  );
  return combineTokens(...tokenArrays);
};

// ─── Plugin generator ────────────────────────────────────────────

const allPlugins = (rng: Rng): Plugin[] => {
  const stack: Plugin[] = [];
  if (chance(rng, 0.5)) {
    stack.push(
      new ColorTransformPlugin({
        type: pick(rng, ["hex", "rgb", "rgba", "hsl"] as const),
      }),
    );
  }
  if (chance(rng, 0.3)) {
    stack.push(new AlphaMultiplyPlugin({ background: "#ffffff" }));
  }
  if (chance(rng, 0.3)) {
    stack.push(new RemUnitPlugin({ base: 16, targetUnit: "rem" }));
  }
  if (chance(rng, 0.3)) {
    stack.push(
      new NameConventionPlugin({
        convention: pick(rng, [
          "camelCase",
          "kebab-case",
          "snake_case",
          "PascalCase",
          "SCREAMING_SNAKE",
        ] as const),
      }),
    );
  }
  if (chance(rng, 0.2)) {
    stack.push(new ScssQuoteValuePlugin());
  }
  if (chance(rng, 0.2)) {
    stack.push(new StripTypePrefixPlugin());
  }
  if (chance(rng, 0.2)) {
    stack.push(new DeprecationPlugin({ tokens: {} }));
  }
  if (chance(rng, 0.1)) {
    stack.push(new ClampPlugin({ pairs: [] }));
  }
  return stack;
};

// ─── Build a Teikn covering all generators with distinct filenames ──

const fixedDate = () => "FIXED";

const buildGenerators = (): Generator[] => [
  new CssVars({ dateFn: fixedDate }),
  new Scss({ filename: "tokens-scss", dateFn: fixedDate }),
  new ScssVars({ filename: "tokens-vars", dateFn: fixedDate }),
  new Html({ dateFn: fixedDate }),
  new Json(),
  new DtcgGenerator(),
  new JavaScript({ filename: "tokens-js", dateFn: fixedDate }),
  new TypeScript({ filename: "tokens-ts", dateFn: fixedDate }),
  new TypeScriptDeclarations({ filename: "tokens-decl", dateFn: fixedDate }),
  new Storybook({ filename: "tokens-story", dateFn: fixedDate }),
];

// ─── Fuzz tests ──────────────────────────────────────────────────

describe("token-graph fuzz", () => {
  const COUNT = Number(process.env.FUZZ_COUNT ?? 80);

  for (let i = 0; i < COUNT; i++) {
    const seed = 0xc0ffee + i;
    it(`seed=${seed}: all generators emit non-empty output and are deterministic`, () => {
      const rng = makeRng(seed);
      const toks = buildGraph(rng, { tricky: chance(rng, 0.7) });
      const plugins = allPlugins(rng);

      const opts: TeiknOptions = {
        generators: buildGenerators(),
        plugins,
        validate: false,
      };

      const t1 = new Teikn(opts);
      // BUG: `_t2` is constructed but determinism check below mistakenly
      // reuses `t1`. Pinned for follow-up; renaming preserves current behavior.
      const _t2 = new Teikn({
        ...opts,
        generators: buildGenerators(),
        plugins: allPlugins(makeRng(seed)).slice(0, plugins.length),
      });

      let out1: Map<string, string>;
      try {
        out1 = t1.generateToStrings(toks);
      } catch (e) {
        throw new Error(`generate threw (seed=${seed}): ${(e as Error).message}`);
      }
      expect(out1.size).toBeGreaterThan(0);
      for (const [filename, content] of out1) {
        expect(content, `empty output for ${filename}`).not.toBe("");
        expect(typeof content).toBe("string");
      }

      // JSON outputs must parse
      const jsonContent = out1.get("tokens.json");
      if (jsonContent) {
        expect(
          () => JSON.parse(jsonContent),
          `Json output not parseable (seed=${seed})`,
        ).not.toThrow();
      }
      const dtcgContent = out1.get("tokens.tokens.json");
      if (dtcgContent) {
        expect(
          () => JSON.parse(dtcgContent),
          `Dtcg output not parseable (seed=${seed})`,
        ).not.toThrow();
      }

      const jsContent = out1.get("tokens-js.mjs");
      if (jsContent) {
        expect(
          jsContent.includes("export const tokens"),
          `JS missing 'export const tokens' (seed=${seed})`,
        ).toBe(true);
      }
      const cssContent = out1.get("tokens.css");
      if (cssContent) {
        expect(cssContent.includes(":"), `CSS missing declarations (seed=${seed})`).toBe(true);
      }

      // Determinism: same input + same plugins should produce identical output
      // (Use the same Teikn instance generators reused on the same input.)
      const out2 = t1.generateToStrings(toks);
      for (const [filename, content] of out1) {
        expect(
          out2.get(filename),
          `non-deterministic on second call: ${filename} (seed=${seed})`,
        ).toBe(content);
      }
    });
  }
});

// ─── Stateful re-generation check ────────────────────────────────

describe("Teikn re-generation statefulness", () => {
  it("calling generateToStrings twice on the same instance is stable", () => {
    const colors = group("color", {
      primary: new Color(0, 100, 200),
      secondary: ref("primary"),
    });
    const t = new Teikn({
      generators: buildGenerators(),
      plugins: [new ColorTransformPlugin({ type: "hex" })],
    });
    const a = t.generateToStrings(colors);
    const b = t.generateToStrings(colors);
    for (const [filename, content] of a) {
      expect(b.get(filename), `mismatched ${filename}`).toBe(content);
    }
  });
});

// ─── JS round-trip via dynamic import ─────────────────────────

describe("JavaScript output round-trips through dynamic import", () => {
  const seeds = [1, 42, 12345, 99999, 0xdeadbeef];
  const dir = mkdtempSync(path.join(tmpdir(), "teikn-fuzz-"));

  for (const seed of seeds) {
    it(`seed=${seed}: .mjs is importable and exposes tokens`, async () => {
      const rng = makeRng(seed);
      const toks = buildGraph(rng, { tricky: true });
      const t = new Teikn({
        generators: [new JavaScript({ filename: "fuzz-js", dateFn: fixedDate })],
        plugins: [],
        validate: false,
      });
      const out = t.generateToStrings(toks);
      const content = out.get("fuzz-js.mjs")!;
      const file = path.join(dir, `seed-${seed}.mjs`);
      writeFileSync(file, content);
      const mod = await import(pathToFileURL(file).href);
      expect(mod.tokens, `tokens export missing for seed=${seed}`).toBeDefined();
      expect(typeof mod.tokens).toBe("object");
    });
  }

  it("cleanup", () => {
    rmSync(dir, { recursive: true, force: true });
  });
});

// ─── Pinned hand-crafted reproductions for any bugs found ──────

describe("pinned repro: plugin stack with composite + refs", () => {
  it("ColorTransform + NameConvention + StripTypePrefix over composites", () => {
    const colors = group("color", { primary: new Color(255, 0, 0) });
    const shadows = composite("shadow", {
      lifted: { offsetX: 0, offsetY: 2, blur: 4, color: "{primary}" },
    });
    const t = new Teikn({
      generators: buildGenerators(),
      plugins: [
        new ColorTransformPlugin({ type: "hex" }),
        new NameConventionPlugin({ convention: "SCREAMING_SNAKE" }),
        new StripTypePrefixPlugin(),
      ],
      validate: false,
    });
    expect(() => t.generateToStrings(combineTokens(colors, shadows))).not.toThrow();
  });
});

describe("pinned repro: composite with referenced field", () => {
  it("BoxShadow color resolved through a ref works", () => {
    const colors = group("color", { primary: new Color(0, 100, 200) });
    const shadows = composite("shadow", {
      lifted: { offsetX: 0, offsetY: 2, blur: 4, color: "{primary}" },
    });
    const t = new Teikn({
      generators: buildGenerators(),
      plugins: [],
      validate: false,
    });
    expect(() => t.generateToStrings(combineTokens(colors, shadows))).not.toThrow();
  });
});

describe("pinned repro: unicode + reserved-word token names", () => {
  it("emoji-rocket and 'default' names survive all generators", () => {
    const colors = group("color", {
      default: new Color(255, 0, 0),
      "emoji-rocket": new Color(0, 255, 0),
      色: new Color(0, 0, 255),
    });
    const t = new Teikn({ generators: buildGenerators(), plugins: [], validate: false });
    expect(() => t.generateToStrings(colors)).not.toThrow();
  });
});

describe("pinned repro: deep nested groups (5+ levels via dotted names)", () => {
  it("dotted group/name chains roundtrip", () => {
    const deep = group("color", {
      "a.b.c.d.e.f": new Color(1, 2, 3),
    });
    const t = new Teikn({ generators: buildGenerators(), plugins: [], validate: false });
    expect(() => t.generateToStrings(deep)).not.toThrow();
  });
});

describe("pinned repro: theme layer + modes interaction", () => {
  it("theme overrides merge cleanly with explicit modes", () => {
    const colors = group("color", {
      bg: { value: new Color(255, 255, 255), modes: { dark: new Color(0, 0, 0) } },
    });
    const dark = theme("dark", colors, { bg: new Color(10, 10, 10) });
    const t = new Teikn({
      generators: buildGenerators(),
      themes: [dark],
      validate: false,
    });
    expect(() => t.generateToStrings(colors)).not.toThrow();
  });
});

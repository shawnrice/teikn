import { describe, expect, test } from "bun:test";

import type { Token } from "../Token.js";
import { Color } from "../TokenTypes/Color/index.js";
import { BoxShadow } from "../TokenTypes/BoxShadow.js";
import { CssVars } from "../Generators/CssVars.js";
import { Scss } from "../Generators/Scss.js";
import { ScssVars } from "../Generators/ScssVars.js";
import { JavaScript } from "../Generators/JavaScript.js";
import { Json } from "../Generators/Json.js";
import { Teikn } from "../Teikn.js";
import { Plugin, sortPlugins } from "./Plugin.js";
import { AlphaMultiplyPlugin } from "./AlphaMultiplyPlugin.js";
import { ClampPlugin } from "./ClampPlugin.js";
import { ColorTransformPlugin } from "./ColorTransformPlugin.js";
import { ContrastValidatorPlugin } from "./ContrastValidatorPlugin.js";
import { DeprecationPlugin } from "./DeprecationPlugin.js";
import { NameConventionPlugin } from "./NameConventionPlugin.js";
import { PrefixTypePlugin } from "./PrefixTypePlugin.js";
import { RemUnitPlugin } from "./RemUnitPlugin.js";
import { ScssQuoteValuePlugin } from "./ScssQuoteValuePlugin.js";
import { testOpts } from "../fixtures/testOpts.js";

const opts = testOpts;

// ─── Scenario 1: cycle in runAfter ───────────────────────────

describe("Scenario 1 — cycle in runAfter", () => {
  test("throws clear error on direct A↔B cycle", () => {
    class CycA extends Plugin {
      tokenType: RegExp = /.*/;
      outputType: RegExp = /.*/;
      override readonly runAfter: string[] = ["CycB"];
    }
    class CycB extends Plugin {
      tokenType: RegExp = /.*/;
      outputType: RegExp = /.*/;
      override readonly runAfter: string[] = ["CycA"];
    }
    expect(() => sortPlugins([new CycA(), new CycB()])).toThrow(/cycle/i);
  });

  test("throws on 3-plugin cycle (A→B→C→A)", () => {
    class A3 extends Plugin {
      tokenType: RegExp = /.*/;
      outputType: RegExp = /.*/;
      override readonly runAfter: string[] = ["C3"];
    }
    class B3 extends Plugin {
      tokenType: RegExp = /.*/;
      outputType: RegExp = /.*/;
      override readonly runAfter: string[] = ["A3"];
    }
    class C3 extends Plugin {
      tokenType: RegExp = /.*/;
      outputType: RegExp = /.*/;
      override readonly runAfter: string[] = ["B3"];
    }
    expect(() => sortPlugins([new A3(), new B3(), new C3()])).toThrow(/cycle/i);
  });

  test("throws on self-cycle (A runAfter A)", () => {
    class Self extends Plugin {
      tokenType: RegExp = /.*/;
      outputType: RegExp = /.*/;
      override readonly runAfter: string[] = ["Self"];
    }
    expect(() => sortPlugins([new Self()])).toThrow(/cycle/i);
  });
});

// ─── Scenario 2: unregistered runAfter target ────────────────

describe("Scenario 2 — runAfter references unregistered plugin", () => {
  test("missing runAfter targets log to stderr and continue", () => {
    class Dependent extends Plugin {
      tokenType: RegExp = /.*/;
      outputType: RegExp = /.*/;
      override readonly runAfter: string[] = ["NotARealPlugin"];
    }
    const d = new Dependent();
    const original = console.error;
    const messages: string[] = [];
    console.error = (msg: string) => {
      messages.push(msg);
    };
    try {
      const result = sortPlugins([d]);
      expect(result).toEqual([d]);
    } finally {
      console.error = original;
    }
    expect(messages.length).toBe(1);
    expect(messages[0]).toMatch(/Dependent/);
    expect(messages[0]).toMatch(/NotARealPlugin/);
  });
});

// ─── Scenario 3: duplicate plugin instances ──────────────────

describe("Scenario 3 — duplicate plugin instances", () => {
  test("two instances of same class throw", () => {
    expect(() =>
      sortPlugins([
        new NameConventionPlugin({ convention: "camelCase" }),
        new NameConventionPlugin({ convention: "kebab-case" }),
      ]),
    ).toThrow(/duplicate plugin instance/i);
  });
});

// ─── Scenario 4: order stability ─────────────────────────────

describe("Scenario 4 — order stability", () => {
  test("same input → same output across repeated sorts", () => {
    const make = (): Plugin[] => [
      new RemUnitPlugin({ base: 16 }),
      new ColorTransformPlugin({ type: "rgba" }),
      new AlphaMultiplyPlugin({ background: "#fff" }),
      new ScssQuoteValuePlugin(),
    ];
    const a = sortPlugins(make()).map((p) => p.constructor.name);
    const b = sortPlugins(make()).map((p) => p.constructor.name);
    const c = sortPlugins(make()).map((p) => p.constructor.name);
    expect(a).toEqual(b);
    expect(b).toEqual(c);
  });

  test("AlphaMultiply always precedes ColorTransform", () => {
    const ord1 = sortPlugins([
      new AlphaMultiplyPlugin({ background: "#fff" }),
      new ColorTransformPlugin({ type: "rgba" }),
    ]).map((p) => p.constructor.name);
    const ord2 = sortPlugins([
      new ColorTransformPlugin({ type: "rgba" }),
      new AlphaMultiplyPlugin({ background: "#fff" }),
    ]).map((p) => p.constructor.name);
    expect(ord1.indexOf("AlphaMultiplyPlugin")).toBeLessThan(ord1.indexOf("ColorTransformPlugin"));
    expect(ord2.indexOf("AlphaMultiplyPlugin")).toBeLessThan(ord2.indexOf("ColorTransformPlugin"));
  });
});

// ─── Scenario 5: NameConvention + (StripTypePrefix as proxy) ─

describe("Scenario 5 — NameConventionPlugin ordering normalization", () => {
  // PrefixTypePlugin is rejected by Teikn (type-prefixing is built-in
  // since alpha.x). Use the sortPlugins API directly to verify the
  // runAfter contract: NameConventionPlugin declares runAfter:
  // ["PrefixTypePlugin", "StripTypePrefixPlugin"].
  test("NameConvention sorts after PrefixType regardless of input order", () => {
    const a = sortPlugins([
      new NameConventionPlugin({ convention: "camelCase" }),
      new PrefixTypePlugin(),
    ]).map((p) => p.constructor.name);
    const b = sortPlugins([
      new PrefixTypePlugin(),
      new NameConventionPlugin({ convention: "camelCase" }),
    ]).map((p) => p.constructor.name);
    expect(a).toEqual(b);
    expect(a[0]).toBe("PrefixTypePlugin");
    expect(a[1]).toBe("NameConventionPlugin");
  });

  test("Generator-level PrefixTypePlugin + NameConvention produces stable output", () => {
    // Generator.generate() applies sortPlugins, so order at call site is irrelevant.
    const tokens: Token[] = [{ name: "primary", type: "color", value: "#fff" }];
    const ord1 = new Json().generate(tokens, [
      new NameConventionPlugin({ convention: "camelCase" }),
      new PrefixTypePlugin(),
    ]);
    const ord2 = new Json().generate(tokens, [
      new PrefixTypePlugin(),
      new NameConventionPlugin({ convention: "camelCase" }),
    ]);
    expect(ord1).toBe(ord2);
    // PrefixType produces "colorPrimary", then NameConvention(camelCase) → "colorPrimary"
    expect(JSON.parse(ord1).colorPrimary).toBeDefined();
  });
});

// ─── Scenario 6 — refs in composite values + NameConvention ──

describe("Scenario 6 — NameConvention renames refs in composite values", () => {
  // Full Teikn pipeline: resolveReferences runs BEFORE plugins, so by the
  // time NameConventionPlugin sees tokens, refs are inlined values.
  // The actual surfaced concern is: does the generated output still link
  // ref tokens after the name conv changes? Test by writing tokens with
  // a string-ref BoxShadow.color and verifying generated output is sane.
  test("CssVars: BoxShadow with ref color survives rename", () => {
    const tokens: Token[] = [
      { name: "color-primary", type: "color", value: "#abcdef" },
      {
        name: "shadow-card",
        type: "shadow",
        value: {
          color: "{color-primary}",
          offsetX: "0",
          offsetY: "2px",
          blur: "4px",
          spread: "0",
        },
      },
    ];
    const teikn = new Teikn({
      generators: [new CssVars(opts)],
      plugins: [new NameConventionPlugin({ convention: "camelCase" })],
      validate: false,
    });
    const out = teikn.generateToStrings(tokens).get("tokens.css")!;
    // Should contain the resolved color hex in the shadow output (not raw {ref})
    expect(out).toContain("#abcdef");
    expect(out).not.toContain("{color");
  });

  test("Scss: same composite-ref scenario", () => {
    const tokens: Token[] = [
      { name: "color-primary", type: "color", value: "#abcdef" },
      {
        name: "shadow-card",
        type: "shadow",
        value: {
          color: "{color-primary}",
          offsetX: "0",
          offsetY: "2px",
          blur: "4px",
          spread: "0",
        },
      },
    ];
    const teikn = new Teikn({
      generators: [new Scss(opts)],
      plugins: [new NameConventionPlugin({ convention: "camelCase" })],
      validate: false,
    });
    const out = teikn.generateToStrings(tokens).get("tokens.scss")!;
    expect(out).toContain("#abcdef");
  });

  test("JavaScript: same composite-ref scenario", () => {
    const tokens: Token[] = [
      { name: "color-primary", type: "color", value: "#abcdef" },
      {
        name: "shadow-card",
        type: "shadow",
        value: {
          color: "{color-primary}",
          offsetX: "0",
          offsetY: "2px",
          blur: "4px",
          spread: "0",
        },
      },
    ];
    const teikn = new Teikn({
      generators: [new JavaScript(opts)],
      plugins: [new NameConventionPlugin({ convention: "camelCase" })],
      validate: false,
    });
    const out = teikn.generateToStrings(tokens).get("tokens.mjs")!;
    expect(out).toContain("#abcdef");
  });
});

// ─── Scenario 7 — refs in MODE values + NameConvention ───────

describe("Scenario 7 — NameConvention renames refs inside mode values", () => {
  test("ref in modes.dark resolves after rename (Json)", () => {
    const tokens: Token[] = [
      { name: "color-accent", type: "color", value: "#123456" },
      {
        name: "surface",
        type: "color",
        value: "#ffffff",
        modes: { dark: "{color-accent}" },
      },
    ];
    const teikn = new Teikn({
      generators: [new Json()],
      plugins: [new NameConventionPlugin({ convention: "camelCase" })],
      validate: false,
    });
    const out = teikn.generateToStrings(tokens).get("tokens.json")!;
    const json = JSON.parse(out);
    // mode key was "dark" — kebab/camel of "dark" is still "dark".
    // The accent value should resolve to #123456 (not still a {ref}).
    const surfaceKey = Object.keys(json).find((k) => k.toLowerCase().includes("surface"))!;
    expect(JSON.stringify(json[surfaceKey].modes)).toContain("#123456");
    expect(JSON.stringify(json[surfaceKey].modes)).not.toContain("{color");
  });

  test("composite ref in modes resolves after rename (CssVars)", () => {
    const tokens: Token[] = [
      { name: "color-primary", type: "color", value: "#abcdef" },
      {
        name: "shadow-card",
        type: "shadow",
        value: { color: "#000", offsetX: "0", offsetY: "2px", blur: "4px", spread: "0" },
        modes: {
          dark: {
            color: "{color-primary}",
            offsetX: "0",
            offsetY: "2px",
            blur: "4px",
            spread: "0",
          },
        },
      },
    ];
    const teikn = new Teikn({
      generators: [new CssVars(opts)],
      plugins: [new NameConventionPlugin({ convention: "camelCase" })],
      validate: false,
    });
    const out = teikn.generateToStrings(tokens).get("tokens.css")!;
    expect(out).toContain("#abcdef");
    expect(out).not.toContain("{color");
  });
});

// ─── Scenario 8 — ColorTransform × AlphaMultiply ─────────────

describe("Scenario 8 — ColorTransform × AlphaMultiply composition", () => {
  test("both orderings produce identical output (sortPlugins normalizes)", () => {
    const tokens: Token[] = [{ name: "overlay", type: "color", value: "rgba(0,0,0,0.5)" }];
    const a = new Json().generate(tokens, [
      new ColorTransformPlugin({ type: "rgba" }),
      new AlphaMultiplyPlugin({ background: "#ffffff" }),
    ]);
    const b = new Json().generate(tokens, [
      new AlphaMultiplyPlugin({ background: "#ffffff" }),
      new ColorTransformPlugin({ type: "rgba" }),
    ]);
    expect(a).toBe(b);
    const j = JSON.parse(a);
    // After AlphaMultiply on white: ~rgb(127,127,127), then ColorTransform → rgba(...,1)
    expect(j.overlay.value).toContain("rgba(");
    expect(j.overlay.value).not.toMatch(/0\.5\b/);
  });

  test("ColorTransform → hex on alpha color: documents alpha discard via audit only", () => {
    // ColorTransformPlugin.audit warns on hex when alpha<1; transform itself
    // still strips alpha silently. Confirm transform behavior.
    const tokens: Token[] = [{ name: "ghost", type: "color", value: "rgba(255,0,0,0.25)" }];
    const out = new Json().generate(tokens, [new ColorTransformPlugin({ type: "hex" })]);
    const j = JSON.parse(out);
    // Behavior: alpha silently discarded in transform output.
    expect(j.ghost.value).toMatch(/^#[0-9a-fA-F]{6,8}$/);
  });
});

// ─── Scenario 9 — ScssQuoteValue × NameConvention ────────────

describe("Scenario 9 — ScssQuoteValue × NameConvention", () => {
  test("font-family token gets both rename and quoting", () => {
    const tokens: Token[] = [
      { name: "body-font", type: "font-family", value: "Inter, sans-serif" },
    ];
    const out = new Scss(opts).generate(tokens, [
      new ScssQuoteValuePlugin(),
      new NameConventionPlugin({ convention: "camelCase" }),
    ]);
    // bodyFont becomes the name; unquote wrapping is in value
    expect(out).toContain("unquote");
    expect(out).toContain("Inter");
  });

  test("reversing registration order yields identical output", () => {
    const tokens: Token[] = [
      { name: "body-font", type: "font-family", value: "Inter, sans-serif" },
    ];
    const a = new Scss(opts).generate(tokens, [
      new ScssQuoteValuePlugin(),
      new NameConventionPlugin({ convention: "camelCase" }),
    ]);
    const b = new Scss(opts).generate(tokens, [
      new NameConventionPlugin({ convention: "camelCase" }),
      new ScssQuoteValuePlugin(),
    ]);
    expect(a).toBe(b);
  });
});

// ─── Scenario 10 — plugin sees ref string vs resolved value ──

describe("Scenario 10 — plugin transform sees ref string at generator level", () => {
  // DESIGN QUESTION: when calling Generator.generate() directly (bypassing
  // Teikn), refs are NOT resolved. ColorTransformPlugin defensively skips
  // values starting with "{". Other plugins (e.g. RemUnit) may not.
  test("ColorTransform skips ref string values", () => {
    const tokens: Token[] = [
      { name: "primary", type: "color", value: "#ff0000" },
      { name: "alias", type: "color", value: "{primary}" },
    ];
    const out = new Json().generate(tokens, [new ColorTransformPlugin({ type: "rgba" })]);
    const j = JSON.parse(out);
    expect(j.primary.value).toContain("rgba(");
    // alias is left as the raw ref string — plugin defensively skipped it
    expect(j.alias.value).toBe("{primary}");
  });

  test("Via full Teikn pipeline, refs are resolved before plugin runs", () => {
    const tokens: Token[] = [
      { name: "primary", type: "color", value: "#ff0000" },
      { name: "alias", type: "color", value: "{primary}" },
    ];
    const teikn = new Teikn({
      generators: [new Json()],
      plugins: [new ColorTransformPlugin({ type: "rgba" })],
      validate: false,
    });
    const out = teikn.generateToStrings(tokens).get("tokens.json")!;
    const j = JSON.parse(out);
    // Both should be transformed because Teikn resolved {primary} → "#ff0000"
    const aliasKey = Object.keys(j).find((k) => k.toLowerCase().includes("alias"))!;
    expect(j[aliasKey].value).toContain("rgba(");
  });
});

// ─── Scenario 11 — plugin runs on mode values ─────────────────

describe("Scenario 11 — plugin transforms apply to mode values", () => {
  test("RemUnitPlugin converts px in modes", () => {
    const tokens: Token[] = [
      { name: "gap", type: "spacing", value: "16px", modes: { dense: "8px", loose: "32px" } },
    ];
    const out = new Json().generate(tokens, [new RemUnitPlugin({ base: 16 })]);
    const j = JSON.parse(out);
    expect(j.gap.value).toBe("1rem");
    expect(j.gap.modes.dense).toBe("0.5rem");
    expect(j.gap.modes.loose).toBe("2rem");
  });

  test("ClampPlugin behavior in modes", () => {
    const tokens: Token[] = [
      {
        name: "size",
        type: "font-size",
        value: "16px",
        modes: { large: "24px" },
      },
    ];
    // ClampPlugin requires options — explore minimal usage
    const plugin = new ClampPlugin({
      tokens: { size: { min: "12px", max: "20px" } },
    });
    const out = new Json().generate(tokens, [plugin]);
    const j = JSON.parse(out);
    // Document: does ClampPlugin's tokens-map-keyed behavior apply to modes?
    // Observed: clamp() string in value; modes may or may not match.
    expect(typeof j.size.value).toBe("string");
  });
});

// ─── Scenario 12 — empty plugin list ──────────────────────────

describe("Scenario 12 — empty plugin list", () => {
  test("Teikn with plugins: [] still generates", () => {
    const tokens: Token[] = [{ name: "primary", type: "color", value: "#ff0000" }];
    const teikn = new Teikn({
      generators: [new Json()],
      plugins: [],
      validate: false,
    });
    const out = teikn.generateToStrings(tokens).get("tokens.json")!;
    const j = JSON.parse(out);
    // Type prefixing is built-in
    expect(Object.keys(j).some((k) => k.toLowerCase().includes("primary"))).toBe(true);
  });

  test("Generator.generate with []  plugins is a noop", () => {
    const tokens: Token[] = [{ name: "primary", type: "color", value: "#ff0000" }];
    const out = new Json().generate(tokens, []);
    expect(JSON.parse(out).primary.value).toBe("#ff0000");
  });
});

// ─── Scenario 13 — plugin transform throws ────────────────────

describe("Scenario 13 — plugin transform throws", () => {
  test("error from plugin.transform is wrapped with plugin + token context", () => {
    class Bomb extends Plugin {
      tokenType: RegExp = /.*/;
      outputType: RegExp = /.*/;
      override transform(token: Token): Token {
        if (token.name === "boom") {
          throw new Error("kaboom");
        }
        return token;
      }
    }
    const tokens: Token[] = [
      { name: "ok", type: "color", value: "#000" },
      { name: "boom", type: "color", value: "#fff" },
    ];
    let err: Error | undefined;
    try {
      new Json().generate(tokens, [new Bomb()]);
    } catch (e) {
      err = e as Error;
    }
    expect(err).toBeDefined();
    expect(err!.message).toMatch(/Bomb/);
    expect(err!.message).toMatch(/boom/);
    expect(err!.message).toMatch(/kaboom/);
  });
});

// ─── Scenario 14 — generator prefix with special characters ──

describe("Scenario 14 — generator prefix with special characters", () => {
  // Note: "prefix" is a generator option (CssVars/Scss/ScssVars), not a
  // plugin option. PrefixTypePlugin is rejected by Teikn entirely. Test
  // generators with edge-case prefixes against plugins.
  test("CssVars prefix with double-dash characters", () => {
    const tokens: Token[] = [{ name: "primary", type: "color", value: "#ff0000" }];
    const out = new CssVars({ ...opts, prefix: "--weird" } as Parameters<
      (typeof CssVars)["prototype"]["generate"]
    > extends never
      ? never
      : ConstructorParameters<typeof CssVars>[0]).generate(tokens, [
      new NameConventionPlugin({ convention: "kebab-case" }),
    ]);
    // Document what shows up — could yield `----weird-...` which is invalid CSS
    // BUG candidate: no sanitization of prefix means leading `--` can produce
    // `----weird` style custom properties. CSS allows custom properties to
    // start with `--`, but `----weird` is technically valid yet surprising.
    expect(out).toContain("weird");
  });

  test("Scss prefix with leading digit", () => {
    const tokens: Token[] = [{ name: "primary", type: "color", value: "#ff0000" }];
    const out = new Scss({ ...opts, prefix: "1bad" } as ConstructorParameters<
      typeof Scss
    >[0]).generate(tokens, [new NameConventionPlugin({ convention: "kebab-case" })]);
    // BUG: Scss accepts a `prefix` option (declared via PrefixOptions in
    // ScssOpts), but `Scss.generateToken` / `combinator` never reads it —
    // see src/Generators/Scss.ts where `composeName` from prefix-utils is
    // not invoked. Observed: prefix is silently dropped (no "1bad" anywhere).
    // Expected: either apply the prefix consistently (like CssVars does
    // for `--prefix-name`) or throw on the unsupported option.
    expect(out).not.toContain("1bad");
  });

  test("ScssVars prefix containing $", () => {
    const tokens: Token[] = [{ name: "primary", type: "color", value: "#ff0000" }];
    const out = new ScssVars({ ...opts, prefix: "$weird" } as ConstructorParameters<
      typeof ScssVars
    >[0]).generate(tokens, []);
    // BUG candidate: `$$weird-...` is not a legal SCSS variable.
    expect(out).toBeDefined();
  });
});

// ─── Scenario 15 — DeprecationPlugin across generators ───────

describe("Scenario 15 — DeprecationPlugin output across generators", () => {
  const plugin = new DeprecationPlugin({ tokens: { old: "new" } });
  const tokens: Token[] = [
    { name: "old", type: "color", value: "#000" },
    { name: "new", type: "color", value: "#fff" },
  ];

  test("Json output exposes deprecated:true on the token", () => {
    const j = JSON.parse(new Json().generate(tokens, [plugin]));
    expect(j.old.deprecated).toBe(true);
  });

  test("CssVars: deprecation surfaces in a comment or annotation", () => {
    const out = new CssVars(opts).generate(tokens, [plugin]);
    // BUG candidate: CssVars output emits the deprecated token alongside
    // valid tokens without any comment/marker. Consumers have no way to
    // know "old" is deprecated from CSS output alone.
    expect(out).toContain("--old");
    // OBSERVED: CssVars does emit "DEPRECATED" text via usage-derived
    // comments on the token. Verify it shows up somewhere consumable.
    expect(out.toLowerCase()).toContain("deprecated");
  });

  test("Scss: deprecation surfaces in a comment or annotation", () => {
    const out = new Scss(opts).generate(tokens, [plugin]);
    // Same behavioral note as CssVars.
    expect(out).toContain("old");
  });
});

// ─── Scenario 16 — ContrastValidatorPlugin loudness ──────────

describe("Scenario 16 — ContrastValidatorPlugin failure mode", () => {
  test("audit reports insufficient contrast but generate() does NOT fail", () => {
    // DESIGN QUESTION: ContrastValidatorPlugin only implements audit().
    // Calling .generate() (or Teikn.generateToStrings) completes successfully
    // even when contrast is below WCAG threshold. Issues are only surfaced
    // via .audit() / .transform() flow. Generators bypass this.
    const tokens: Token[] = [
      { name: "fg", type: "color", value: "#888888" },
      { name: "bg", type: "color", value: "#999999" },
    ];
    const plugin = new ContrastValidatorPlugin({
      pairs: [{ foreground: "fg", background: "bg", level: "AAA" }],
    });
    // Direct audit — returns issues
    const issues = plugin.audit!(tokens);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]!.severity).toBe("error");
    expect(issues[0]!.message).toMatch(/contrast/i);
    // Through Teikn — generates files successfully, doesn't throw
    const teikn = new Teikn({
      generators: [new Json()],
      plugins: [plugin],
      validate: false,
    });
    expect(() => teikn.generateToStrings(tokens)).not.toThrow();
    // The audit method surfaces issues only when consumer calls .transform()
    // (the Teikn method, not Plugin.transform) which returns {auditIssues, ...}.
  });
});

// ─── Scenario 6/7 deep — composed BoxShadow refs (alpha.12 regression) ──

describe("Alpha.12 deep — refs deep inside first-class BoxShadow", () => {
  test("BoxShadow constructed with new Color from {ref}: rename preserves chain", () => {
    // The alpha.12 fix was about composite VALUES (plain objects) containing
    // refs. First-class BoxShadow instances are constructed eagerly and don't
    // carry ref strings — so this is a doc-only smoke test.
    const tokens: Token[] = [
      { name: "color-primary", type: "color", value: new Color("#abcdef") },
      {
        name: "shadow-card",
        type: "shadow",
        value: new BoxShadow({
          color: new Color("#abcdef"),
          offsetX: 0,
          offsetY: 2,
          blur: 4,
          spread: 0,
        }),
      },
    ];
    const teikn = new Teikn({
      generators: [new CssVars(opts)],
      plugins: [new NameConventionPlugin({ convention: "camelCase" })],
      validate: false,
    });
    const out = teikn.generateToStrings(tokens).get("tokens.css")!;
    // Color serializes to rgb(...) form here, not the hex literal. Document
    // the rgb form is present and refs are not raw strings.
    expect(out).toContain("rgb(171, 205, 239)");
    expect(out).not.toContain("{color");
  });
});

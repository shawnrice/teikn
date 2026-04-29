import fs from "node:fs";
import path from "node:path";

import { ensureDirectory } from "./ensure-directory.js";
import {
  CssVars,
  DtcgGenerator,
  Generator,
  Html,
  JavaScript,
  Json,
  Scss,
  ScssVars,
  Storybook,
  TypeScript,
  TypeScriptDeclarations,
} from "./Generators/index.js";
import type { AuditIssue } from "./Plugins/index.js";
import {
  AlphaMultiplyPlugin,
  ClampPlugin,
  ColorBlindnessPlugin,
  ColorTransformPlugin,
  ContrastValidatorPlugin,
  DeprecationPlugin,
  MinFontSizePlugin,
  NameConventionPlugin,
  PalettePlugin,
  PerceptualDistancePlugin,
  Plugin,
  PrefixTypePlugin,
  ReducedMotionPlugin,
  RemUnitPlugin,
  ScssQuoteValuePlugin,
  StripTypePrefixPlugin,
  TouchTargetPlugin,
} from "./Plugins/index.js";
import { resolveReferences } from "./resolve.js";
import { buildKeyAliasIndex, resolveKey, tokenKey } from "./token-keys.js";
import type { ThemeLayer, Token, TokenValue } from "./Token.js";
import type { ValidationResult } from "./validate.js";
import { validate } from "./validate.js";

/**
 * Prefix each token's name with its type, joined by a hyphen.
 * Generators' nameTransformers (kebabCase, camelCase, etc.) handle final formatting.
 */
const prefixTokenNames = (tokens: Token[]): Token[] =>
  tokens.map((token) => ({
    ...token,
    name: `${token.type}-${token.name}`,
  }));

/**
 * Apply theme layers to tokens, merging each layer's overrides into token.modes.
 */
const applyThemes = (themes: ThemeLayer[], tokens: Token[]): Token[] => {
  if (themes.length === 0) {
    return tokens;
  }

  const tokenKeys = buildKeyAliasIndex(tokens.map((token) => tokenKey(token)).filter(Boolean));
  const modeUpdates = new Map<string, Record<string, TokenValue>>();
  for (const layer of themes) {
    for (const [name, value] of Object.entries(layer.overrides)) {
      const resolved = resolveKey(name, tokenKeys);
      switch (resolved.status) {
        case "missing":
          throw new Error(
            `Theme "${layer.name}" references unknown token "${name}" during apply. ` +
              `The token may have been removed from the token set after the theme was created.`,
          );
        case "ambiguous":
          // Unreachable via `theme()` (which qualifies keys at construction
          // so they hit `fullKeys` here), but kept for consumers who hand-build
          // a `ThemeLayer` literal with bare override keys against an ambiguous
          // token universe.
          throw new Error(
            `Theme "${layer.name}" override key "${name}" is ambiguous during apply. ` +
              `Matches: ${resolved.candidates.join(", ")}.`,
          );
        case "ok":
          if (!modeUpdates.has(resolved.key)) {
            modeUpdates.set(resolved.key, {});
          }
          modeUpdates.get(resolved.key)![layer.name] = value;
          break;
      }
    }
  }

  return tokens.map((token) => {
    const updates = modeUpdates.get(tokenKey(token));
    if (!updates) {
      return token;
    }
    return {
      ...token,
      modes: { ...token.modes, ...updates },
    };
  });
};

const BuiltInPlugins: {
  AlphaMultiplyPlugin: typeof AlphaMultiplyPlugin;
  ClampPlugin: typeof ClampPlugin;
  ColorBlindnessPlugin: typeof ColorBlindnessPlugin;
  ColorTransformPlugin: typeof ColorTransformPlugin;
  ContrastValidatorPlugin: typeof ContrastValidatorPlugin;
  DeprecationPlugin: typeof DeprecationPlugin;
  MinFontSizePlugin: typeof MinFontSizePlugin;
  NameConventionPlugin: typeof NameConventionPlugin;
  PalettePlugin: typeof PalettePlugin;
  PerceptualDistancePlugin: typeof PerceptualDistancePlugin;
  PrefixTypePlugin: typeof PrefixTypePlugin;
  StripTypePrefixPlugin: typeof StripTypePrefixPlugin;
  ReducedMotionPlugin: typeof ReducedMotionPlugin;
  RemUnitPlugin: typeof RemUnitPlugin;
  ScssQuoteValuePlugin: typeof ScssQuoteValuePlugin;
  TouchTargetPlugin: typeof TouchTargetPlugin;
} = {
  AlphaMultiplyPlugin,
  ClampPlugin,
  ColorBlindnessPlugin,
  ColorTransformPlugin,
  ContrastValidatorPlugin,
  DeprecationPlugin,
  MinFontSizePlugin,
  NameConventionPlugin,
  PalettePlugin,
  PerceptualDistancePlugin,
  PrefixTypePlugin,
  StripTypePrefixPlugin,
  ReducedMotionPlugin,
  RemUnitPlugin,
  ScssQuoteValuePlugin,
  TouchTargetPlugin,
};

const BuiltInGenerators: {
  CssVars: typeof CssVars;
  Dtcg: typeof DtcgGenerator;
  Html: typeof Html;
  JavaScript: typeof JavaScript;
  Json: typeof Json;
  Scss: typeof Scss;
  ScssVars: typeof ScssVars;
  Storybook: typeof Storybook;
  TypeScript: typeof TypeScript;
  TypeScriptDeclarations: typeof TypeScriptDeclarations;
} = {
  CssVars,
  Dtcg: DtcgGenerator,
  Html,
  JavaScript,
  Json,
  Scss,
  ScssVars,
  Storybook,
  TypeScript,
  TypeScriptDeclarations,
};

export type TeiknOptions = {
  generators?: Generator[];
  plugins?: Plugin[];
  themes?: ThemeLayer[];
  outDir?: string;
  validate?: boolean;
};

export type TransformResult = {
  auditIssues: AuditIssue[];
  files: { path: string; size: number }[];
  errors: { path: string; error: unknown }[];
};

export class Teikn {
  generators: Generator[];

  plugins: Plugin[];

  themes: ThemeLayer[];

  outDir: string;

  static generators: typeof BuiltInGenerators = BuiltInGenerators;

  static plugins: typeof BuiltInPlugins = BuiltInPlugins;

  static Plugin: typeof Plugin = Plugin;

  static Generator: typeof Generator = Generator;

  static validate: typeof validate = validate;

  static resolveReferences: typeof resolveReferences = resolveReferences;

  options: TeiknOptions;

  constructor(options: TeiknOptions) {
    const { generators, outDir, plugins = [], themes } = options;
    this.options = options;
    this.generators = generators ?? [new Teikn.generators.Json()];

    const filenames = this.generators.flatMap((g) => g.filenames());
    // Compare case-insensitively so pairs like `Tokens.mjs` / `tokens.mjs`
    // are caught on case-insensitive filesystems (macOS, Windows) where
    // both writes would target the same underlying file.
    const seen = new Map<string, string>();
    const dupes: string[] = [];
    for (const filename of filenames) {
      const key = filename.toLowerCase();
      const prior = seen.get(key);
      if (prior !== undefined) {
        dupes.push(prior === filename ? filename : `${prior} / ${filename}`);
      } else {
        seen.set(key, filename);
      }
    }
    if (dupes.length > 0) {
      throw new Error(
        `Duplicate generator output filenames: ${[...new Set(dupes)].join(", ")}. Use the "filename" option to differentiate.`,
      );
    }

    const hasPrefixPlugin = plugins.some((p) => p instanceof PrefixTypePlugin);
    if (hasPrefixPlugin) {
      throw new Error(
        "PrefixTypePlugin is no longer needed — type prefixing is now built in. " +
          "Remove it from your plugins array. To opt out of prefixing, use StripTypePrefixPlugin instead.",
      );
    }
    this.plugins = plugins;
    this.themes = themes ?? [];
    this.outDir = outDir ?? process.cwd();
  }

  validate(tokens: Token[]): ValidationResult {
    return validate(tokens);
  }

  /** Run expand() on all plugins that support it, returning the expanded token set. */
  expand(tokens: Token[]): Token[] {
    let result = tokens;
    for (const plugin of this.plugins) {
      if ("expand" in plugin && typeof plugin.expand === "function") {
        try {
          result = plugin.expand(result);
        } catch (cause) {
          const { name } = plugin.constructor;
          throw new Error(`Plugin \`${name}\` threw during expand(): ${(cause as Error).message}`, {
            cause,
          });
        }
      }
    }
    return result;
  }

  /** Run audit() on all plugins that support it, returning all issues. */
  audit(tokens: Token[]): AuditIssue[] {
    const issues: AuditIssue[] = [];
    for (const plugin of this.plugins) {
      if (plugin.audit) {
        issues.push(...plugin.audit(tokens));
      }
    }
    return issues;
  }

  generateToStrings(tokens: Token[]): Map<string, string> {
    const expanded = this.expand(tokens);

    // Validate after expand so plugin-added tokens are also covered.
    // If expand plugins are disabled or add no tokens, `expanded` equals
    // the input and behavior is unchanged.
    if (this.options.validate !== false) {
      const result = validate(expanded);
      const errors = result.issues.filter((i) => i.severity === "error");
      if (errors.length > 0) {
        throw new Error(
          `Token validation failed:\n${errors.map((e) => `  ${e.token}: ${e.message}`).join("\n")}`,
        );
      }
    }

    const withThemes = applyThemes(this.themes, expanded);
    const resolved = resolveReferences(withThemes);
    const named = prefixTokenNames(resolved);

    this.generators.forEach((g) => {
      g.siblings = this.generators;
    });

    const results = new Map<string, string>();
    for (const generator of this.generators) {
      for (const [filename, content] of generator.generateFiles(named, this.plugins)) {
        results.set(filename, content);
      }
    }
    return results;
  }

  async transform(tokens: Token[]): Promise<TransformResult> {
    // generateToStrings() handles validation, so we don't duplicate it here
    const auditIssues = this.audit(tokens);
    const generated = this.generateToStrings(tokens);
    const files: TransformResult["files"] = [];
    const errors: TransformResult["errors"] = [];

    await ensureDirectory(this.outDir);
    await Promise.all(
      [...generated.entries()].map(async ([file, content]) => {
        const filename = path.resolve(this.outDir, file);
        try {
          await fs.promises.writeFile(filename, content);
          files.push({ path: filename, size: content.length });
        } catch (error) {
          errors.push({ path: filename, error });
        }
      }),
    );

    return { auditIssues, files, errors };
  }
}

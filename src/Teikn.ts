import fs from "node:fs";
import path from "node:path";

import { ensureDirectory } from "./ensure-directory";
import {
  CssVars,
  DtcgGenerator,
  EsModule,
  Generator,
  Html,
  JavaScript,
  Json,
  Scss,
  ScssVars,
  Storybook,
  TypeScript,
} from "./Generators";
import type { AuditIssue } from "./Plugins";
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
} from "./Plugins";
import { resolveReferences } from "./resolve";
import { buildKeyAliasIndex, resolveKey, tokenKey } from "./token-keys";
import type { ThemeLayer, Token, TokenValue } from "./Token";
import type { ValidationResult } from "./validate";
import { validate } from "./validate";

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
      if (resolved.status !== "ok") {
        throw new Error(`Theme "${layer.name}" could not resolve token "${name}" during apply`);
      }

      if (!modeUpdates.has(resolved.key)) {
        modeUpdates.set(resolved.key, {});
      }
      modeUpdates.get(resolved.key)![layer.name] = value;
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
  EsModule: typeof EsModule;
  Html: typeof Html;
  JavaScript: typeof JavaScript;
  Json: typeof Json;
  Scss: typeof Scss;
  ScssVars: typeof ScssVars;
  Storybook: typeof Storybook;
  TypeScript: typeof TypeScript;
} = {
  CssVars,
  Dtcg: DtcgGenerator,
  EsModule,
  Html,
  JavaScript,
  Json,
  Scss,
  ScssVars,
  Storybook,
  TypeScript,
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

    const filenames = this.generators.map((g) => g.file);
    const dupes = filenames.filter((f, i) => filenames.indexOf(f) !== i);
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
        result = plugin.expand(result);
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
    if (this.options.validate !== false) {
      const result = validate(tokens);
      const errors = result.issues.filter((i) => i.severity === "error");
      if (errors.length > 0) {
        throw new Error(
          `Token validation failed:\n${errors.map((e) => `  ${e.token}: ${e.message}`).join("\n")}`,
        );
      }
    }

    const expanded = this.expand(tokens);
    const withThemes = applyThemes(this.themes, expanded);
    const resolved = resolveReferences(withThemes);
    const named = prefixTokenNames(resolved);

    this.generators.forEach((g) => {
      g.siblings = this.generators;
    });

    const results = new Map<string, string>();
    for (const generator of this.generators) {
      results.set(generator.file, generator.generate(named, this.plugins));
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

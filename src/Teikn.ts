import fs from "node:fs";
import path from "node:path";

import { ensureDirectory } from "./ensure-directory";
import {
  CSSVars,
  DTCGGenerator,
  ESModule,
  Generator,
  HTML,
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
  SCSSQuoteValuePlugin,
  StripTypePrefixPlugin,
  TouchTargetPlugin,
} from "./Plugins";
import { resolveReferences } from "./resolve";
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

  const modeUpdates = new Map<string, Record<string, TokenValue>>();
  for (const layer of themes) {
    for (const [name, value] of Object.entries(layer.overrides)) {
      if (!modeUpdates.has(name)) {
        modeUpdates.set(name, {});
      }
      modeUpdates.get(name)![layer.name] = value;
    }
  }

  return tokens.map((token) => {
    const updates = modeUpdates.get(token.name);
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
  SCSSQuoteValuePlugin: typeof SCSSQuoteValuePlugin;
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
  SCSSQuoteValuePlugin,
  TouchTargetPlugin,
};

const BuiltInGenerators: {
  CSSVars: typeof CSSVars;
  DTCG: typeof DTCGGenerator;
  ESModule: typeof ESModule;
  HTML: typeof HTML;
  JavaScript: typeof JavaScript;
  Json: typeof Json;
  Scss: typeof Scss;
  ScssVars: typeof ScssVars;
  Storybook: typeof Storybook;
  TypeScript: typeof TypeScript;
} = {
  CSSVars,
  DTCG: DTCGGenerator,
  ESModule,
  HTML,
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
};

const severityMap = {
  info: "INFO",
  warning: "WARN",
  error: "ERROR",
};

const getLogLevel = (severity: "error" | "info" | "warning") => severityMap[severity];

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

  constructor(options: TeiknOptions) {
    const { generators, outDir, plugins = [], themes } = options;
    this.generators = generators ?? [new Teikn.generators.Json()];
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

  async transform(tokens: Token[]): Promise<void> {
    const auditIssues = this.audit(tokens);
    if (auditIssues.length > 0) {
      for (const issue of auditIssues) {
        const prefix = getLogLevel(issue.severity);
        console.warn(`[${prefix}] ${issue.token}: ${issue.message}`);
      }
    }

    const files = this.generateToStrings(tokens);

    try {
      await ensureDirectory(this.outDir);
      await Promise.all(
        [...files.entries()].map(async ([file, content]) => {
          const filename = path.resolve(this.outDir, file);
          try {
            await fs.promises.writeFile(filename, content);
            console.log(`Wrote ${filename}`);
          } catch (_) {
            console.error(`Error writing ${filename}`);
          }
        }),
      );
    } catch (error) {
      console.error(error);
    }
  }
}

import fs from 'node:fs';
import path from 'node:path';

import { ensureDirectory } from './ensure-directory.js';
import {
  CssVars,
  Dtcg,
  Generator,
  Html,
  JavaScript,
  Json,
  Scss,
  ScssVars,
  Storybook,
  TypeScript,
  TypeScriptDeclarations,
} from './Generators/index.js';
import type { AuditIssue } from './Plugins/index.js';
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
} from './Plugins/index.js';
import { resolveReferences } from './resolve.js';
import { buildKeyAliasIndex, resolveKey, tokenKey } from './token-keys.js';
import type { ThemeLayer, Token, TokenValue } from './Token.js';
import type { ValidationResult } from './validate.js';
import { validate } from './validate.js';

/**
 * Prefix each token's name with its type, joined by a hyphen.
 * Generators' nameTransformers (kebabCase, camelCase, etc.) handle final formatting.
 *
 * A linked reference (`ref(name, { link: true })`) carries the *authored* target
 * name in `token.link`. Rewrite it here to the target's final prefixed name so
 * reference-aware generators can emit the alias directly. The rewrite runs
 * against the pre-prefix key index, matching how the target's own name is
 * derived, so bare and qualified link targets both resolve.
 */
const prefixedName = (token: Token): string => `${token.type}-${token.name}`;

const prefixTokenNames = (tokens: Token[]): Token[] => {
  const finalName = prefixedName;
  const linked = tokens.some(token => token.link);

  if (!linked) {
    return tokens.map(token => ({ ...token, name: finalName(token) }));
  }

  const keyIndex = buildKeyAliasIndex(tokens.map(token => tokenKey(token)).filter(Boolean));
  const keyToFinal = new Map(tokens.map(token => [tokenKey(token), finalName(token)]));

  return tokens.map(token => {
    const name = finalName(token);

    if (!token.link) {
      return { ...token, name };
    }

    const resolved = resolveKey(token.link, keyIndex);
    // A missing/ambiguous target is already reported by validate() (which runs
    // on the pre-resolve tokens). Leave `link` untouched here so that path owns
    // the error message; generators fall back to the flattened value.
    const linkFinal = resolved.status === 'ok' ? keyToFinal.get(resolved.key) : undefined;

    return { ...token, name, link: linkFinal ?? token.link };
  });
};

/**
 * Apply theme layers to tokens, merging each layer's overrides into token.modes.
 */
const applyThemes = (themes: ThemeLayer[], tokens: Token[]): Token[] => {
  if (themes.length === 0) {
    return tokens;
  }

  const tokenKeys = buildKeyAliasIndex(tokens.map(token => tokenKey(token)).filter(Boolean));
  const modeUpdates = new Map<string, Record<string, TokenValue>>();

  for (const layer of themes) {
    for (const [name, value] of Object.entries(layer.overrides)) {
      const resolved = resolveKey(name, tokenKeys);

      switch (resolved.status) {
        case 'missing':
          throw new Error(
            `Theme "${layer.name}" references unknown token "${name}" during apply. ` +
              `The token may have been removed from the token set after the theme was created.`,
          );
        case 'ambiguous':
          // Unreachable via `theme()` (which qualifies keys at construction
          // so they hit `fullKeys` here), but kept for consumers who hand-build
          // a `ThemeLayer` literal with bare override keys against an ambiguous
          // token universe.
          throw new Error(
            `Theme "${layer.name}" override key "${name}" is ambiguous during apply. ` +
              `Matches: ${resolved.candidates.join(', ')}.`,
          );
        case 'ok':
          if (!modeUpdates.has(resolved.key)) {
            modeUpdates.set(resolved.key, {});
          }

          modeUpdates.get(resolved.key)![layer.name] = value;
          break;
      }
    }
  }

  return tokens.map(token => {
    const updates = modeUpdates.get(tokenKey(token));

    if (!updates) {
      return token;
    }

    return { ...token, modes: { ...token.modes, ...updates } };
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
  Dtcg: typeof Dtcg;
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
  Dtcg: Dtcg,
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

type PrepareArgs = { teikn: Teikn; tokens: Token[]; check: boolean };

// The token set generators and audit plugins both work from: themed, expanded
// and reference-resolved, so audits cover generated tokens and theme modes.
const prepareTokens = ({ teikn, tokens, check }: PrepareArgs): Token[] => {
  // Apply themes before expand so a theme override on a seed token is visible
  // to expand plugins as a mode — letting a ramp recompute per theme instead
  // of freezing at the default value. `theme()` already authors override keys
  // against the pre-expand token set, so this is the consistent apply point.
  const withThemes = applyThemes(teikn.themes, tokens);
  const expanded = teikn.expand(withThemes);

  // Validate after expand so plugin-added tokens (and themed modes) are also
  // covered. If expand plugins are disabled or add no tokens, `expanded`
  // equals the input and behavior is unchanged.
  if (check && teikn.options.validate !== false) {
    const result = validate(expanded);
    const errors = result.issues.filter(i => i.severity === 'error');

    if (errors.length > 0) {
      throw new Error(
        `Token validation failed:\n${errors.map(e => `  ${e.token}: ${e.message}`).join('\n')}`,
      );
    }
  }

  return resolveReferences(expanded);
};

type GenerateArgs = { teikn: Teikn; resolved: Token[] };

const generateResolved = ({ teikn, resolved }: GenerateArgs): Map<string, string> => {
  const named = prefixTokenNames(resolved);

  teikn.generators.forEach(g => {
    g.siblings = teikn.generators;
  });

  const results = new Map<string, string>();

  for (const generator of teikn.generators) {
    const declared = new Set(generator.filenames());
    const produced = generator.generateFiles(named, teikn.plugins);
    const emitted = new Set(produced.keys());

    const undeclared = [...emitted].filter(k => !declared.has(k));

    if (undeclared.length > 0) {
      throw new Error(
        `Generator \`${generator.constructor.name}\` emitted file(s) it did not declare in filenames(): ${undeclared.join(', ')}. ` +
          `This is a bug in the generator's generateFiles() implementation — declared keys and emitted keys must match.`,
      );
    }

    const missing = [...declared].filter(k => !emitted.has(k));

    if (missing.length > 0) {
      throw new Error(
        `Generator \`${generator.constructor.name}\` declared filename(s) in filenames() but did not emit them from generateFiles(): ${missing.join(', ')}. ` +
          `This is a bug in the generator's generateFiles() implementation — declared keys and emitted keys must match.`,
      );
    }

    for (const [filename, content] of produced) {
      results.set(filename, content);
    }
  }

  return results;
};

type AuditArgs = { plugins: Plugin[]; resolved: Token[] };

const auditResolved = ({ plugins, resolved }: AuditArgs): AuditIssue[] => {
  const issues: AuditIssue[] = [];

  for (const plugin of plugins) {
    if (plugin.audit) {
      issues.push(...plugin.audit(resolved));
    }
  }

  return issues;
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

    // Check intra-generator duplicates first — a single generator declaring
    // the same filename twice is a bug in that generator, not a configuration
    // problem the user can fix by setting `filename`.
    for (const g of this.generators) {
      const own = g.filenames();
      const seen = new Set<string>();
      const dupes = new Set<string>();

      for (const filename of own) {
        const key = filename.toLowerCase();

        if (seen.has(key)) {
          dupes.add(filename);
        } else {
          seen.add(key);
        }
      }

      if (dupes.size > 0) {
        throw new Error(
          `Generator \`${g.constructor.name}\` declared duplicate output filenames: ${[...dupes].join(', ')}. ` +
            `This is a bug in the generator's filenames() implementation, not user configuration.`,
        );
      }
    }

    // Then check cross-generator duplicates — those *are* user-fixable via
    // the `filename` option. Compare case-insensitively so pairs like
    // `Tokens.mjs` / `tokens.mjs` are caught on case-insensitive filesystems
    // (macOS, Windows) where both writes would target the same file.
    const seen = new Map<string, string>();
    const dupes: string[] = [];

    for (const g of this.generators) {
      for (const filename of g.filenames()) {
        const key = filename.toLowerCase();
        const prior = seen.get(key);

        if (prior !== undefined) {
          dupes.push(prior === filename ? filename : `${prior} / ${filename}`);
        } else {
          seen.set(key, filename);
        }
      }
    }

    if (dupes.length > 0) {
      throw new Error(
        `Duplicate generator output filenames: ${[...new Set(dupes)].join(', ')}. Use the "filename" option to differentiate.`,
      );
    }

    const hasPrefixPlugin = plugins.some(p => p instanceof PrefixTypePlugin);

    if (hasPrefixPlugin) {
      throw new Error(
        'PrefixTypePlugin is no longer needed — type prefixing is now built in. ' +
          'Remove it from your plugins array. To opt out of prefixing, use StripTypePrefixPlugin instead.',
      );
    }

    // Theme names become mode keys on plain objects, where `__proto__` is
    // silently swallowed rather than stored.
    if (themes?.some(t => t.name === '__proto__')) {
      throw new Error('Theme name "__proto__" is reserved. Rename the theme.');
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
      if ('expand' in plugin && typeof plugin.expand === 'function') {
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

  /**
   * Run audit() on all plugins that support it, returning all issues. Plugins
   * see reference-resolved tokens, so an alias is audited by the value it
   * points at; an unresolvable reference throws.
   */
  audit(tokens: Token[]): AuditIssue[] {
    const resolved = prepareTokens({ teikn: this, tokens, check: false });

    return auditResolved({ plugins: this.plugins, resolved });
  }

  generateToStrings(tokens: Token[]): Map<string, string> {
    const resolved = prepareTokens({ teikn: this, tokens, check: true });

    return generateResolved({ teikn: this, resolved });
  }

  async transform(tokens: Token[]): Promise<TransformResult> {
    // prepareTokens() handles validation, so we don't duplicate it here
    // Prepare once so audit sees the same themed, expanded tokens generation does.
    const resolved = prepareTokens({ teikn: this, tokens, check: true });
    const generated = generateResolved({ teikn: this, resolved });
    const auditIssues = auditResolved({ plugins: this.plugins, resolved });
    const files: TransformResult['files'] = [];
    const errors: TransformResult['errors'] = [];

    await ensureDirectory(this.outDir);
    await Promise.all(
      [...generated.entries()].map(async ([file, content]) => {
        const filename = path.resolve(this.outDir, file);

        try {
          await fs.promises.writeFile(filename, content);
          files.push({ path: filename, size: Buffer.byteLength(content, 'utf8') });
        } catch (error) {
          errors.push({ path: filename, error });
        }
      }),
    );

    return { auditIssues, files, errors };
  }
}

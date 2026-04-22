import { EOL } from "node:os";

import { version } from "../version";
import { sortPlugins } from "../Plugins/Plugin";
import type { Plugin } from "../Plugins";
import { camelCase, deriveShortName } from "../string-utils";
import type { ModeValues, Token, TokenValue } from "../Token";
import { isFirstClassValue } from "../type-classifiers";
import { matches } from "../utils";

export const applyPlugin = (plugin: Plugin, token: Token): Token => {
  const transformed = plugin.transform(token);

  if (!token.modes) {
    return transformed;
  }

  // Use transformed.modes for keys (plugin may have renamed them)
  // but run each mode value through the plugin for value transforms
  const sourceModes = transformed.modes ?? token.modes;
  const transformedModes: ModeValues = {};
  for (const [mode, modeVal] of Object.entries(sourceModes)) {
    const { modes: _, ...rest } = transformed;
    const syntheticToken = { ...rest, value: modeVal };
    transformedModes[mode] = plugin.transform(syntheticToken).value;
  }

  return { ...transformed, modes: transformedModes };
};

export type GeneratorOptions = {
  /**
   * The extension for the file
   *
   * (this is usually set when the Generator is extended)
   */
  ext: string;
  /**
   * The basename for the file
   *
   * default: `tokens`
   */
  filename?: string;
  /**
   * When true, emit typed getter functions grouped by token type
   */
  groups?: boolean;
  /**
   * Override the version string in the generated file header.
   * Useful for tests to avoid snapshot churn on version bumps.
   */
  version?: string;
};

export type RequiredGeneratorOptions = {
  ext: string;
};

export type RequiredGeneratorOptionNames = keyof RequiredGeneratorOptions;

export type GeneratorInfo = {
  format: string;
  usage: string;
};

export abstract class Generator<Opts extends GeneratorOptions = GeneratorOptions> {
  options: Opts;

  #siblings: Generator[] = [];

  constructor(opts: Opts) {
    this.options = opts;
    this.validateOptions();

    this.signature = this.signature.bind(this);
  }

  get siblings(): Generator[] {
    return this.#siblings;
  }

  set siblings(generators: Generator[]) {
    this.#siblings = generators;
  }

  describe(): GeneratorInfo | null {
    return null;
  }

  signature(): string {
    return `Teikn v${this.options.version ?? version}`;
  }

  stringifyValues(token: Token): Token {
    const { value, modes } = token;
    const convertedValue = isFirstClassValue(value)
      ? this.stringifyTokenValue(value as TokenValue)
      : value;

    if (!modes) {
      return convertedValue === value ? token : { ...token, value: convertedValue };
    }

    const convertedModes: ModeValues = {};
    let modesChanged = false;
    for (const [mode, modeVal] of Object.entries(modes)) {
      if (isFirstClassValue(modeVal)) {
        convertedModes[mode] = this.stringifyTokenValue(modeVal as TokenValue);
        modesChanged = true;
      } else {
        convertedModes[mode] = modeVal;
      }
    }

    if (convertedValue === value && !modesChanged) {
      return token;
    }
    return { ...token, value: convertedValue, modes: modesChanged ? convertedModes : modes };
  }

  stringifyValue(token: Token): Token {
    return this.stringifyValues(token);
  }

  validateOptions(): void {
    const required: RequiredGeneratorOptions = { ext: "string" };

    const errors: string[] = [];

    for (const key in required) {
      const type = typeof this.options[key as RequiredGeneratorOptionNames];
      const expected = required[key as RequiredGeneratorOptionNames];

      if (type !== expected) {
        errors.push(`Error: received option ${key} of type ${type}; expected ${expected}.`);
      }
    }

    if (errors.length) {
      throw new Error(errors.join(EOL));
    }
  }

  get file(): string {
    const { ext, filename = "tokens" } = this.options;

    if (filename.endsWith(`.${ext}`)) {
      return filename;
    }

    return `${filename}.${ext}`;
  }

  header(): string | null {
    return null;
  }

  protected commentHeader(style: "jsdoc" | "scss" = "jsdoc"): string {
    const { dateFn } = this.options as GeneratorOptions & { dateFn?: () => string | null };
    const date = dateFn ? dateFn() : null;
    if (style === "scss") {
      return [
        `///`,
        `/// ${this.signature()}`,
        date ? `/// Generated ${date}` : null,
        `///`,
        `/// This file is generated and should be commited to source control`,
        `///`,
        EOL,
      ]
        .filter(Boolean)
        .join(EOL);
    }
    return [
      `/**`,
      ` * ${this.signature()}`,
      date ? ` * Generated ${date}` : null,
      ` *`,
      ` * This file is generated and should be committed to source control`,
      ` */`,
    ]
      .filter(Boolean)
      .join(EOL);
  }

  protected buildModeMap(
    tokens: Token[],
    formatter: (key: string, val: unknown, mode: string, token: Token) => string,
  ): Map<string, string[]> {
    const { nameTransformer } = this.options as GeneratorOptions & {
      nameTransformer?: (name: string) => string;
    };
    const modeMap = new Map<string, string[]>();
    for (const token of tokens) {
      if (!token.modes) {
        continue;
      }
      const key = nameTransformer?.(token.name) ?? token.name;
      for (const [mode, val] of Object.entries(token.modes)) {
        if (!modeMap.has(mode)) {
          modeMap.set(mode, []);
        }
        modeMap.get(mode)!.push(formatter(key, val, mode, token));
      }
    }
    return modeMap;
  }

  footer(): string | null {
    return null;
  }

  /**
   * Build a map from value object identity → token name.
   * Used by reference-aware generators (CssVars, ScssVars) to emit
   * references instead of inlining values.
   */
  // oxlint-disable-next-line class-methods-use-this
  protected buildReferenceMap(tokens: Token[]): Map<unknown, string> {
    const map = new Map<unknown, string>();
    for (const token of tokens) {
      if (typeof token.value === "object" && token.value !== null && !map.has(token.value)) {
        map.set(token.value, token.name);
      }
    }
    return map;
  }

  /**
   * Stringify a single token value. Override in subclasses to add
   * reference resolution or other value transforms.
   */
  // oxlint-disable-next-line class-methods-use-this
  protected stringifyTokenValue(value: TokenValue): string {
    return String(value);
  }

  prepareTokens(tokens: Token[], plugins: Plugin[]): Token[] {
    const sorted = sortPlugins(plugins);
    return tokens
      .map((t) => this.stringifyValues(t))
      .map((token) =>
        sorted.reduce((acc, plugin) => {
          if (!matches(plugin.tokenType, token.type)) {
            return acc;
          }

          if (!matches(plugin.outputType, this.options.ext)) {
            return acc;
          }

          return applyPlugin(plugin, acc);
        }, token),
      );
  }

  protected tokenGroups(
    tokens: Token[],
  ): { groupName: string; entries: { shortName: string; token: Token }[] }[] {
    const map = new Map<string, { shortName: string; token: Token }[]>();
    for (const token of tokens) {
      const existing = map.get(token.type) ?? [];
      map.set(token.type, [
        ...existing,
        { shortName: deriveShortName(token.name, token.type), token },
      ]);
    }
    return [...map.entries()].map(([type, entries]) => ({ groupName: camelCase(type), entries }));
  }

  tokenUsage(_: Token): string | null {
    return null;
  }

  abstract generateToken(_: Token): any;

  abstract combinator(_: Token[]): string;

  generate(tokens: Token[], plugins: Plugin[] = []): string {
    return [this.header(), this.combinator(this.prepareTokens(tokens, plugins)), this.footer()]
      .filter(Boolean)
      .join(EOL)
      .trim();
  }

  /**
   * The set of filenames this generator will emit. Single-file generators
   * return [this.file]; multi-file generators (e.g. TypeScript meta)
   * override to list every file they produce.
   *
   * Called at Teikn construction time for duplicate-filename detection,
   * so it must not depend on tokens.
   */
  filenames(): string[] {
    return [this.file];
  }

  /**
   * Produce the full set of generated files keyed by filename. Default
   * implementation emits a single file at {@link file} with the output of
   * {@link generate}. Generators that emit multiple files override this.
   */
  generateFiles(tokens: Token[], plugins: Plugin[] = []): Map<string, string> {
    return new Map([[this.file, this.generate(tokens, plugins)]]);
  }
}

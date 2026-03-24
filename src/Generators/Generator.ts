import { EOL } from "node:os";

import { version } from "../version";
import { sortPlugins } from "../Plugins/Plugin";
import type { Plugin } from "../Plugins";
import { camelCase, deriveShortName } from "../string-utils";
import type { Token } from "../Token";
import { isFirstClassValue } from "../type-classifiers";
import { matches } from "../utils";

const applyPlugin = (plugin: Plugin, token: Token): Token => {
  const transformed = plugin.toJSON(token);

  if (!token.modes) {
    return transformed;
  }

  const transformedModes: Record<string, unknown> = {};
  for (const [mode, modeVal] of Object.entries(token.modes)) {
    const { modes: _, ...rest } = token;
    const syntheticToken = { ...rest, value: modeVal };
    transformedModes[mode] = plugin.toJSON(syntheticToken).value;
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

  convertColorToString(token: Token): Token {
    const { value, modes } = token;
    const convertedValue = isFirstClassValue(value)
      ? (value as { toString(): string }).toString()
      : value;

    if (!modes) {
      return convertedValue === value ? token : { ...token, value: convertedValue };
    }

    const convertedModes: Record<string, unknown> = {};
    let modesChanged = false;
    for (const [mode, modeVal] of Object.entries(modes)) {
      if (isFirstClassValue(modeVal)) {
        convertedModes[mode] = (modeVal as { toString(): string }).toString();
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
    return this.convertColorToString(token);
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

    return [filename, ext].join(".");
  }

  header(): string | null {
    return null;
  }

  footer(): string | null {
    return null;
  }

  protected prepareTokens(tokens: Token[], plugins: Plugin[]): Token[] {
    const sorted = sortPlugins(plugins);
    return tokens
      .map((t) => this.convertColorToString(t))
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
}

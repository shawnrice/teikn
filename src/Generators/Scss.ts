import { EOL } from "node:os";

import type { Plugin } from "../Plugins/index.js";
import { camelCase, deriveShortName, kebabCase } from "../string-utils.js";
import type { Token } from "../Token.js";
import type { GeneratorInfo, GeneratorOptions } from "./Generator.js";
import { Generator } from "./Generator.js";
import type { PrefixOptions } from "./prefix-utils.js";
import { composeSymbol } from "./prefix-utils.js";
import { cssMapValue } from "./value-serializers.js";

const defaultOptions = {
  ext: "scss",
  nameTransformer: kebabCase,
};

export type ScssOpts = {
  nameTransformer?: (name: string) => string;
  dateFn?: () => string | null;
} & GeneratorOptions &
  PrefixOptions;

export class Scss extends Generator<ScssOpts> {
  constructor(options = {}) {
    const opts = Object.assign({}, defaultOptions, options);
    super(opts);
  }

  override describe(): GeneratorInfo | null {
    const base = `@use '${this.options.filename ?? "tokens"}' as *;\n\n// Access tokens by name\nget-token('token-name')`;
    const groupUsage = this.options.groups
      ? `\n\n// Or use typed group accessors\ncolor('primary')`
      : "";
    return {
      format: "SCSS Map",
      usage: base + groupUsage,
    };
  }

  #emit(name: string): string {
    const { nameTransformer } = this.options;
    return composeSymbol(name, nameTransformer!, this.options);
  }

  override tokenUsage(token: Token): string | null {
    const { groups } = this.options;
    if (groups) {
      const shortName = deriveShortName(token.name, token.type);
      const groupName = camelCase(token.type);
      const groupKebab = kebabCase(groupName);
      return `${groupKebab}('${kebabCase(shortName)}')`;
    }
    return `get-token('${this.#emit(token.name)}')`;
  }

  generateToken(token: Token): string {
    const { usage, value } = token;
    const key = this.#emit(token.name);

    // prettier-ignore
    return [
      usage && `  /// ${usage}`,
      `  ${key}: ${cssMapValue(value)},`,
    ]
      .filter(Boolean)
      .join(EOL);
  }

  combinator(tokens: Token[]): string {
    const values = tokens.map((token) => this.generateToken(token));
    const lines = [`// prettier-ignore`, `$token-values: (`, values.join(EOL), `);`];

    const modeMap = this.buildModeMap(tokens, (key, val) => `    ${key}: ${cssMapValue(val)},`);

    if (modeMap.size > 0) {
      lines.push("");
      lines.push("// prettier-ignore");
      lines.push("$modes: (");
      for (const [mode, entries] of modeMap) {
        lines.push(`  ${mode}: (`);
        lines.push(...entries);
        lines.push(`  ),`);
      }
      lines.push(") !default;");
    }

    lines.push("");
    return lines.join(EOL);
  }

  override header(): string | null {
    return `${this.commentHeader("scss")}@use "sass:map";${EOL}${EOL}`;
  }

  override footer(): string | null {
    return [
      `/// Use "get-token" to access tokens by name`,
      `@function get-token($name) {`,
      `  @if not map.has-key($token-values, $name) {`,
      `    @error "Token '#{$name}' does not exist.";`,
      `  }`,
      ``,
      `  @return map.get($token-values, $name);`,
      `}`,
    ].join(EOL);
  }

  protected generateGroupBlocks(tokens: Token[]): string | null {
    if (!this.options.groups) {
      return null;
    }

    const groups = this.tokenGroups(tokens);

    return groups
      .map(({ groupName, entries }) => {
        const groupKebab = kebabCase(groupName);
        const mapEntries = entries
          .map(
            ({ shortName, token }) =>
              `  ${kebabCase(shortName)}: map.get($token-values, ${this.#emit(token.name)}),`,
          )
          .join(EOL);
        return [
          `$${groupKebab}-values: (`,
          mapEntries,
          `);`,
          "",
          `@function ${groupKebab}($name) {`,
          `  @if not map.has-key($${groupKebab}-values, $name) {`,
          `    @error "Unknown ${groupKebab} token '#{$name}'. Available: #{map.keys($${groupKebab}-values)}";`,
          `  }`,
          ``,
          `  @return map.get($${groupKebab}-values, $name);`,
          `}`,
        ].join(EOL);
      })
      .join(EOL + EOL);
  }

  override generate(tokens: Token[], plugins: Plugin[] = []): string {
    const base = super.generate(tokens, plugins);
    const prepared = this.prepareTokens(tokens, plugins);
    const groupBlocks = this.generateGroupBlocks(prepared);
    if (!groupBlocks) {
      return base;
    }
    return [base.trimEnd(), "", groupBlocks].join(EOL).trim() + EOL;
  }
}

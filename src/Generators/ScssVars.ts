import { EOL } from "node:os";

import { camelCase, deriveShortName, kebabCase } from "../string-utils";
import type { ModeValues, Token, TokenValue } from "../Token";
import { isFirstClassValue } from "../type-classifiers";
import type { Generator, GeneratorInfo } from "./Generator";
import { Scss } from "./Scss";
import { cssValue, stringifyWithRefs } from "./value-serializers";

export class ScssVars extends Scss {
  #refMap: Map<unknown, string> = new Map();

  #ref(value: unknown): string | null {
    const name = this.#refMap.get(value);
    return name ? `$${name}` : null;
  }

  protected override prepareTokens(...args: Parameters<Generator['prepareTokens']>): Token[] {
    this.#refMap = this.buildReferenceMap(args[0]);
    return super.prepareTokens(...args);
  }

  protected override stringifyTokenValue(value: TokenValue): string {
    return stringifyWithRefs(value, (v) => this.#ref(v));
  }

  override stringifyValues(token: Token): Token {
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
  override describe(): GeneratorInfo | null {
    const base = `@use '${this.options.filename ?? "tokens"}';\n\n// Access variables with namespace\ntokens.$tokenName`;
    const groupUsage = this.options.groups
      ? `\n\n// Or use typed group accessors\ntokens.color('primary')`
      : "";
    return {
      format: "SCSS Variables",
      usage: base + groupUsage,
    };
  }

  override tokenUsage(token: Token): string | null {
    const { groups } = this.options;
    if (groups) {
      const shortName = deriveShortName(token.name, token.type);
      const groupName = camelCase(token.type);
      const groupKebab = kebabCase(groupName);
      return `${groupKebab}('${kebabCase(shortName)}')`;
    }
    return `$${token.name}`;
  }

  override generateToken(token: Token): string {
    const { usage, name, value } = token;
    return [usage && `/// ${usage}`, `$${name}: ${cssValue(value)};`].filter(Boolean).join(EOL);
  }

  override combinator(tokens: Token[]): string {
    const values = tokens.map((token) => this.generateToken(token));
    const lines = [values.join(EOL)];

    const modeMap = this.buildModeMap(
      tokens,
      (_key, val, mode, token) => `$${token.name}--${mode}: ${cssValue(val)};`,
    );

    for (const [mode, entries] of modeMap) {
      lines.push("");
      lines.push(`// Mode: ${mode}`);
      lines.push(...entries);
    }

    return lines.join(EOL);
  }

  override footer(): null {
    return null;
  }

  override generateGroupBlocks(tokens: Token[]): string | null {
    if (!this.options.groups) {
      return null;
    }

    const groups = this.tokenGroups(tokens);

    return groups
      .map(({ groupName, entries }) => {
        const groupKebab = kebabCase(groupName);
        const mapEntries = entries
          .map(({ shortName, token }) => `  ${kebabCase(shortName)}: $${token.name},`)
          .join(EOL);
        return [
          `$${groupKebab}-values: (`,
          mapEntries,
          `);`,
          "",
          `@function ${groupKebab}($name) {`,
          `  @if not map-has-key($${groupKebab}-values, $name) {`,
          `    @error "Unknown ${groupKebab} token '#{$name}'. Available: #{map-keys($${groupKebab}-values)}";`,
          `  }`,
          `  @return map-get($${groupKebab}-values, $name);`,
          `}`,
        ].join(EOL);
      })
      .join(EOL + EOL);
  }
}

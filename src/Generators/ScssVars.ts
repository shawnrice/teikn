import { EOL } from "node:os";

import { camelCase, deriveShortName, kebabCase } from "../string-utils";
import type { Token } from "../Token";
import type { GeneratorInfo } from "./Generator";
import { Scss } from "./Scss";
import { cssValue } from "./value-serializers";

export class ScssVars extends Scss {
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

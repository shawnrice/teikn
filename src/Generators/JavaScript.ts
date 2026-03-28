import { EOL } from "node:os";

import { camelCase, deriveShortName } from "../string-utils";
import type { Token } from "../Token";
import { getDate } from "../utils";
import type { GeneratorInfo, GeneratorOptions } from "./Generator";
import { Generator } from "./Generator";
import { maybeQuote, quoteKey } from "./value-serializers";

const defaultOptions = {
  ext: "js",
  nameTransformer: camelCase,
  dateFn: getDate,
};

export type JavaScriptOpts = {
  dateFn?: () => string | null;
  nameTransformer?: (name: string) => string;
} & GeneratorOptions;

export class JavaScript extends Generator<JavaScriptOpts> {
  constructor(options = {}) {
    const opts = Object.assign({}, defaultOptions, options);
    super(opts);
  }

  override describe(): GeneratorInfo | null {
    const base = `const { tokens } = require('./${this.file}');\n\ntokens.tokenName`;
    const groupUsage = this.options.groups
      ? `\n\n// Or use typed group accessors\nconst { color } = require('./${this.file}');\ncolor('primary')`
      : "";
    return {
      format: "CommonJS",
      usage: base + groupUsage,
    };
  }

  override tokenUsage(token: Token): string | null {
    const { nameTransformer, groups } = this.options;
    if (groups) {
      const shortName = deriveShortName(token.name, token.type);
      const groupName = camelCase(token.type);
      return `${groupName}('${shortName}')`;
    }
    return `tokens.${nameTransformer!(token.name)}`;
  }

  override header(): string {
    return this.commentHeader();
  }

  generateToken(token: Token): string {
    const { nameTransformer } = this.options;

    return [
      `  /**`,
      token.usage && `   *  ${token.usage}`,
      `   *  Type: ${token.type}`,
      `   */`,
      `  ${nameTransformer!(token.name)}: ${maybeQuote(token.value)},`,
    ]
      .filter(Boolean)
      .join(EOL);
  }

  combinator(tokens: Token[]): string {
    const { nameTransformer, groups } = this.options;
    const values = tokens.map((t) => this.generateToken(t));
    const parts = [
      "const tokens = {",
      values
        .map((token, index, arr) => (index === arr.length - 1 ? token.slice(0, -1) : token))
        .join(EOL),
      "};",
    ];

    const exportNames = ["tokens"];

    if (groups) {
      const groupBlocks = this.tokenGroups(tokens).map(({ groupName, entries }) => {
        exportNames.push(groupName);
        const mapEntries = entries
          .map(
            ({ shortName, token }) =>
              `  ${quoteKey(shortName)}: tokens.${nameTransformer!(token.name)},`,
          )
          .join(EOL);
        return [
          `const _${groupName} = {`,
          mapEntries,
          `};`,
          `const ${groupName} = (name) => {`,
          `  if (!(name in _${groupName})) throw new Error(\`Unknown ${groupName} token: \${name}\`);`,
          `  return _${groupName}[name];`,
          `};`,
        ].join(EOL);
      });
      parts.push("", ...groupBlocks);
    }

    const modeMap = this.buildModeMap(tokens, (key, val) => `    ${key}: ${maybeQuote(val)},`);

    if (modeMap.size > 0) {
      const modeEntries = [...modeMap.entries()].map(([mode, entries]) =>
        [`  ${quoteKey(mode)}: {`, ...entries, `  },`].join(EOL),
      );
      parts.push("", `const modes = {`, ...modeEntries, `};`);
      exportNames.push("modes");
    }

    const exportsStr = exportNames.map((n) => `${n}: ${n}`).join(", ");
    parts.push("", `module.exports = { ${exportsStr}, default: tokens };`);
    return parts.join(EOL);
  }
}

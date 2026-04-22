import { EOL } from "node:os";

import { camelCase, deriveShortName } from "../string-utils";
import type { Token } from "../Token";
import { getDate } from "../utils";
import type { GeneratorInfo, GeneratorOptions } from "./Generator";
import { Generator } from "./Generator";
import { maybeQuote, quoteKey } from "./value-serializers";

export type JavaScriptModule = "esm" | "cjs";

export type JavaScriptOpts = {
  dateFn?: () => string | null;
  nameTransformer?: (name: string) => string;
  /**
   * Module system for the emitted runtime.
   *
   * - `"esm"` (default) → `export const tokens = {...}` with `.mjs` extension
   * - `"cjs"` → `module.exports = { tokens, ... }` with `.cjs` extension
   */
  module?: JavaScriptModule;
} & GeneratorOptions;

const defaultExt = (module: JavaScriptModule): string => (module === "cjs" ? "cjs" : "mjs");

/**
 * Emit tokens as a JavaScript module. Defaults to ESM (`.mjs`); pass
 * `module: "cjs"` for CommonJS (`.cjs`). Extensions are derived from
 * the module system but can be overridden via `ext`.
 */
export class JavaScript extends Generator<JavaScriptOpts> {
  constructor(options: Partial<JavaScriptOpts> = {}) {
    const moduleKind = options.module ?? "esm";
    super({
      nameTransformer: camelCase,
      dateFn: getDate,
      module: moduleKind,
      ext: defaultExt(moduleKind),
      ...options,
    });
  }

  override describe(): GeneratorInfo {
    const { module: moduleKind } = this.options;
    const isCjs = moduleKind === "cjs";
    const importStmt = isCjs
      ? `const { tokens } = require('./${this.file}');`
      : `import { tokens } from './${this.file}';`;
    const base = `${importStmt}\n\ntokens.tokenName`;
    const groupImport = isCjs
      ? `const { color } = require('./${this.file}');`
      : `import { color } from './${this.file}';`;
    const groupUsage = this.options.groups
      ? `\n\n// Or use typed group accessors\n${groupImport}\ncolor('primary')`
      : "";
    return {
      format: isCjs ? "CommonJS" : "ES Module",
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
    const key = quoteKey(nameTransformer!(token.name));

    return [
      `  /**`,
      token.usage && `   *  ${token.usage}`,
      `   *  Type: ${token.type}`,
      `   */`,
      `  ${key}: ${maybeQuote(token.value)},`,
    ]
      .filter(Boolean)
      .join(EOL);
  }

  combinator(tokens: Token[]): string {
    const { nameTransformer, groups, module: moduleKind } = this.options;
    const isCjs = moduleKind === "cjs";
    const decl = isCjs ? "const" : "export const";

    const values = tokens.map((t) => this.generateToken(t));
    const parts = [`${decl} tokens = {`, values.join(EOL), "};"];

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
          `${decl} ${groupName} = (name) => {`,
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
      parts.push("", `${decl} modes = {`, ...modeEntries, `};`);
      exportNames.push("modes");
    }

    if (isCjs) {
      const exportsStr = exportNames.map((n) => `${n}: ${n}`).join(", ");
      parts.push("", `module.exports = { ${exportsStr}, default: tokens };`);
    } else {
      parts.push("", `export default tokens;`);
    }

    return parts.join(EOL);
  }
}

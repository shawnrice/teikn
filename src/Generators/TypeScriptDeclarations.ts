import { EOL } from "node:os";

import { camelCase, deriveShortName } from "../string-utils.js";
import type { Token } from "../Token.js";
import { isFirstClassValue } from "../type-classifiers.js";
import { getDate } from "../utils.js";
import type { GeneratorInfo, GeneratorOptions } from "./Generator.js";
import { Generator } from "./Generator.js";
import { quoteKey } from "./value-serializers.js";

/**
 * Produce a TypeScript type annotation for a token value. Narrow by
 * default (literal types like `"#0066cc"`, `16`, `true`); widened to
 * the primitive type family (`string`, `number`, `boolean`) when
 * `loose` is true.
 */
const toTypeAnnotation = (value: unknown, loose: boolean): string => {
  if (value === null) {
    return "null";
  }
  if (typeof value === "object" && !Array.isArray(value)) {
    // First-class values (Color, Dimension, etc.) stringify to string.
    if (isFirstClassValue(value)) {
      return "string";
    }
    const fields = Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => `readonly ${quoteKey(k)}: ${toTypeAnnotation(v, loose)}`)
      .join("; ");
    return `{ ${fields} }`;
  }
  if (loose) {
    return typeof value;
  }
  if (typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return typeof value;
};

const defaultOptions = {
  ext: "d.ts",
  nameTransformer: camelCase,
  dateFn: getDate,
};

export type TypeScriptDeclarationsOpts = {
  dateFn?: () => string | null;
  nameTransformer?: (name: string) => string;
  /**
   * When true, emit widened types (`string`, `number`, `boolean`) instead
   * of literal types. Default: `false`.
   *
   * Narrow literal types enable exhaustive unions like
   * `type TokenColor = typeof tokens[keyof typeof tokens]`.
   */
  loose?: boolean;
} & GeneratorOptions;

/**
 * Emit TypeScript ambient declarations (`.d.ts`) for tokens. Pair with
 * `JavaScript` for runtime output, or use the `TypeScript` meta
 * generator to produce both at once from a single construction.
 */
export class TypeScriptDeclarations extends Generator<TypeScriptDeclarationsOpts> {
  constructor(options: Partial<TypeScriptDeclarationsOpts> = {}) {
    super({ ...defaultOptions, ...options });
  }

  override describe(): GeneratorInfo {
    const base = this.options.filename ?? "tokens";
    const groupUsage = this.options.groups
      ? `\n\n// Or use typed group accessors\nimport { color } from './${base}.js';\ncolor('primary') // compile-time checked`
      : "";
    return {
      format: "TypeScript Declarations",
      usage: `import { tokens } from './${base}.js';\n\n// Pair with JavaScript runtime output, or use the TypeScript meta generator${groupUsage}`,
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
    return [this.commentHeader(), EOL, `/**`, ` * Design tokens`, ` */`].join(EOL);
  }

  generateToken(token: Token): string {
    const { nameTransformer, loose } = this.options;
    const key = quoteKey(nameTransformer!(token.name));
    const typeAnnotation = toTypeAnnotation(token.value, loose || false);

    return [
      `  /**`,
      token.usage && `   *  ${token.usage}`,
      `   *  Type: ${token.type}`,
      `   */`,
      `  readonly ${key}: ${typeAnnotation};`,
    ]
      .filter(Boolean)
      .join(EOL);
  }

  combinator(tokens: Token[]): string {
    const values = tokens.map((t) => this.generateToken(t));
    const parts = ["export declare const tokens: {", values.join(EOL), "};"];

    const groups = this.tokenGroups(tokens);
    if (groups.length > 0) {
      const { nameTransformer } = this.options;
      const fields = groups.map(({ groupName, entries }) => {
        const names = entries.map(({ token }) => `'${nameTransformer!(token.name)}'`).join(" | ");
        const typeName = groupName.charAt(0).toUpperCase() + groupName.slice(1);
        return `  ${typeName}: ${names};`;
      });
      const allUnion = groups
        .map(
          ({ groupName }) =>
            `TokenNames['${groupName.charAt(0).toUpperCase() + groupName.slice(1)}']`,
        )
        .join(" | ");
      fields.push(`  All: ${allUnion};`);
      parts.push("", `export type TokenNames = {`, ...fields, `};`);
    }

    if (this.options.groups) {
      const groupDecls = groups.map(({ groupName, entries }) => {
        const union = entries.map(({ shortName }) => `'${shortName}'`).join(" | ");
        return `export declare const ${groupName}: (name: ${union}) => string;`;
      });
      parts.push("", ...groupDecls);
    }

    const modeNames = new Set<string>();
    for (const token of tokens) {
      if (token.modes) {
        for (const mode of Object.keys(token.modes)) {
          modeNames.add(mode);
        }
      }
    }

    if (modeNames.size > 0) {
      const modeEntries = [...modeNames].map(
        (mode) => `  readonly ${quoteKey(mode)}: Partial<typeof tokens>;`,
      );
      parts.push("", `export declare const modes: {`, ...modeEntries, `};`);
    }

    return parts.join(EOL);
  }

  override footer(): string {
    return `export default tokens;`;
  }
}

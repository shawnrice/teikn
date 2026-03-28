import { EOL } from "node:os";

import { camelCase, deriveShortName } from "../string-utils";
import type { Token } from "../Token";
import { isFirstClassValue } from "../type-classifiers";
import { getDate } from "../utils";
import type { GeneratorInfo, GeneratorOptions } from "./Generator";
import { Generator } from "./Generator";

const isValidIdentifier = (name: string): boolean => /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name);

const quoteKey = (name: string): string => (isValidIdentifier(name) ? name : `'${name}'`);

const toTypeAnnotation = (value: unknown): string => {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    // First-class values (Color, Dimension, etc.) stringify to string
    if (isFirstClassValue(value)) {
      return "string";
    }
    const fields = Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => `${quoteKey(k)}: ${toTypeAnnotation(v)}`)
      .join("; ");
    return `{ ${fields} }`;
  }
  return typeof value;
};

const defaultOptions = {
  ext: "d.ts",
  nameTransformer: camelCase,
  dateFn: getDate,
};

export type TypeScriptOpts = {
  /**
   * The function to get the build date
   */
  dateFn?: () => string | null;
  /**
   * The function to transform the name of the token
   *
   * default: `camelCase`
   */
  nameTransformer?: (name: string) => string;
} & GeneratorOptions;

export class TypeScript extends Generator<TypeScriptOpts> {
  constructor(options = {}) {
    super(Object.assign({}, defaultOptions, options));
  }

  override describe(): GeneratorInfo | null {
    const base = this.options.filename ?? "tokens";
    const groupUsage = this.options.groups
      ? `\n\n// Or use typed group accessors\nimport { color } from './${base}';\ncolor('primary') // compile-time checked`
      : "";
    return {
      format: "TypeScript Declarations",
      usage: `import { tokens } from './${base}';\n\n// Pair with ES Module or CommonJS output for runtime values${groupUsage}`,
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
    const { nameTransformer } = this.options;

    const typeAnnotation = toTypeAnnotation(token.value);

    return [
      `  /**`,
      token.usage && `   *  ${token.usage}`,
      `   *  Type: ${token.type}`,
      `   */`,
      `  ${nameTransformer!(token.name)}: ${typeAnnotation},`,
    ]
      .filter(Boolean)
      .join(EOL);
  }

  combinator(tokens: Token[]): string {
    const values = tokens.map((t) => this.generateToken(t));
    const parts = [
      "export const tokens: {",
      values
        .map((token, index, arr) => (index === arr.length - 1 ? token.slice(0, -1) : token))
        .join(EOL),
      "}",
    ];

    // Token name union types grouped under a single namespace type
    const groups = this.tokenGroups(tokens);
    if (groups.length > 0) {
      const { nameTransformer } = this.options;
      const fields = groups.map(({ groupName, entries }) => {
        const names = entries.map(({ token }) => `'${nameTransformer!(token.name)}'`).join(" | ");
        const typeName = groupName.charAt(0).toUpperCase() + groupName.slice(1);
        return `  ${typeName}: ${names};`;
      });
      const allUnion = groups
        .map(({ groupName }) => `TokenNames['${groupName.charAt(0).toUpperCase() + groupName.slice(1)}']`)
        .join(" | ");
      fields.push(`  All: ${allUnion};`);
      parts.push("", `export type TokenNames = {`, ...fields, `};`);
    }

    if (this.options.groups) {
      const groupDecls = groups.map(({ groupName, entries }) => {
        const union = entries.map(({ shortName }) => `'${shortName}'`).join(" | ");
        return `export const ${groupName}: (name: ${union}) => string;`;
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
        (mode) => `  ${quoteKey(mode)}: Partial<typeof tokens>;`,
      );
      parts.push("", `export const modes: {`, ...modeEntries, `}`);
    }

    return parts.join(EOL);
  }

  override footer(): string {
    return `export default tokens;`;
  }
}

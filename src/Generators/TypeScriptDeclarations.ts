import { EOL } from 'node:os';

import { camelCase, deriveShortName } from '../string-utils.js';
import type { Token } from '../Token.js';
import { isFirstClassValue } from '../type-classifiers.js';
import type { GeneratorInfo, GeneratorOptions } from './Generator.js';
import { Generator } from './Generator.js';
import type { JavaScriptModule } from './JavaScript.js';
import { jsDocLines, unusableExportName } from './js-emit.js';
import { quoteKey, quoteString } from './value-serializers.js';

/**
 * Produce a TypeScript type annotation for a token value. Narrow by
 * default (literal types like `"#0066cc"`, `16`, `true`); widened to
 * the primitive type family (`string`, `number`, `boolean`) when
 * `loose` is true.
 */
const toTypeAnnotation = (value: unknown, loose: boolean): string => {
  if (value === null) {
    return 'null';
  }

  if (typeof value === 'object' && !Array.isArray(value)) {
    // First-class values (Color, Dimension, etc.) stringify to string.
    if (isFirstClassValue(value)) {
      return 'string';
    }

    const fields = Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => `readonly ${quoteKey(k)}: ${toTypeAnnotation(v, loose)}`)
      .join('; ');

    return `{ ${fields} }`;
  }

  if (loose) {
    return typeof value;
  }

  if (typeof value === 'string') {
    return quoteString(value);
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return typeof value;
};

const defaultOptions = { ext: 'd.ts', nameTransformer: camelCase };

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
  /**
   * Pair the declarations file with a specific runtime module format. When
   * set to `"cjs"`, emit `.d.cts` instead of `.d.ts` so Node's strict
   * ESM/CJS resolvers (`moduleResolution: "node16" | "bundler"`) pick up
   * the declarations alongside the `.cjs` runtime file. Likewise `"esm"`
   * emits `.d.mts` to pair with the `.mjs` runtime. Unset: plain `.d.ts`.
   */
  module?: JavaScriptModule;
} & GeneratorOptions;

/**
 * Emit TypeScript ambient declarations (`.d.ts`) for tokens. Pair with
 * `JavaScript` for runtime output, or use the `TypeScript` meta
 * generator to produce both at once from a single construction.
 */
export class TypeScriptDeclarations extends Generator<TypeScriptDeclarationsOpts> {
  constructor(options: Partial<TypeScriptDeclarationsOpts> = {}) {
    const ext = { cjs: 'd.cts', esm: 'd.mts', none: 'd.ts' }[options.module ?? 'none'];
    super({ ...defaultOptions, ...options, ext });
  }

  override describe(): GeneratorInfo {
    const base = this.options.filename ?? 'tokens';
    const groupUsage = this.options.groups
      ? `\n\n// Or use typed group accessors\nimport { color } from './${base}.js';\ncolor('primary') // compile-time checked`
      : '';

    return {
      format: 'TypeScript Declarations',
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
    const deprecationTag = token.deprecated
      ? `   *  @deprecated${token.replacement ? ` use \`${nameTransformer!(token.replacement)}\` instead` : ''}`
      : null;

    return [
      `  /**`,
      ...(token.usage ? jsDocLines(token.usage) : []),
      `   *  Type: ${token.type}`,
      deprecationTag,
      `   */`,
      `  readonly ${key}: ${typeAnnotation};`,
    ]
      .filter(Boolean)
      .join(EOL);
  }

  // `TokenNames` is keyed by type whether or not `groups` is on.
  protected override typeIdentifiers(
    tokens: Token[],
  ): { name: string; type: string; problem?: string | null }[] {
    const accessor = this.options.groups ? unusableExportName : () => null;

    return this.tokenGroups(tokens).map(({ groupName: name, type }) => ({
      name,
      type,
      problem:
        name === 'all'
          ? 'is the `TokenNames.All` key, reserved for the union of every group'
          : accessor(name),
    }));
  }

  combinator(tokens: Token[]): string {
    const values = tokens.map(t => this.generateToken(t));
    const parts = ['export declare const tokens: {', values.join(EOL), '};'];

    const groups = this.tokenGroups(tokens);

    if (groups.length > 0) {
      const { nameTransformer } = this.options;
      const fields = groups.map(({ groupName, entries }) => {
        const names = entries
          .map(({ token }) => quoteString(nameTransformer!(token.name)))
          .join(' | ');
        const typeName = groupName.charAt(0).toUpperCase() + groupName.slice(1);

        return `  ${quoteKey(typeName)}: ${names};`;
      });
      const allUnion = groups
        .map(
          ({ groupName }) =>
            `TokenNames[${quoteString(groupName.charAt(0).toUpperCase() + groupName.slice(1))}]`,
        )
        .join(' | ');
      fields.push(`  All: ${allUnion};`);
      parts.push('', `export type TokenNames = {`, ...fields, `};`);
    }

    if (this.options.groups) {
      const groupDecls = groups.map(({ groupName, entries }) => {
        const union = entries.map(({ shortName }) => quoteString(shortName)).join(' | ');
        // The accessor does a runtime lookup, so the return can't be narrowed
        // to a specific value per name — widen to the primitive type(s)
        // (`string`, `number`, or a union for a mixed group) rather than emit a
        // large, non-narrowing literal union. Precise literals stay available
        // on the `tokens` object for static access. `toTypeAnnotation(_, true)`
        // forces the widened form regardless of the generator's `loose` option.
        const returnType = [
          ...new Set(entries.map(({ token }) => toTypeAnnotation(token.value, true))),
        ].join(' | ');

        return `export declare const ${groupName}: (name: ${union}) => ${returnType};`;
      });
      parts.push('', ...groupDecls);
    }

    // Mode overrides are partial, so every key is optional; the value types are
    // the mode's own (not the base token's).
    const modeMap = this.buildModeMap(
      tokens,
      (key, val) =>
        `    readonly ${quoteKey(key)}?: ${toTypeAnnotation(val, this.options.loose || false)};`,
    );

    if (modeMap.size > 0) {
      const modeEntries = [...modeMap.entries()].flatMap(([mode, entries]) => [
        `  readonly ${quoteKey(mode)}: {`,
        ...entries,
        `  };`,
      ]);
      parts.push('', `export declare const modes: {`, ...modeEntries, `};`);
    }

    return parts.join(EOL);
  }

  override footer(): string {
    return `export default tokens;`;
  }
}

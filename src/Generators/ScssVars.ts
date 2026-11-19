import { EOL } from 'node:os';

import { camelCase, deriveShortName, kebabCase } from '../string-utils.js';
import type { Token, TokenValue } from '../Token.js';
import { Typography } from '../TokenTypes/Typography.js';
import type { Generator, GeneratorInfo } from './Generator.js';
import { composeSymbol } from './prefix-utils.js';
import { Scss } from './Scss.js';
import {
  isSassIdentifier,
  sassLines,
  sassValue,
  stringifyWithRefs,
  valueDependencies,
} from './value-serializers.js';

const topoSort = (tokens: Token[], refMap: Map<unknown, string>): Token[] => {
  const byName = new Map(tokens.map(t => [t.name, t]));
  const deps = new Map<string, string[]>();

  for (const token of tokens) {
    // A linked ref emits `$target`, so the target's `$var` must be declared
    // first — treat `link` as a dependency alongside any in-value refs.
    const valueDeps = valueDependencies(token.value, refMap);
    deps.set(token.name, token.link ? [...valueDeps, token.link] : valueDeps);
  }

  const sorted: Token[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  const visit = (name: string) => {
    if (visited.has(name)) {
      return;
    }

    if (visiting.has(name)) {
      return; // cycle — skip silently (shouldn't happen with identity refs)
    }

    visiting.add(name);

    for (const dep of deps.get(name) ?? []) {
      visit(dep);
    }

    visiting.delete(name);
    visited.add(name);
    const token = byName.get(name);

    if (token) {
      sorted.push(token);
    }
  };

  for (const token of tokens) {
    visit(token.name);
  }

  return sorted;
};

export class ScssVars extends Scss {
  #refMap: Map<unknown, string> = new Map();

  #ref(value: unknown): string | null {
    const name = this.#refMap.get(value);

    return name ? `$${this.#emit(name)}` : null;
  }

  // ScssVars (unlike CssVars) does not currently apply nameTransformer to
  // emitted variable names — `$colorPrimary` stays camelCase. We pass an
  // identity transform here so the prefix composes with the name as-is and
  // existing snapshots remain stable.
  #emit(name: string): string {
    // Anything Sass cannot read in a variable name (space, slash, quote) becomes `-`.
    const variable = composeSymbol(name, s => s, this.options).replace(
      /[^\w\u0080-\u{10ffff}-]+/gu,
      '-',
    );

    // A leading digit is not renamed: `$2xl` has no predictable valid spelling.
    if (!isSassIdentifier(variable)) {
      throw new Error(
        `ScssVars: token "${name}" would emit $${variable}, which Sass cannot read as a variable name. ` +
          'Rename the token or set a `prefix`.',
      );
    }

    return variable;
  }

  override prepareTokens(...args: Parameters<Generator['prepareTokens']>): Token[] {
    // Run plugins first so the refMap captures any name changes (e.g., from
    // NameConventionPlugin). Otherwise references inside composed values
    // (Transition, BoxShadow) point at the pre-rename names while the
    // variable definitions emit the post-rename names — broken output.
    const transformed = this.remapLinks(args[0], this.applyPluginPipeline(args[0], args[1]));
    this.#refMap = this.buildReferenceMap(transformed);
    const sorted = topoSort(transformed, this.#refMap);

    return sorted.map(t => this.stringifyValues(t));
  }

  protected override stringifyTokenValue(value: TokenValue): string {
    // Sass would divide `$size/1.5`, so a typography's font size is interpolated.
    if (value instanceof Typography) {
      return stringifyWithRefs(value, v => {
        const reference = this.#ref(v);

        return reference && `#{${reference}}`;
      });
    }

    return stringifyWithRefs(value, v => this.#ref(v));
  }

  override describe(): GeneratorInfo | null {
    const base = `@use '${this.options.filename ?? 'tokens'}';\n\n// Access variables with namespace\ntokens.$tokenName`;
    const groupUsage = this.options.groups
      ? `\n\n// Or use typed group accessors\ntokens.color('primary')`
      : '';

    return { format: 'SCSS Variables', usage: base + groupUsage };
  }

  override tokenUsage(token: Token): string | null {
    const { groups } = this.options;

    if (groups) {
      const shortName = deriveShortName(token.name, token.type);
      const groupName = camelCase(token.type);
      const groupKebab = kebabCase(groupName);

      return `${groupKebab}('${kebabCase(shortName)}')`;
    }

    return `$${this.#emit(token.name)}`;
  }

  override generateToken(token: Token): string {
    const { usage, value, link } = token;
    // A linked ref (`ref(name, { link: true })`) emits a `$target` alias so the
    // variable tracks the target instead of baking in its resolved value.
    const rhs = link ? `$${this.#emit(link)}` : sassValue(value) || '""';
    const docs = usage ? sassLines(usage).map(line => `/// ${line}`) : [];

    return [...docs, `$${this.#emit(token.name)}: ${rhs};`].join(EOL);
  }

  // A later `$name:` silently overwrites an earlier one, so two sources
  // emitting the same variable is an error rather than a lost value.
  #declared: Map<string, { variable: string; source: string }> = new Map();

  #declare(variable: string, source: string): string {
    // Sass reads `_` and `-` as the same character in a variable name.
    const key = variable.replace(/_/g, '-');
    const existing = this.#declared.get(key);

    if (existing) {
      const hint =
        existing.variable === variable ? '' : ' (Sass reads `_` and `-` as the same character)';

      throw new Error(
        `ScssVars: ${source} and ${existing.source} both emit $${key}${hint}. Rename one of them.`,
      );
    }

    this.#declared.set(key, { variable, source });

    return variable;
  }

  override combinator(tokens: Token[]): string {
    const values = tokens.map(token => this.generateToken(token));
    const lines = [values.join(EOL)];

    this.#declared = new Map();
    tokens.forEach(token => this.#declare(this.#emit(token.name), `token "${token.name}"`));

    const { separator = '-' } = this.options;
    const modeMap = this.buildModeMap(tokens, (_key, val, mode, token) => {
      const variable = this.#declare(
        this.#emit(`${token.name}${separator}${mode}`),
        `mode "${mode}" of token "${token.name}"`,
      );

      return `$${variable}: ${sassValue(val) || '""'};`;
    });

    for (const [mode, entries] of modeMap) {
      lines.push('');
      lines.push(`// Mode: ${sassLines(mode).join(' ')}`);
      lines.push(...entries);
    }

    return lines.join(EOL);
  }

  override footer(): null {
    return null;
  }

  override header(): string | null {
    const base = this.commentHeader('scss');

    if (this.options.groups) {
      return `${base}@use "sass:map";${EOL}${EOL}`;
    }

    return base;
  }

  override generateGroupBlocks(tokens: Token[]): string | null {
    if (!this.options.groups) {
      return null;
    }

    const groups = this.tokenGroups(tokens);

    return groups
      .map(({ groupName, type, entries }) => {
        const groupKebab = kebabCase(groupName);
        this.#declare(`${groupKebab}-values`, `the "${type}" group map`);
        const mapEntries = entries
          .map(({ shortName, token }) => `  '${kebabCase(shortName)}': $${this.#emit(token.name)},`)
          .join(EOL);

        return [
          `$${groupKebab}-values: (`,
          mapEntries,
          `);`,
          '',
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
}

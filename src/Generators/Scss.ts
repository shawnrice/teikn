import { EOL } from 'os';

import type { Plugin } from '../Plugins';
import { camelCase, deriveShortName, kebabCase } from '../string-utils';
import type { Token } from '../Token';
import { getDate } from '../utils';
import type { GeneratorOptions } from './Generator';
import Generator from './Generator';

const scssValue = (value: unknown): string => {
  if (typeof value !== 'object' || value === null) { return String(value); }
  const obj = value as Record<string, unknown>;
  if ('width' in obj && 'style' in obj && 'color' in obj) {
    return [obj.width, obj.style, obj.color].filter(Boolean).join(' ');
  }
  return Object.values(obj).join(' ');
};

const defaultOptions = {
  ext: 'scss',
  nameTransformer: kebabCase,
  dateFn: getDate,
};

export interface ScssOpts extends GeneratorOptions {
  nameTransformer?: (name: string) => string;
  dateFn?: () => string | null;
}

export class Scss extends Generator<ScssOpts> {
  constructor(options = {}) {
    const opts = Object.assign({}, defaultOptions, options);
    super(opts);
  }

  override describe() {
    const base = `@use '${this.options.filename ?? 'tokens'}' as *;\n\n// Access tokens by name\nget-token('token-name')`;
    const groupUsage = this.options.groups
      ? `\n\n// Or use typed group accessors\ncolor('primary')`
      : '';
    return {
      format: 'SCSS Map',
      usage: base + groupUsage,
    };
  }

  override tokenUsage(token: Token): string | null {
    const { nameTransformer, groups } = this.options;
    if (groups) {
      const shortName = deriveShortName(token.name, token.type);
      const groupName = camelCase(token.type);
      const groupKebab = kebabCase(groupName);
      return `${groupKebab}('${kebabCase(shortName)}')`;
    }
    return `get-token('${nameTransformer!(token.name)}')`;
  }

  generateToken(token: Token): string {
    const { nameTransformer } = this.options;

    const { usage, value } = token;
    const key = nameTransformer!(token.name);

    // prettier-ignore
    return [
      usage && `  /// ${usage}`,
      `  ${key}: ${scssValue(value)},`,
    ]
      .filter(Boolean)
      .join(EOL);
  }

  combinator(tokens: Token[]): string {
    const values = tokens.map(token => this.generateToken(token));
    return [`// prettier-ignore`, `$token-values: (`, values.join(EOL), `);`, EOL].join(EOL);
  }

  override header(): string | null {
    const { dateFn } = this.options;

    return [
      `///`,
      `/// ${this.signature()}`,
      `/// Generated ${dateFn!()}`,
      `///`,
      `/// This file is generated and should be commited to source control`,
      `///`,
      EOL,
    ].join(EOL);
  }

  override footer(): string | null {
    return [
      `/// Use "get-token" to access tokens by name`,
      `@function get-token($name) {`,
      `  @if (not map-has-key($token-values, $name)) {`,
      `    @error "Token '#{$name}' does not exist.";`,
      `  }`,
      `  @return map-get($token-values, $name);`,
      `}`,
    ].join(EOL);
  }

  protected generateGroupBlocks(tokens: Token[]): string | null {
    if (!this.options.groups) {
      return null;
    }

    const { nameTransformer } = this.options;
    const groups = this.tokenGroups(tokens);

    return groups
      .map(({ groupName, entries }) => {
        const groupKebab = kebabCase(groupName);
        const mapEntries = entries
          .map(({ shortName, token }) => `  ${kebabCase(shortName)}: map-get($token-values, ${nameTransformer!(token.name)}),`)
          .join(EOL);
        return [
          `$${groupKebab}-values: (`,
          mapEntries,
          `);`,
          '',
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

  override generate(tokens: Token[], plugins: Plugin[] = []): string {
    const base = super.generate(tokens, plugins);
    const prepared = this.prepareTokens(tokens, plugins);
    const groupBlocks = this.generateGroupBlocks(prepared);
    if (!groupBlocks) {
      return base;
    }
    return [base, '', groupBlocks].join(EOL).trim();
  }
}

export default Scss;

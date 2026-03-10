import { EOL } from 'os';

import { camelCase, deriveShortName } from '../string-utils';
import type { Token } from '../Token';
import { getDate } from '../utils';
import type { GeneratorInfo, GeneratorOptions } from './Generator';
import { Generator } from './Generator';

const defaultOptions = {
  ext: 'mjs',
  nameTransformer: camelCase,
  dateFn: getDate,
};

const maybeQuote = (val: any): string => {
  if (typeof val === 'string') { return `'${val}'`; }
  if (typeof val === 'object' && val !== null) { return JSON.stringify(val); }
  return String(val);
};

const isValidIdentifier = (name: string): boolean => /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name);

const quoteKey = (name: string): string => isValidIdentifier(name) ? name : `'${name}'`;

export type ESModuleOpts = {
  dateFn?: () => string | null;
  nameTransformer?: (name: string) => string;
} & GeneratorOptions

/**
 * Generates tokens as an ES Module
 */
export class ESModule extends Generator<ESModuleOpts> {
  constructor(options = {}) {
    super(Object.assign({}, defaultOptions, options));
  }

  override describe(): GeneratorInfo | null {
    const base = `import { tokens } from './${this.file}';\n\ntokens.tokenName`;
    const groupUsage = this.options.groups
      ? `\n\n// Or use typed group accessors\nimport { color } from './${this.file}';\ncolor('primary')`
      : '';
    return {
      format: 'ES Module',
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
    const { dateFn } = this.options;

    return [
      `/**`,
      ` * ${this.signature()}`,
      ` * Generated ${dateFn!()}`,
      ` *`,
      ` * This file is generated and should be commited to source control`,
      ` *`,
      ` */`,
    ].join(EOL);
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
    const values = tokens.map(t => this.generateToken(t));
    const parts = ['export const tokens = {', values.join(EOL), '};'];

    if (groups) {
      const groupBlocks = this.tokenGroups(tokens).map(({ groupName, entries }) => {
        const mapEntries = entries
          .map(({ shortName, token }) => `  ${quoteKey(shortName)}: tokens.${nameTransformer!(token.name)},`)
          .join(EOL);
        return [
          `const _${groupName} = {`,
          mapEntries,
          `};`,
          `export const ${groupName} = (name) => {`,
          `  if (!(name in _${groupName})) throw new Error(\`Unknown ${groupName} token: \${name}\`);`,
          `  return _${groupName}[name];`,
          `};`,
        ].join(EOL);
      });
      parts.push('', ...groupBlocks);
    }

    const modeMap = new Map<string, string[]>();
    for (const token of tokens) {
      if (!token.modes) { continue; }
      for (const [mode, val] of Object.entries(token.modes)) {
        if (!modeMap.has(mode)) { modeMap.set(mode, []); }
        modeMap.get(mode)!.push(`    ${nameTransformer!(token.name)}: ${maybeQuote(val)},`);
      }
    }

    if (modeMap.size > 0) {
      const modeEntries = [...modeMap.entries()].map(([mode, entries]) =>
        [`  ${quoteKey(mode)}: {`, ...entries, `  },`].join(EOL),
      );
      parts.push('', `export const modes = {`, ...modeEntries, `};`);
    }

    parts.push('', `export default tokens;`);
    return parts.join(EOL);
  }
}

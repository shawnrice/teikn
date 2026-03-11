import { EOL } from 'os';

import { camelCase, deriveShortName } from '../string-utils';
import type { Token } from '../Token';
import { getDate } from '../utils';
import type { GeneratorInfo, GeneratorOptions } from './Generator';
import { Generator } from './Generator';

const isValidIdentifier = (name: string): boolean => /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name);

const quoteKey = (name: string): string => (isValidIdentifier(name) ? name : `'${name}'`);

const defaultOptions = {
  ext: 'd.ts',
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
    const base = this.options.filename ?? 'tokens';
    const groupUsage = this.options.groups
      ? `\n\n// Or use typed group accessors\nimport { color } from './${base}';\ncolor('primary') // compile-time checked`
      : '';
    return {
      format: 'TypeScript Declarations',
      usage:
        `import { tokens } from './${base}';\n\n// Pair with ES Module or CommonJS output for runtime values` +
        groupUsage,
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
      EOL,
      `/**`,
      ` * Design tokens`,
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
      `  ${nameTransformer!(token.name)}: ${typeof token.value},`,
    ]
      .filter(Boolean)
      .join(EOL);
  }

  combinator(tokens: Token[]): string {
    const values = tokens.map(t => this.generateToken(t));
    const parts = [
      'export const tokens: {',
      values
        .map((token, index, arr) => (index === arr.length - 1 ? token.slice(0, -1) : token))
        .join(EOL),
      '}',
    ];

    if (this.options.groups) {
      const groupDecls = this.tokenGroups(tokens).map(({ groupName, entries }) => {
        const union = entries.map(({ shortName }) => `'${shortName}'`).join(' | ');
        return `export const ${groupName}: (name: ${union}) => string;`;
      });
      parts.push('', ...groupDecls);
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
        mode => `  ${quoteKey(mode)}: Partial<typeof tokens>;`,
      );
      parts.push('', `export const modes: {`, ...modeEntries, `}`);
    }

    return parts.join(EOL);
  }

  override footer(): string {
    return `export default tokens;`;
  }
}

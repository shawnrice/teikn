import camelCase from 'lodash/camelCase';
import { EOL } from 'os';

import { Token } from '../Token';
import { getDate } from '../utils';
import Generator, { GeneratorOptions } from './Generator';

const defaultOptions = {
  ext: 'd.ts',
  nameTransformer: camelCase,
  dateFn: getDate,
};

export interface TypeScriptOpts extends GeneratorOptions {
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
}

export class TypeScript extends Generator<TypeScriptOpts> {
  constructor(options = {}) {
    super(Object.assign({}, defaultOptions, options));
  }

  header(): string {
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
    return [
      'export const tokens: {',
      values
        .map((token, index, arr) => (index === arr.length - 1 ? token.slice(0, -1) : token))
        .join(EOL),
      '}',
    ].join(EOL);
  }

  footer(): string {
    return `export default tokens;`;
  }
}

export default TypeScript;

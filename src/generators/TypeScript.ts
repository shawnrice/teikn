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

export interface Opts extends GeneratorOptions {
  dateFn?: () => string | null;
  nameTransformer?: (name: string) => string;
}

class TypeScript extends Generator<Opts> {
  constructor(options = {}) {
    super(Object.assign({}, defaultOptions, options));
  }

  header() {
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

  generateToken(token: Token) {
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

  combinator(tokens: Token[]) {
    const values = tokens.map(t => this.generateToken(t));
    return [
      'export const tokens: {',
      values
        .map((token, index, arr) =>
          index === arr.length - 1 ? token.slice(0, -1) : token,
        )
        .join(EOL),
      '}',
    ].join(EOL);
  }

  footer() {
    return `export default tokens;`;
  }
}

export default TypeScript;
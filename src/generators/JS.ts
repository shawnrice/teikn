import { EOL } from 'os';
import camelCase from 'lodash/camelCase';

import Generator, { GeneratorOptions, Token } from './Generator';
import { getDate } from '../utils';

const defaultOptions = {
  ext: 'js',
  nameTransformer: camelCase,
  dateFn: getDate,
};

const maybeQuote = (val: any) => (typeof val === 'string' ? `'${val}'` : val);

export interface Opts extends GeneratorOptions {
  dateFn?: () => string | null;
  nameTransformer?: (name: string) => string;
}

class JS extends Generator<Opts> {
  constructor(options = {}) {
    const opts = Object.assign({}, defaultOptions, options);
    super(opts);
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
    ].join(EOL);
  }

  generateToken(token: Token) {
    const { nameTransformer } = this.options;

    return [
      `  /**`,
      token.usage && `   *  ${token.usage}`,
      `   *  Type: ${token.type}`,
      `   */`,
      `  ${nameTransformer!(token.name)}: ${maybeQuote(token.value)},`,
    ]
      .filter(Boolean)
      .map((token, index, arr) => (index === arr.length - 1 ? token!.slice(0, -1) : token))
      .join(EOL);
  }

  combinator(tokens: Token[]) {
    const values = tokens.map(t => this.generateToken(t));
    return ['module.exports = {', values.join(EOL), '}'].join(EOL);
  }
}

module.exports = JS;

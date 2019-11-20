import camelCase from 'lodash/camelCase';
import { EOL } from 'os';

import { Token } from '../Token';
import { getDate } from '../utils';
import Generator, { GeneratorOptions } from './Generator';

const defaultOptions = {
  ext: 'js',
  nameTransformer: camelCase,
  dateFn: getDate,
};

const maybeQuote = (val: any) => (typeof val === 'string' ? `'${val}'` : val);

export interface JavaScriptOpts extends GeneratorOptions {
  dateFn?: () => string | null;
  nameTransformer?: (name: string) => string;
}

export class JavaScript extends Generator<JavaScriptOpts> {
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
      .join(EOL);
  }

  combinator(tokens: Token[]) {
    const values = tokens.map(t => this.generateToken(t));
    return [
      'const tokens = {',
      values
        .map((token, index, arr) => (index === arr.length - 1 ? token.slice(0, -1) : token))
        .join(EOL),
      '};',
      EOL,
      `module.exports = { tokens: tokens, default: tokens };`,
    ].join(EOL);
  }
}

export default JavaScript;

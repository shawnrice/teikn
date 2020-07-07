import camelCase from 'lodash/camelCase';
import { EOL } from 'os';

import { Token } from '../Token';
import { getDate } from '../utils';
import Generator, { GeneratorOptions } from './Generator';

const defaultOptions = {
  ext: 'mjs',
  nameTransformer: camelCase,
  dateFn: getDate,
};

const maybeQuote = (val: any) => (typeof val === 'string' ? `'${val}'` : val);

export interface ESModuleOpts extends GeneratorOptions {
  dateFn?: () => string | null;
  nameTransformer?: (name: string) => string;
}

/**
 * Generates tokens as an ES Module
 */
export class ESModule extends Generator<ESModuleOpts> {
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
    const values = tokens.map(t => this.generateToken(t));
    return ['export const tokens = {', values.join(EOL), '};', EOL, `export default tokens;`].join(
      EOL,
    );
  }
}

export default ESModule;

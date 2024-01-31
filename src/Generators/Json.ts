import { camelCase } from '../string-utils';
import { Token } from '../Token';
import Generator, { GeneratorOptions } from './Generator';

const defaultOptions = {
  ext: 'json',
  nameTransformer: camelCase,
};

export interface JsonOpts extends GeneratorOptions {
  nameTransformer?: (name: string) => string;
}

export class Json extends Generator<JsonOpts> {
  constructor(options = {}) {
    const opts = Object.assign({}, defaultOptions, options);
    super(opts);
  }

  generateToken(token: Token): Record<string, Omit<Token, 'name'>> {
    const { nameTransformer } = this.options;
    const { name, ...values } = token;
    const key = nameTransformer!(name);

    return { [key]: values };
  }

  combinator(tokens: Token[]): string {
    const combined = tokens.reduce(
      (acc, token) => Object.assign(acc, this.generateToken(token)),
      {},
    );

    return JSON.stringify(combined, null, 2);
  }
}

export default Json;

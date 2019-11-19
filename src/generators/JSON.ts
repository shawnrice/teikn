import camelCase from 'lodash/camelCase';

import { Token } from '../Token';
import Generator, { GeneratorOptions } from './Generator';

const defaultOptions = {
  ext: 'json',
  nameTransformer: camelCase,
};

export interface Opts extends GeneratorOptions {
  nameTransformer?: (name: string) => string;
}

class JSONGenerator extends Generator<Opts> {
  constructor(options = {}) {
    const opts = Object.assign({}, defaultOptions, options);
    super(opts);
  }

  generateToken(token: Token) {
    const { nameTransformer } = this.options;
    const { name, ...values } = token;
    const key = nameTransformer!(name);

    return { [key]: values };
  }

  combinator(tokens: Token[]) {
    const combined = tokens.reduce(
      (acc, token) => Object.assign(acc, this.generateToken(token)),
      {},
    );

    return JSON.stringify(combined, null, 2);
  }
}

export default JSONGenerator;

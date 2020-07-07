import kebabCase from 'lodash/kebabCase';
import { EOL } from 'os';

import { Token } from '../Token';
import { getDate } from '../utils';
import Generator, { GeneratorOptions } from './Generator';

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

  generateToken(token: Token): string {
    const { nameTransformer } = this.options;

    const { usage, value } = token;
    const key = nameTransformer!(token.name);

    // prettier-ignore
    return [
      usage && `  /// ${usage}`,
      `  ${key}: ${value},`,
    ]
      .filter(Boolean)
      .join(EOL);
  }

  combinator(tokens: Token[]): string {
    const values = tokens.map(token => this.generateToken(token));
    return [`// prettier-ignore`, `$token-values: (`, values.join(EOL), `);`, EOL].join(EOL);
  }

  header(): string | null {
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

  footer(): string | null {
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
}

export default Scss;

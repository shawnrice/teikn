import { EOL } from 'os';
import kebabCase from 'lodash/kebabCase';
import Generator, { Token, TokenTypes, GeneratorOptions } from './Generator';
import { transformValue } from './value-transforms';
import { getDate } from '../utils';

const maybeWrap = (val: any, type: TokenTypes) => {
  if (type === 'font' || type === 'font-family') {
    return `unquote('#{${val}}')`;
  }

  return val;
};

const defaultOptions = {
  ext: 'scss',
  nameTransformer: kebabCase,
  dateFn: getDate,
};

export interface Opts extends GeneratorOptions {
  nameTransformer?: (name: string) => string;
  dateFn?: () => string | null;
}

class SCSSGenerator extends Generator<Opts> {
  constructor(options = {}) {
    const opts = Object.assign({}, defaultOptions, options);
    super(opts);
  }

  prepareToken(token: Token) {
    const { nameTransformer } = this.options;
    const { name, type, value, usage } = token;
    const key = nameTransformer!(name);
    const val = maybeWrap(transformValue(token, this.options), type);

    return { usage, key, val };
  }

  generateToken(token: Token) {
    const { usage, key, val } = this.prepareToken(token);

    // prettier-ignore
    return [
      usage && `  /// ${usage}`,
      `  ${key}: ${val},`,
    ]
      .filter(Boolean)
      .join(EOL);
  }

  combinator(tokens: Token[]) {
    const values = tokens.map(t => this.generateToken(t));
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

export default SCSSGenerator;

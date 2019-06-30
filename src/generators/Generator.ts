import { EOL } from 'os';
import { version } from '../../package.json';
import { Token, TokenTypes } from './Token';

export { Token, TokenTypes };

export interface GeneratorOptions {
  ext: string;
  filename?: string;
}

export interface RequiredGeneratorOptions {
  ext: 'string';
}

export type RequiredGeneratorOptionNames = keyof RequiredGeneratorOptions;

export class Generator<Opts extends GeneratorOptions = GeneratorOptions> {
  options: Opts;

  constructor(opts: Opts) {
    this.options = opts;
    this.validateOptions();

    this.signature = this.signature.bind(this);
  }

  signature() {
    return `Teikn v${version}`;
  }

  validateOptions() {
    const required: RequiredGeneratorOptions = { ext: 'string' };

    const errors: string[] = [];

    for (const key in required) {
      const type = typeof this.options[key];
      const expected = required[name];

      if (type !== expected) {
        errors.push(`Error: received option ${key} of type ${type}; expected ${expected}.`);
      }
    }

    if (errors.length) {
      throw new Error(errors.join(EOL));
    }
  }

  get file() {
    const { ext, filename = 'tokens' } = this.options;

    return [filename, ext].join('.');
  }

  header(): string | null {
    return null;
  }

  footer(): string | null {
    return null;
  }

  generateToken(token: Token) {
    throw new Error('You need to extend the Generator class');
  }

  combinator(tokens: Token[]) {
    throw new Error('You need to extend the Generator class');
  }

  generate(tokens: Token[]) {
    return [this.header(), this.combinator(tokens), this.footer()]
      .filter(Boolean)
      .join(EOL)
      .trim();
  }
}

export default Generator;

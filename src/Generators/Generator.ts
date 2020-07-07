import { EOL } from 'os';

import { version } from '../../package.json';
import { Plugin } from '../Plugins';
import { Token } from '../Token';
import { matches } from '../utils';

export type GeneratorOptions = {
  /**
   * The extension for the file
   *
   * (this is usually set when the Generator is extended)
   */
  ext: string;
  /**
   * The basename for the file
   *
   * default: `tokens`
   */
  filename?: string;
};

export type RequiredGeneratorOptions = {
  ext: string;
};

export type RequiredGeneratorOptionNames = keyof RequiredGeneratorOptions;

export abstract class Generator<Opts extends GeneratorOptions = GeneratorOptions> {
  options: Opts;

  constructor(opts: Opts) {
    this.options = opts;
    this.validateOptions();

    this.signature = this.signature.bind(this);
  }

  signature(): string {
    return `Teikn v${version}`;
  }

  validateOptions(): void {
    const required: RequiredGeneratorOptions = { ext: 'string' };

    const errors: string[] = [];

    for (const key in required) {
      const type = typeof this.options[key as RequiredGeneratorOptionNames];
      const expected = required[key as RequiredGeneratorOptionNames];

      if (type !== expected) {
        errors.push(`Error: received option ${key} of type ${type}; expected ${expected}.`);
      }
    }

    if (errors.length) {
      throw new Error(errors.join(EOL));
    }
  }

  get file(): string {
    const { ext, filename = 'tokens' } = this.options;

    return [filename, ext].join('.');
  }

  header(): string | null {
    return null;
  }

  footer(): string | null {
    return null;
  }

  protected prepareTokens(tokens: Token[], plugins: Plugin[]): Token[] {
    return tokens.map(token =>
      plugins.reduce((acc, plugin) => {
        if (!matches(plugin.tokenType, token.type)) {
          return acc;
        }

        if (!matches(plugin.outputType, this.options.ext)) {
          return acc;
        }

        return plugin.toJSON(acc);
      }, token),
    );
  }

  abstract generateToken(_: Token): any;

  abstract combinator(_: Token[]): string;

  generate(tokens: Token[], plugins: Plugin[] = []): string {
    return [this.header(), this.combinator(this.prepareTokens(tokens, plugins)), this.footer()]
      .filter(Boolean)
      .join(EOL)
      .trim();
  }
}

export default Generator;

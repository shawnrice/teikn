import { Token } from '../Token';

export abstract class Plugin<Options extends Record<string, unknown> = Record<string, unknown>> {
  abstract tokenType: string | RegExp;
  abstract outputType: string | RegExp;

  options: Options;

  constructor(options: Options = {} as Options) {
    this.options = options;
  }

  abstract toJSON(token: Token): Token;
}

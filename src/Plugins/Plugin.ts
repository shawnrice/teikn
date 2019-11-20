import { Token } from '../Token';

export abstract class Plugin {
  abstract tokenType: string | RegExp;
  abstract outputType: string | RegExp;

  options: { [key: string]: any };

  constructor(options: { [key: string]: any } = {}) {
    this.options = options;
  }

  abstract toJSON(token: Token): Token;
}

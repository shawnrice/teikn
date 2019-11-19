import { Token } from '../Generators/Token';

// export type HasTokenType = { tokenType: string | RegExp };

// export type HasOutputType = { outputType: string | RegExp };

// export type TransformFunction = (token: Token) => Token;

export abstract class Plugin {
  abstract tokenType: string | RegExp;
  abstract outputType: string | RegExp;

  options: { [key: string]: any };

  constructor(options: { [key: string]: any } = {}) {
    this.options = options;
  }

  abstract toJSON(token: Token): Token;
}

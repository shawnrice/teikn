import { Token } from '../Token';
import { Plugin } from './Plugin';

/**
 * Quotes some SCSS values
 *
 * This is needed for things like font-families to get the right values
 */
export class SCSSQuoteValuePlugin extends Plugin {
  outputType = /s(a|c)ss/;

  tokenType = /^(font|font-family)$/;

  toJSON(token: Token): Token {
    const { value } = token;

    return {
      ...token,
      value: `unquote('#{${value}}')`,
    };
  }
}

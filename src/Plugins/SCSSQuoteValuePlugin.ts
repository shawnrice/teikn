import { Token } from '../Token';
import { Plugin } from './Plugin';

/**
 * Prefixes the token type to the token name
 *
 * E.g.
 *
 * ```javascript
 * {
 *   type: 'color',
 *   name: 'primary',
 *   value: 'orange'
 * }
 * ```
 * becomes
 * ```javascript
 * {
 *   type: 'color',
 *   name: 'colorPrimary',
 *   value: 'orange'
 * }
 * ```
 */
export class SCSSQuoteValuePlugin extends Plugin {
  outputType = /s(a|c)ss/;

  tokenType = /^(font|font-family)$/;

  toJSON(token: Token) {
    const { value } = token;

    return {
      ...token,
      value: `unquote('#{${value}}')`,
    };
  }
}

import camelCase from 'lodash/camelCase';

import { Token } from '../Generators/Token';
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
export class PrefixTypePlugin extends Plugin {
  outputType = /.*/;

  tokenType = /.*/;

  toJSON(token: Token) {
    const { type, name } = token;

    return {
      ...token,
      name: [camelCase(type), name[0].toUpperCase(), name.slice(1)].join(''),
    };
  }
}

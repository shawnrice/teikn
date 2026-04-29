import { camelCase } from "../string-utils.js";
import type { Token } from "../Token.js";
import { Plugin } from "./Plugin.js";

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
  outputType: RegExp = /.*/;

  tokenType: RegExp = /.*/;

  // oxlint-disable-next-line class-methods-use-this
  override transform(token: Token): Token {
    const { type, name } = token;

    if (!type || !name) {
      throw new Error("Token is missing type or name");
    }

    return {
      ...token,
      name: [camelCase(type), name.at(0)?.toUpperCase(), name.slice(1)].join(""),
    };
  }
}

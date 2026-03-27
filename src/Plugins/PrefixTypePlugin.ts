import { camelCase } from "../string-utils";
import type { Token } from "../Token";
import { Plugin } from "./Plugin";

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

  transform(token: Token): Token {
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

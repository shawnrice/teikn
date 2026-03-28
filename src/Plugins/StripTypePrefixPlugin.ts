import { deriveShortName } from "../string-utils";
import type { Token } from "../Token";
import { Plugin } from "./Plugin";

/**
 * Strips the type prefix from token names, reversing the default type-prefixing behavior.
 *
 * Use this only when your token names are already globally unique across all groups.
 *
 * E.g.
 *
 * ```javascript
 * {
 *   type: 'color',
 *   name: 'color-primary',
 *   value: 'orange'
 * }
 * ```
 * becomes
 * ```javascript
 * {
 *   type: 'color',
 *   name: 'primary',
 *   value: 'orange'
 * }
 * ```
 */
export class StripTypePrefixPlugin extends Plugin {
  outputType: RegExp = /.*/;

  tokenType: RegExp = /.*/;

  override transform(token: Token): Token {
    return {
      ...token,
      name: deriveShortName(token.name, token.type),
    };
  }
}

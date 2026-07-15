import { deriveShortName } from '../string-utils.js';
import type { Token } from '../Token.js';
import { Plugin } from './Plugin.js';

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
    // `link` (a linked ref's target name) is remapped centrally by the
    // ref-aware generators after the plugin pipeline, so it doesn't need — and
    // must not get — this token's own prefix stripped here (the target may be a
    // different type).
    return { ...token, name: deriveShortName(token.name, token.type) };
  }
}

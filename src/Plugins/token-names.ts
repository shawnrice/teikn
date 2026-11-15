import { tokenKey } from '../token-keys.js';
import type { Token } from '../Token.js';

/**
 * Find the tokens a plugin option names. A qualified key (`group.name`) wins;
 * otherwise the authored name or the default emitted name (`type-name`) match.
 * More than one result means the name is ambiguous.
 */
export const findTokens = (tokens: Token[], name: string): Token[] => {
  const exact = tokens.filter(t => tokenKey(t) === name);

  return exact.length > 0
    ? exact
    : tokens.filter(t => t.name === name || `${t.type}-${t.name}` === name);
};

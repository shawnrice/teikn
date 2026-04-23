import type { Token } from "./Token";
import { tokenKey } from "./token-keys";

export type TokenSet = {
  name: string;
  tokens: Token[];
};

/**
 * Create a named token set from one or more token arrays.
 *
 * @example
 * ```ts
 * const core = tokenSet('core',
 *   group('color', { primary: '#0066cc', secondary: '#cc6600' }),
 *   group('spacing', { sm: '8px', md: '16px' }),
 * );
 * ```
 */
export const tokenSet = (name: string, ...groups: Token[][]): TokenSet => ({
  name,
  tokens: groups.flat(),
});

/**
 * Compose multiple token sets into a single token array.
 * Later sets override earlier ones by qualified key (`group.name`),
 * so two tokens with the same short name in different groups (e.g.
 * `color.primary` and `size.primary`) coexist instead of colliding.
 * Token order is preserved: overridden tokens appear at the position
 * of the first occurrence.
 */
export const composeTokenSets = (...sets: TokenSet[]): Token[] => {
  const tokenMap = new Map<string, Token>();

  for (const set of sets) {
    for (const token of set.tokens) {
      tokenMap.set(tokenKey(token), token);
    }
  }

  return [...tokenMap.values()];
};

/**
 * Compose token sets into tokens with mode variants.
 * The base set provides default values. Additional sets become modes.
 * Tokens present in mode sets must also exist in the base set, matched
 * by qualified key (`group.name`).
 */
export const composeTokenSetsAsModes = (
  base: TokenSet,
  modeSets: Record<string, TokenSet>,
): Token[] => {
  const tokenMap = new Map<string, Token>();

  for (const token of base.tokens) {
    tokenMap.set(tokenKey(token), { ...token });
  }

  for (const [modeName, modeSet] of Object.entries(modeSets)) {
    for (const modeToken of modeSet.tokens) {
      const key = tokenKey(modeToken);
      const existing = tokenMap.get(key);

      if (existing) {
        existing.modes = { ...existing.modes, [modeName]: modeToken.value };
      } else {
        throw new Error(
          `composeTokenSetsAsModes(): missing base token "${key}" for mode "${modeName}"`,
        );
      }
    }
  }

  return [...tokenMap.values()];
};

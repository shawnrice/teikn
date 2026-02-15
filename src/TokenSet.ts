import type { Token } from './Token';

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
 * Later sets override earlier ones by token name.
 * Tokens from later sets fully replace tokens from earlier sets with the same name.
 * Token order is preserved: overridden tokens appear at the position of the first occurrence.
 */
export const composeTokenSets = (...sets: TokenSet[]): Token[] => {
  const tokenMap = new Map<string, Token>();

  for (const set of sets) {
    for (const token of set.tokens) {
      tokenMap.set(token.name, token);
    }
  }

  return [...tokenMap.values()];
};

/**
 * Compose token sets into tokens with mode variants.
 * The base set provides default values. Additional sets become modes.
 * Tokens present in mode sets but absent from the base are added with modes only.
 */
export const composeTokenSetsAsModes = (
  base: TokenSet,
  modeSets: Record<string, TokenSet>,
): Token[] => {
  const tokenMap = new Map<string, Token>();

  for (const token of base.tokens) {
    tokenMap.set(token.name, { ...token });
  }

  for (const [modeName, modeSet] of Object.entries(modeSets)) {
    for (const modeToken of modeSet.tokens) {
      const existing = tokenMap.get(modeToken.name);

      if (existing) {
        existing.modes = { ...existing.modes, [modeName]: modeToken.value };
      } else {
        tokenMap.set(modeToken.name, {
          ...modeToken,
          value: undefined,
          modes: { [modeName]: modeToken.value },
        });
      }
    }
  }

  return [...tokenMap.values()];
};

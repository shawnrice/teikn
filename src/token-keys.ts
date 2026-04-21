import type { Token } from "./Token";

export type KeyResolution =
  | { status: "ok"; key: string; bare: string }
  | { status: "missing" }
  | { status: "ambiguous"; candidates: string[] };

export type KeyAliasIndex = {
  fullKeys: Set<string>;
  uniqueBare: Map<string, string>;
  ambiguousBare: Map<string, string[]>;
};

const KEY_SEPARATOR = ".";

export const tokenKey = (token: Pick<Token, "name" | "group">): string => {
  if (!token.name) {
    return "";
  }
  return token.group ? `${token.group}${KEY_SEPARATOR}${token.name}` : token.name;
};

const bareKey = (key: string): string => {
  const parts = key.split(KEY_SEPARATOR);
  return parts[parts.length - 1]!;
};

export const buildKeyAliasIndex = (keys: string[]): KeyAliasIndex => {
  const fullKeys = new Set<string>();
  const byBare = new Map<string, string[]>();

  for (const key of keys) {
    if (!key) {
      continue;
    }
    fullKeys.add(key);
    const bare = bareKey(key);
    const list = byBare.get(bare) ?? [];
    list.push(key);
    byBare.set(bare, list);
  }

  const uniqueBare = new Map<string, string>();
  const ambiguousBare = new Map<string, string[]>();

  for (const [bare, matches] of byBare) {
    if (matches.length === 1) {
      uniqueBare.set(bare, matches[0]!);
    } else {
      ambiguousBare.set(bare, matches);
    }
  }

  return { fullKeys, uniqueBare, ambiguousBare };
};

/**
 * Resolve a reference value against the index.
 *
 * Resolution order:
 * 1. Full qualified key match (e.g. `{color.primary}` → `color.primary`).
 *    This lets users disambiguate across groups by writing the full path.
 * 2. Bare name match (`{primary}` → `color.primary` when unique).
 * 3. Bare name that collides across groups → `ambiguous`.
 * 4. Otherwise → `missing`.
 */
export const resolveKey = (value: string, index: KeyAliasIndex): KeyResolution => {
  if (index.fullKeys.has(value)) {
    return { status: "ok", key: value, bare: bareKey(value) };
  }

  const ambiguous = index.ambiguousBare.get(value);
  if (ambiguous) {
    return { status: "ambiguous", candidates: ambiguous };
  }

  const match = index.uniqueBare.get(value);
  if (match) {
    return { status: "ok", key: match, bare: value };
  }

  return { status: "missing" };
};

export const ambiguousKeyMessage = (value: string, candidates: string[]): string =>
  `Ambiguous token reference: {${value}} matches ${candidates.join(", ")}. Rename one of the tokens to remove the clash.`;

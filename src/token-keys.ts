import type { Token } from "./Token.js";

export type KeyResolution =
  | { status: "ok"; key: string; bare: string }
  | { status: "missing" }
  | { status: "ambiguous"; candidates: readonly string[] };

/**
 * Internal value stored for each bare name in the index. A bare name is
 * either `unique` (points at one full key) or `ambiguous` (lists all
 * colliding full keys). The discriminated-union shape collapses the
 * prior two-Map arrangement, eliminating the "bare appears in exactly
 * one of the two maps" cross-field invariant.
 */
type BareLookup =
  | { status: "unique"; key: string }
  | { status: "ambiguous"; candidates: readonly string[] };

/**
 * Readonly view of the resolution index. Built by `buildKeyAliasIndex`;
 * consumers should treat it as opaque and use `resolveKey` for lookups.
 */
export type KeyAliasIndex = {
  readonly fullKeys: ReadonlySet<string>;
  readonly bareLookup: ReadonlyMap<string, BareLookup>;
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
    if (!key || fullKeys.has(key)) {
      // Skip empty keys and duplicates — duplicates would otherwise
      // pollute `byBare` and produce a false-ambiguity report like
      // `matches primary, primary`.
      continue;
    }
    fullKeys.add(key);
    const bare = bareKey(key);
    const list = byBare.get(bare) ?? [];
    list.push(key);
    byBare.set(bare, list);
  }

  const bareLookup = new Map<string, BareLookup>();
  for (const [bare, matches] of byBare) {
    bareLookup.set(
      bare,
      matches.length === 1
        ? { status: "unique", key: matches[0]! }
        : { status: "ambiguous", candidates: matches },
    );
  }

  return { fullKeys, bareLookup };
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

  const bare = index.bareLookup.get(value);
  if (!bare) {
    return { status: "missing" };
  }
  if (bare.status === "ambiguous") {
    return { status: "ambiguous", candidates: bare.candidates };
  }
  return { status: "ok", key: bare.key, bare: value };
};

export const ambiguousKeyMessage = (value: string, candidates: readonly string[]): string =>
  `Ambiguous token reference: {${value}} matches ${candidates.join(", ")}. ` +
  `Use a qualified reference like {${candidates[0]}} to disambiguate, or rename one of the tokens.`;

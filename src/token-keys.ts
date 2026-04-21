import type { Token } from "./Token";

export type KeyResolution =
  | { status: "ok"; key: string; bare: string }
  | { status: "missing" }
  | { status: "ambiguous"; candidates: string[] };

type KeyAliasIndex = {
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
  const byBare = new Map<string, string[]>();

  for (const key of keys) {
    if (!key) {
      continue;
    }
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

  return { uniqueBare, ambiguousBare };
};

export const resolveKey = (value: string, index: KeyAliasIndex): KeyResolution => {
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

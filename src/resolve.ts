import type { Token } from "./Token";
import type { KeyAliasIndex } from "./token-keys";
import { ambiguousKeyMessage, buildKeyAliasIndex, resolveKey, tokenKey } from "./token-keys";
import { isFirstClassValue } from "./type-classifiers";

const REF_PATTERN = /^\{([^}]+)\}$/;

const isRef = (value: unknown): value is string =>
  typeof value === "string" && REF_PATTERN.test(value);

const isCompositeValue = (value: unknown): value is Record<string, any> =>
  typeof value === "object" && value !== null && !Array.isArray(value) && !isFirstClassValue(value);

const resolveValue = (
  value: any,
  tokenMap: Map<string, Token>,
  tokenKeys: KeyAliasIndex,
  seen: Set<string>,
  currentName: string,
): any => {
  if (isCompositeValue(value)) {
    const resolved: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      resolved[k] = resolveValue(v, tokenMap, tokenKeys, seen, currentName);
    }
    return resolved;
  }

  if (!isRef(value)) {
    return value;
  }

  const refName = value.match(REF_PATTERN)![1]!;
  const resolved = resolveKey(refName, tokenKeys);

  if (resolved.status === "ambiguous") {
    throw new Error(ambiguousKeyMessage(refName, resolved.candidates));
  }

  if (resolved.status === "missing") {
    throw new Error(`Unresolved reference: {${refName}} in token "${currentName}"`);
  }

  if (seen.has(resolved.key)) {
    throw new Error(`Circular reference detected: ${currentName} -> ${refName}`);
  }

  // The resolved key came from tokenKeys, which was built from tokenMap.keys(),
  // so the lookup is guaranteed to hit.
  const referenced = tokenMap.get(resolved.key)!;
  seen.add(resolved.key);
  return resolveValue(referenced.value, tokenMap, tokenKeys, seen, referenced.name);
};

const resolveModes = (
  modes: Record<string, any>,
  tokenMap: Map<string, Token>,
  tokenKeys: KeyAliasIndex,
  tokenName: string,
): Record<string, any> => {
  const resolved: Record<string, any> = {};
  for (const [mode, value] of Object.entries(modes)) {
    resolved[mode] = resolveValue(value, tokenMap, tokenKeys, new Set([tokenName]), tokenName);
  }
  return resolved;
};

/**
 * Resolve all `{tokenName}` references in a token set.
 * References are looked up by token name (case-sensitive).
 * Circular references throw an error.
 */
export const resolveReferences = (tokens: Token[]): Token[] => {
  const tokenMap = new Map<string, Token>();
  for (const token of tokens) {
    const key = tokenKey(token);
    if (!key) {
      continue;
    }
    tokenMap.set(key, token);
  }
  const tokenKeys = buildKeyAliasIndex([...tokenMap.keys()]);

  return tokens.map((token) => {
    const resolvedValue = resolveValue(
      token.value,
      tokenMap,
      tokenKeys,
      new Set([tokenKey(token)]),
      token.name,
    );
    const resolvedModes = token.modes
      ? resolveModes(token.modes, tokenMap, tokenKeys, tokenKey(token))
      : undefined;

    if (resolvedValue === token.value && resolvedModes === undefined) {
      return token;
    }

    const result = { ...token, value: resolvedValue };
    if (resolvedModes) {
      result.modes = resolvedModes;
    }
    return result;
  });
};

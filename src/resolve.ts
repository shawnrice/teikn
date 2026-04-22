import type { Token } from "./Token";
import type { KeyAliasIndex } from "./token-keys";
import { ambiguousKeyMessage, buildKeyAliasIndex, resolveKey, tokenKey } from "./token-keys";
import { isFirstClassValue } from "./type-classifiers";

const REF_PATTERN = /^\{([^}]+)\}$/;

const isRef = (value: unknown): value is string =>
  typeof value === "string" && REF_PATTERN.test(value);

const isCompositeValue = (value: unknown): value is Record<string, any> =>
  typeof value === "object" && value !== null && !Array.isArray(value) && !isFirstClassValue(value);

type ResolveArgs = {
  value: any;
  seen: Set<string>;
  currentName: string;
};

type ResolveModesArgs = {
  modes: Record<string, any>;
  tokenName: string;
};

/**
 * Build a resolver closure bound to a specific token universe. The
 * returned `resolveValue` / `resolveModes` capture `tokenMap` and
 * `tokenKeys`, leaving callers with single-argument entry points.
 */
const createResolver = (tokenMap: Map<string, Token>, tokenKeys: KeyAliasIndex) => {
  const resolveValue = ({ value, seen, currentName }: ResolveArgs): any => {
    if (isCompositeValue(value)) {
      // Use a null-prototype object so a field literally named `__proto__`
      // (possible from JSON-parsed input) is stored as a data property
      // rather than invoking the setter and changing the result's prototype.
      const resolved: Record<string, any> = Object.create(null);
      for (const [k, v] of Object.entries(value)) {
        resolved[k] = resolveValue({ value: v, seen, currentName });
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
      throw new Error(
        `Circular reference detected: ${[...seen, refName].join(" -> ")}`,
      );
    }

    // The resolved key came from tokenKeys, which was built from tokenMap.keys(),
    // so the lookup is guaranteed to hit.
    const referenced = tokenMap.get(resolved.key)!;
    // Fresh Set per branch: sibling composite fields resolving the same
    // ancestor must not share visited state (false positive cycle).
    const next = new Set(seen);
    next.add(resolved.key);
    return resolveValue({
      value: referenced.value,
      seen: next,
      currentName: tokenKey(referenced),
    });
  };

  const resolveModes = ({
    modes,
    tokenName,
  }: ResolveModesArgs): Record<string, any> | undefined => {
    const resolved: Record<string, any> = {};
    let changed = false;
    for (const [mode, value] of Object.entries(modes)) {
      const next = resolveValue({ value, seen: new Set([tokenName]), currentName: tokenName });
      resolved[mode] = next;
      if (next !== value) {
        changed = true;
      }
    }
    // Return undefined when nothing changed so the caller's identity
    // short-circuit can skip the shallow clone for literal-only modes.
    return changed ? resolved : undefined;
  };

  return { resolveValue, resolveModes };
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
  const { resolveValue, resolveModes } = createResolver(tokenMap, tokenKeys);

  return tokens.map((token) => {
    const resolvedValue = resolveValue({
      value: token.value,
      seen: new Set([tokenKey(token)]),
      currentName: tokenKey(token),
    });
    const resolvedModes = token.modes
      ? resolveModes({ modes: token.modes, tokenName: tokenKey(token) })
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

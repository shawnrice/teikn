import type { CompositeValue, ModeValues, Token, TokenValue } from "./Token.js";
import type { KeyAliasIndex } from "./token-keys.js";
import { ambiguousKeyMessage, buildKeyAliasIndex, resolveKey, tokenKey } from "./token-keys.js";
import { isFirstClassValue } from "./type-classifiers.js";

const REF_PATTERN = /^\{([^}]+)\}$/;

const isRef = (value: unknown): value is string =>
  typeof value === "string" && REF_PATTERN.test(value);

const isCompositeValue = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value) && !isFirstClassValue(value);

type ResolveArgs = {
  value: unknown;
  seen: Set<string>;
  currentName: string;
};

type ResolveModesArgs = {
  modes: ModeValues;
  tokenName: string;
};

/**
 * Build a resolver closure bound to a specific token universe. The
 * returned `resolveValue` / `resolveModes` capture `tokenMap` and
 * `tokenKeys`, leaving callers with single-argument entry points.
 */
const createResolver = (tokenMap: Map<string, Token>, tokenKeys: KeyAliasIndex) => {
  const resolveValue = ({ value, seen, currentName }: ResolveArgs): unknown => {
    if (isCompositeValue(value)) {
      // Use a null-prototype object so a field literally named `__proto__`
      // (possible from JSON-parsed input) is stored as a data property
      // rather than invoking the setter and changing the result's prototype.
      const resolved: Record<string, unknown> = Object.create(null);
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

    switch (resolved.status) {
      case "ambiguous":
        throw new Error(ambiguousKeyMessage(refName, resolved.candidates));
      case "missing":
        throw new Error(`Unresolved reference: {${refName}} in token "${currentName}"`);
      case "ok": {
        if (seen.has(resolved.key)) {
          // `seen` holds qualified keys; use `resolved.key` (also qualified)
          // rather than the user-provided `refName` so the chain is uniformly
          // reported (e.g. `color.a -> color.b -> color.a`, not mixing
          // qualified and bare segments).
          throw new Error(`Circular reference detected: ${[...seen, resolved.key].join(" -> ")}`);
        }
        // invariant: tokenKeys mirrors tokenMap
        const referenced = tokenMap.get(resolved.key)!;
        const next = new Set(seen);
        next.add(resolved.key);
        return resolveValue({
          value: referenced.value,
          seen: next,
          currentName: tokenKey(referenced),
        });
      }
    }
  };

  const resolveModes = ({
    modes,
    tokenName,
  }: ResolveModesArgs): Record<string, unknown> | undefined => {
    const resolved: Record<string, unknown> = {};
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

    // Cast at the boundary: resolveValue / resolveModes internally work
    // in `unknown` for composite flexibility, but the Token contract is
    // `TokenValue | CompositeValue`. Verified by the surrounding pipeline
    // (validate runs before this) that the shapes conform.
    const result: Token = { ...token, value: resolvedValue as TokenValue | CompositeValue };
    if (resolvedModes) {
      result.modes = resolvedModes as ModeValues;
    }
    return result;
  });
};

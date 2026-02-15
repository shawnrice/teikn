import { BoxShadow } from './BoxShadow';
import { Color } from './Color';
import { CubicBezier } from './CubicBezier';
import { LinearGradient, RadialGradient } from './Gradient';
import type { Token } from './Token';
import { Transition } from './Transition';

const REF_PATTERN = /^\{([^}]+)\}$/;

const isRef = (value: unknown): value is string =>
  typeof value === 'string' && REF_PATTERN.test(value);

const isFirstClassValue = (value: unknown): boolean =>
  value instanceof Color ||
  value instanceof CubicBezier ||
  value instanceof BoxShadow ||
  value instanceof LinearGradient ||
  value instanceof RadialGradient ||
  value instanceof Transition;

const isCompositeValue = (value: unknown): value is Record<string, any> =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  !isFirstClassValue(value);

const resolveValue = (
  value: any,
  tokenMap: Map<string, Token>,
  seen: Set<string>,
  currentName: string,
): any => {
  if (isCompositeValue(value)) {
    const resolved: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      resolved[k] = resolveValue(v, tokenMap, seen, currentName);
    }
    return resolved;
  }

  if (!isRef(value)) {
    return value;
  }

  const refName = value.match(REF_PATTERN)![1]!;

  if (seen.has(refName)) {
    throw new Error(`Circular reference detected: ${currentName} -> ${refName}`);
  }

  const referenced = tokenMap.get(refName);
  if (!referenced) {
    throw new Error(`Unresolved reference: {${refName}} in token "${currentName}"`);
  }

  seen.add(refName);
  return resolveValue(referenced.value, tokenMap, seen, refName);
};

/**
 * Resolve all `{tokenName}` references in a token set.
 * References are looked up by token name (case-sensitive).
 * Circular references throw an error.
 */
export const resolveReferences = (tokens: Token[]): Token[] => {
  const tokenMap = new Map<string, Token>();
  for (const token of tokens) {
    tokenMap.set(token.name, token);
  }

  return tokens.map(token => {
    const resolved = resolveValue(token.value, tokenMap, new Set([token.name]), token.name);
    if (resolved === token.value) {
      return token;
    }
    return { ...token, value: resolved };
  });
};

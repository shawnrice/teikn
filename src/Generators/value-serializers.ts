import type { TokenValue } from "../Token";
import { BoxShadow } from "../TokenTypes/BoxShadow";
import { Transition } from "../TokenTypes/Transition";
import { isFirstClassValue } from "../type-classifiers";

// ─── CSS/SCSS value serialization ────────────────────────────────
// Shared by CssVars, Scss, and ScssVars generators.

export const cssValue = (value: unknown): string => {
  if (typeof value !== "object" || value === null) {
    return String(value);
  }
  if (isFirstClassValue(value)) {
    return String(value);
  }
  const obj = value as Record<string, unknown>;
  if ("width" in obj && "style" in obj && "color" in obj) {
    return [obj.width, obj.style, obj.color].filter(Boolean).join(" ");
  }
  return Object.values(obj).join(" ");
};

// ─── JS value serialization ─────────────────────────────────────
// Shared by JavaScript and EsModule generators.

export const maybeQuote = (val: unknown): string => {
  if (typeof val === "string") {
    return `'${val.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n")}'`;
  }
  if (typeof val === "object" && val !== null) {
    return JSON.stringify(val);
  }
  return String(val);
};

export const isValidIdentifier = (name: string): boolean => /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name);

export const quoteKey = (name: string): string => (isValidIdentifier(name) ? name : `'${name}'`);

// ─── Reference-aware serialization ─────────────────────────────
// Used by CssVars and ScssVars to emit references (var(--x) / $x)
// instead of inlining values when the component is a known token.

export type RefResolver = (value: unknown) => string | null;

const fmtLength = (v: number): string => (v === 0 ? "0" : `${v}px`);

export const stringifyTransitionWithRefs = (
  t: Transition,
  ref: RefResolver,
): string => {
  const parts: string[] = [];
  if (t.property !== "all") {
    parts.push(t.property);
  }
  parts.push(ref(t.duration) ?? t.duration.toString());
  const timing = ref(t.timingFunction);
  if (timing) {
    parts.push(timing);
  } else {
    const { keyword } = t.timingFunction;
    parts.push(keyword ?? t.timingFunction.toString());
  }
  if (t.delay.value !== 0) {
    parts.push(ref(t.delay) ?? t.delay.toString());
  }
  return parts.join(" ");
};

export const stringifyBoxShadowWithRefs = (
  s: BoxShadow,
  ref: RefResolver,
): string => {
  const parts: string[] = [];
  if (s.inset) {
    parts.push("inset");
  }
  parts.push(fmtLength(s.offsetX));
  parts.push(fmtLength(s.offsetY));
  if (s.blur !== 0 || s.spread !== 0) {
    parts.push(fmtLength(s.blur));
  }
  if (s.spread !== 0) {
    parts.push(fmtLength(s.spread));
  }
  parts.push(ref(s.color) ?? s.color.toString());
  return parts.join(" ");
};

export const stringifyWithRefs = (value: TokenValue, ref: RefResolver): string => {
  if (value instanceof Transition) {
    return stringifyTransitionWithRefs(value, ref);
  }
  if (value instanceof BoxShadow) {
    return stringifyBoxShadowWithRefs(value, ref);
  }
  return String(value);
};

/**
 * Visit the referenceable components of a composed value.
 * Shared by stringifyWithRefs (serialization) and valueDependencies (topo sort)
 * to keep field enumeration in one place.
 */
export const visitComponents = (value: unknown, fn: (v: unknown) => void): void => {
  if (value instanceof Transition) {
    fn(value.duration);
    fn(value.timingFunction);
    if (value.delay.value !== 0) {
      fn(value.delay);
    }
  } else if (value instanceof BoxShadow) {
    fn(value.color);
  }
};

/**
 * Extract the set of token names that a value's components reference.
 * Used for dependency ordering (SCSS topological sort).
 */
export const valueDependencies = (value: unknown, refMap: Map<unknown, string>): string[] => {
  const deps: string[] = [];
  visitComponents(value, (v) => {
    const name = refMap.get(v);
    if (name) {
      deps.push(name);
    }
  });
  return deps;
};

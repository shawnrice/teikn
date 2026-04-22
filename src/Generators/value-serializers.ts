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
    // border shorthand: width style color
    return [obj.width, obj.style, obj.color].filter(Boolean).join(" ");
  }
  // Unknown composite shape. The previous implementation joined
  // Object.values with a space — producing field-order-dependent output
  // that accidentally matched no CSS shorthand for any shape other than
  // border. Emit as JSON instead so users see at a glance that the token
  // isn't a valid CSS value and should be consumed through a structured
  // generator (JSON / JavaScript / DTCG).
  return JSON.stringify(value);
};

// ─── JS value serialization ─────────────────────────────────────
// Shared by the JavaScript generator (both ESM and CJS modes).

// U+2028 LINE SEPARATOR and U+2029 PARAGRAPH SEPARATOR are valid JSON
// but are LineTerminators in ECMAScript string literals — they break
// single-quoted / double-quoted source strings at parse time. Build
// the regex via String.fromCharCode so the source file itself doesn't
// contain literal line terminators.
const JS_LINE_SEPARATORS = new RegExp(`[${String.fromCharCode(0x2028, 0x2029)}]`, "g");

export const maybeQuote = (val: unknown): string => {
  if (typeof val === "string") {
    // JSON.stringify covers \n, \r, \t, NUL, and other control chars.
    // Strip the surrounding double-quote, unescape \" (our wrapper is
    // single-quoted so double quotes don't need escaping), hand-escape
    // U+2028 / U+2029, and escape single quotes.
    const escaped = JSON.stringify(val)
      .slice(1, -1)
      .replace(/\\"/g, '"')
      .replace(JS_LINE_SEPARATORS, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`)
      .replace(/'/g, "\\'");
    return `'${escaped}'`;
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

export const stringifyTransitionWithRefs = (t: Transition, ref: RefResolver): string => {
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

export const stringifyBoxShadowWithRefs = (s: BoxShadow, ref: RefResolver): string => {
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

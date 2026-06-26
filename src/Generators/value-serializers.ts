import type { TokenValue } from "../Token.js";
import { Border } from "../TokenTypes/Border.js";
import { BoxShadow } from "../TokenTypes/BoxShadow.js";
import { Transition } from "../TokenTypes/Transition.js";
import { Typography } from "../TokenTypes/Typography.js";
import { isFirstClassValue } from "../type-classifiers.js";

// ─── CSS/SCSS value serialization ────────────────────────────────
// Shared by CssVars, Scss, and ScssVars generators.

const MAX_PRECISION = 4;

const roundNumber = (n: number): string => {
  const str = String(n);
  const dot = str.indexOf(".");
  if (dot === -1 || str.length - dot - 1 <= MAX_PRECISION) {
    return str;
  }
  return parseFloat(n.toFixed(MAX_PRECISION)).toString();
};

export const cssValue = (value: unknown): string => {
  if (typeof value === "number") {
    return roundNumber(value);
  }
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
  // Unknown composite shape: space-join the values. This matches CSS
  // shorthand order for typography (`font:` shorthand) when field order
  // is roughly family, size, weight, line-height — fragile but usable
  // in a CSS property-value context. SCSS contexts that put this in a
  // map entry need to wrap the output in parens themselves to keep
  // internal commas from being parsed as map-entry separators; see
  // `cssMapValue` below.
  return Object.values(obj).join(" ");
};

/**
 * Serialize a value for use as an SCSS map-entry value. Wraps compound
 * objects whose serialization contains a top-level comma in parens so
 * SCSS parses them as a single nested list — otherwise the comma inside
 * a typography composite's fontFamily (or similar) would be treated as
 * a map-entry separator and mangle the map.
 *
 * Scalars like `rgb(1, 2, 3)` also contain commas but don't need
 * wrapping — the parens are part of the function-call syntax, which
 * SCSS's parser already treats as one token.
 */
export const cssMapValue = (value: unknown): string => {
  const serialized = cssValue(value);
  const isCompositeObject =
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    !isFirstClassValue(value);
  return isCompositeObject && serialized.includes(",") ? `(${serialized})` : serialized;
};

// ─── JS value serialization ─────────────────────────────────────
// Shared by the JavaScript generator (both ESM and CJS modes).

// U+2028 LINE SEPARATOR and U+2029 PARAGRAPH SEPARATOR are valid JSON
// but are LineTerminators in ECMAScript string literals — they break
// single-quoted / double-quoted source strings at parse time. Build
// the regex via String.fromCharCode so the source file itself doesn't
// contain literal line terminators.
const JS_LINE_SEPARATORS = new RegExp(`[${String.fromCharCode(0x2028, 0x2029)}]`, "g");

// Single-quote a string for emission into generated source. Using single
// quotes means values containing double quotes (e.g. font stacks like
// `"Times New Roman"`) don't need escaping. JSON.stringify covers \n, \r, \t,
// NUL, and other control chars; we then strip its double-quote wrapper,
// unescape \", hand-escape U+2028 / U+2029, and escape single quotes.
export const quoteString = (val: string): string => {
  const escaped = JSON.stringify(val)
    .slice(1, -1)
    .replace(/\\"/g, '"')
    .replace(JS_LINE_SEPARATORS, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`)
    .replace(/'/g, "\\'");
  return `'${escaped}'`;
};

export const maybeQuote = (val: unknown): string => {
  if (typeof val === "string") {
    return quoteString(val);
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

export const stringifyTypographyWithRefs = (t: Typography, ref: RefResolver): string => {
  const sizeLine =
    t.lineHeight !== null
      ? `${ref(t.fontSize) ?? t.fontSize.toString()}/${t.lineHeight}`
      : (ref(t.fontSize) ?? t.fontSize.toString());
  return [t.fontWeight !== null ? String(t.fontWeight) : null, sizeLine, t.fontFamily]
    .filter((part): part is string => part !== null)
    .join(" ");
};

export const stringifyBorderWithRefs = (b: Border, ref: RefResolver): string =>
  [ref(b.width) ?? b.width.toString(), b.style, ref(b.color) ?? b.color.toString()].join(" ");

export const stringifyWithRefs = (value: TokenValue, ref: RefResolver): string => {
  if (value instanceof Transition) {
    return stringifyTransitionWithRefs(value, ref);
  }
  if (value instanceof BoxShadow) {
    return stringifyBoxShadowWithRefs(value, ref);
  }
  if (value instanceof Typography) {
    return stringifyTypographyWithRefs(value, ref);
  }
  if (value instanceof Border) {
    return stringifyBorderWithRefs(value, ref);
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
  } else if (value instanceof Typography) {
    fn(value.fontSize);
  } else if (value instanceof Border) {
    fn(value.width);
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

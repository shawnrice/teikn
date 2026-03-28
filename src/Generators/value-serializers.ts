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

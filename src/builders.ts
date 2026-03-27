import { Color } from "./TokenTypes/Color";
import { Dimension, allUnits } from "./TokenTypes/Dimension";
import type { DimensionUnit } from "./TokenTypes/Dimension";
import { Duration, durationUnits } from "./TokenTypes/Duration";
import type { DurationUnit } from "./TokenTypes/Duration";
import { isFirstClassValue } from "./type-classifiers";
import type {
  CompositeInput,
  CompositeTokenInput,
  CompositeValue,
  ThemeLayer,
  Token,
  TokenInput,
  TokenInputObject,
  TokenValue,
} from "./Token";

const isTokenInputObject = (v: unknown): v is TokenInputObject =>
  typeof v === "object" &&
  v !== null &&
  !Array.isArray(v) &&
  !isFirstClassValue(v) &&
  "value" in v;

const resolveTokenInput = (name: string, input: TokenInput): Omit<Token, "type"> => {
  if (Array.isArray(input)) {
    return { name, value: input[0], usage: input[1] };
  }

  if (isTokenInputObject(input)) {
    const { value, usage, modes } = input;
    const token: Omit<Token, "type"> = { name, value };
    if (usage) {
      token.usage = usage;
    }

    if (modes) {
      token.modes = modes;
    }
    return token;
  }

  return { name, value: input };
};

const resolveCompositeInput = (name: string, input: CompositeTokenInput): Omit<Token, "type"> => {
  if (Array.isArray(input)) {
    return { name, value: input[0], usage: input[1] };
  }

  if (typeof input === "object" && "value" in input && typeof input.value === "object") {
    const obj = input as { value: CompositeInput; usage?: string; modes?: Record<string, any> };
    const token: Omit<Token, "type"> = { name, value: obj.value };

    if (obj.usage) {
      token.usage = obj.usage;
    }

    if (obj.modes) {
      token.modes = obj.modes;
    }

    return token;
  }

  return { name, value: input as CompositeValue };
};

/**
 * Create a group of tokens sharing a type.
 *
 * Values can be:
 * - A plain value: `'#0066cc'` or `16` or `new Color(...)``
 * - A tuple: `['#0066cc', 'Primary brand color']`
 * - An object: `{ value: '#0066cc', usage: 'Primary brand color', modes: { dark: '#3399ff' } }`
 *
 * @example
 * ```ts
 * const colors = group('color', {
 *   primary: '#0066cc',
 *   secondary: ['#cc6600', 'Secondary brand color'],
 *   surface: { value: '#ffffff', modes: { dark: '#1a1a1a' } },
 * });
 * ```
 */
export const group = (type: string, entries: Record<string, TokenInput>): Token[] => {
  if (typeof entries !== "object" || entries === null || Array.isArray(entries)) {
    throw new TypeError(`group(): entries must be a plain object, got ${typeof entries}`);
  }

  return Object.entries(entries).map(([name, input]) => ({
    ...resolveTokenInput(name, input),
    type,
    group: type,
  }));
};

/**
 * Create a scale of tokens — useful for spacing, font sizes, z-indices, etc.
 *
 * @example
 * ```ts
 * const spacing = scale('spacing', {
 *   xs: '0.25rem',
 *   sm: '0.5rem',
 *   md: '1rem',
 *   lg: '1.5rem',
 * });
 *
 * // Or with a numeric array + transform:
 * const fontSizes = scale('fontSize', [10, 12, 14, 16, 18, 20, 24, 36], {
 *   transform: n => `${n * 0.0625}rem`,
 *   names: ['100', '200', '300', '400', '500', '600', '700', '800'],
 * });
 * ```
 */
export const scale = (
  type: string,
  values: Record<string, TokenInput> | number[],
  options?: { names?: string[]; transform?: (n: number) => TokenValue; usage?: string },
): Token[] => {
  if (!Array.isArray(values) && (typeof values !== "object" || values === null)) {
    throw new TypeError(`scale(): values must be a plain object or array, got ${typeof values}`);
  }

  if (Array.isArray(values)) {
    const { names, transform = (n: number) => n, usage } = options ?? {};
    return values.map((v, i) => {
      const name = names?.[i] ?? String(i);
      const token: Token = { name, value: transform(v), type, group: type };

      if (usage) {
        token.usage = usage;
      }

      return token;
    });
  }

  return group(type, values);
};

/**
 * Create a composite token (typography, border, shadow, etc.)
 *
 * @example
 * ```ts
 * const heading = composite('typography', {
 *   h1: { fontFamily: 'Rubik', fontSize: '2.5rem', fontWeight: 700, lineHeight: 1.2 },
 *   h2: { fontFamily: 'Rubik', fontSize: '2rem', fontWeight: 700, lineHeight: 1.3 },
 * });
 * ```
 */
export const composite = (type: string, entries: Record<string, CompositeTokenInput>): Token[] =>
  Object.entries(entries).map(([name, input]) => {
    const token = { ...resolveCompositeInput(name, input), type, group: type };
    const compositeValue = token.value;

    if (typeof compositeValue === "object" && compositeValue !== null && !isFirstClassValue(compositeValue) && !Array.isArray(compositeValue)) {
      for (const [field, fieldVal] of Object.entries(compositeValue as Record<string, unknown>)) {
        if (typeof fieldVal === "object" && fieldVal !== null && !isFirstClassValue(fieldVal) && !Array.isArray(fieldVal)) {
          throw new Error(`composite(): nested objects are not supported. Token "${name}" field "${field}" contains an object. Flatten your composite or split into separate tokens.`);
        }
      }
    }

    return token;
  });

/**
 * Determine the best contrasting text color (black or white) for a given background.
 *
 * @example
 * ```ts
 * onColor(new Color('#0066cc'))                // => white (dark bg)
 * onColor(new Color('#ffe335'))                // => dark (light bg)
 * onColor('#0066cc', { dark: '#222', light: '#fff' })
 * ```
 */
export const onColor = (
  color: Color | string,
  {
    dark = new Color(40, 50, 56),
    light = new Color(255, 255, 255),
  }: { dark?: Color | string; light?: Color | string } = {},
): Color => {
  const c = color instanceof Color ? color : new Color(color);
  const d = dark instanceof Color ? dark : new Color(dark);
  const l = light instanceof Color ? light : new Color(light);
  return c.luminance() > 0.5 ? d : l;
};

/**
 * Generate "on" color tokens for a set of named colors.
 *
 * For each entry in the input map, creates a token named `on{Name}` with
 * the best contrasting text color.
 *
 * @example
 * ```ts
 * const onColors = onColors('color', {
 *   primary: new Color('#0066cc'),
 *   secondary: new Color('#cc6600'),
 * });
 * // => [{ name: 'onPrimary', type: 'color', value: Color(white) }, ...]
 * ```
 */
export const onColors = (
  type: string,
  colors: Record<string, Color | string>,
  options?: { dark?: Color | string; light?: Color | string },
): Token[] =>
  Object.entries(colors).map(([name, color]) => ({
    name: `on${name.charAt(0).toUpperCase()}${name.slice(1)}`,
    type,
    group: type,
    value: onColor(color, options),
  }));

/**
 * Convert a pixel value to a rem-based Dimension (assuming 16px base).
 * The name `dp` stands for "density-independent pixel" — a concept borrowed
 * from Android's display system. In web terms: converts a px design spec
 * value to its rem equivalent.
 *
 * @example
 * ```ts
 * dp(16)  // => Dimension(1, 'rem')
 * dp(8)   // => Dimension(0.5, 'rem')
 * ```
 */
export const dp = (px: number): Dimension => {
  if (!Number.isFinite(px)) {
    throw new Error(`dp(): value must be a finite number, got ${px}`);
  }

  return new Dimension(px / 16, "rem");
};

/**
 * Create a Dimension value.
 *
 * @example
 * ```ts
 * dim(16, 'px')  // => Dimension(16, 'px')
 * dim(1, 'rem')  // => Dimension(1, 'rem')
 * ```
 */
export const dim = (value: number, unit: DimensionUnit): Dimension => {
  if (!Number.isFinite(value)) {
    throw new Error(`dim(): value must be a finite number, got ${value}`);
  }

  if (!allUnits.has(unit)) {
    throw new Error(`dim(): invalid unit "${unit}". Valid units: ${[...allUnits].join(", ")}`);
  }

  return new Dimension(value, unit);
};

/**
 * Create a Duration value.
 *
 * @example
 * ```ts
 * dur(200, 'ms')  // => Duration(200, 'ms')
 * dur(0.3, 's')   // => Duration(0.3, 's')
 * ```
 */
export const dur = (value: number, unit: DurationUnit): Duration => {
  if (!Number.isFinite(value)) {
    throw new Error(`dur(): value must be a finite number, got ${value}`);
  }

  if (!durationUnits.has(unit)) {
    throw new Error(`dur(): invalid unit "${unit}". Valid units: ${[...durationUnits].join(", ")}`);
  }

  return new Duration(value, unit);
};

/**
 * Merge multiple token arrays into one.
 *
 * @example
 * ```ts
 * const all = tokens(colors, spacing, fontSizes, typography);
 * ```
 */
export const tokens = (...groups: Token[][]): Token[] => groups.flat();

/**
 * Create a theme layer — a named partial override of a token set.
 *
 * @example
 * ```ts
 * const dark = theme('dark', colors, { background: '#1a1a1a', text: '#eee' });
 * const highContrast = theme('high-contrast', dark, { text: '#fff' });
 * ```
 */
export const theme = (
  name: string,
  source: Token[] | ThemeLayer,
  overrides: Record<string, TokenValue>,
): ThemeLayer => {
  const isTokenArray = Array.isArray(source);
  const tokenNames = isTokenArray ? source.map((t) => t.name) : source.tokenNames;
  const validNames = new Set(tokenNames);

  for (const key of Object.keys(overrides)) {
    if (!validNames.has(key)) {
      throw new Error(
        `Theme "${name}": unknown token "${key}". Available: ${tokenNames.join(", ")}`,
      );
    }
  }

  const merged = isTokenArray ? overrides : { ...source.overrides, ...overrides };
  return { name, tokenNames, overrides: merged };
};

/**
 * Create a token that references another token by name.
 * References are resolved before plugins run.
 *
 * @example
 * ```ts
 * const colors = group('color', {
 *   primary: '#0066cc',
 *   link: ref('primary'),
 *   linkHover: ref('primary', 'Hover state for links'),
 * });
 * ```
 */
export const ref = (tokenName: string, usage?: string): TokenInputObject => {
  if (!tokenName || typeof tokenName !== "string") {
    throw new Error(`ref(): token name must be a non-empty string`);
  }

  const result: TokenInputObject = { value: `{${tokenName}}` };
  if (usage) {
    result.usage = usage;
  }
  return result;
};

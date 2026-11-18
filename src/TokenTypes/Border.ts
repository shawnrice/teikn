import { splitTopLevelWhitespace } from '../string-utils.js';
import { Color } from './Color/index.js';
import { Dimension } from './Dimension.js';
import type { RefFields } from './ref-guard.js';
import { assertNotRef, isRefString } from './ref-guard.js';

// ─── Stroke styles ───────────────────────────────────────────
// The CSS line-style keyword set. These keywords are shared by most
// platforms (web, Android, Typst); platform-specific divergence — e.g.
// SVG-style dash arrays — is intentionally a generator concern, not baked
// into the value layer.

export const borderStyles: ReadonlySet<string> = new Set([
  'none',
  'hidden',
  'solid',
  'dashed',
  'dotted',
  'double',
  'groove',
  'ridge',
  'inset',
  'outset',
]);

export const isBorderStyle = (value: string): boolean => borderStyles.has(value);

// ─── Parsing ─────────────────────────────────────────────────

const numericRe = /^[+-]?\.?\d/;

// `border-width` takes a non-negative length: no percentage, no `fr`.
const assertWidth = (width: Dimension): Dimension => {
  if (width.value < 0 || width.unit === '%' || width.unit === 'fr') {
    throw new Error(`Invalid border width "${width}" — expected a non-negative length.`);
  }

  return width;
};

const parse = (css: string): { width: Dimension; style: string; color: Color | string } => {
  const fail = (): never => {
    throw new Error(
      `Invalid border: "${css}". Expected the CSS shorthand \`<width> <style> <color>\` ` +
        `(e.g. "1px solid #e0e0e0").`,
    );
  };

  // Paren-aware split so a space-separated color function (`rgb(255 0 0)`) isn't
  // shredded into `rgb(255`, `0`, `0)`.
  const parts = splitTopLevelWhitespace(css.trim());
  let width: Dimension | null = null;
  let style: string | null = null;
  let color: Color | string | null = null;

  // A repeated or unparseable part fails the whole shorthand.
  const attempt = <T>(seen: T | null, make: () => T): T => {
    if (seen !== null) {
      return fail();
    }

    try {
      return make();
    } catch {
      return fail();
    }
  };

  for (const part of parts) {
    if (isBorderStyle(part.toLowerCase())) {
      style = attempt(style, () => part.toLowerCase());
    } else if (numericRe.test(part)) {
      width = attempt(width, () => assertWidth(new Dimension(part)));
    } else if (isRefString(part)) {
      // A `{ref}` color is kept as a reference string; it resolves per-field later.
      color = attempt(color, () => part);
    } else {
      // Anything left is the color (named, hex, or function form). Tolerate a
      // parse failure here so the unified "Invalid border" error below reports
      // the whole shorthand rather than Color's per-token message.
      color = attempt(color, () => new Color(part));
    }
  }

  if (!width || !style || !color) {
    return fail();
  }

  return { width, style, color };
};

// ─── Field coercion ──────────────────────────────────────────
// Each coercion passes a `{ref}` string through untouched: references are
// resolved later by `resolve.ts` (which rebuilds the wrapper via the RefFields
// protocol), then the resolved concrete value flows back through these helpers.

const toWidth = (value: Dimension | string): Dimension | string => {
  if (value instanceof Dimension) {
    return assertWidth(value);
  }

  if (typeof value === 'number') {
    throw new Error(
      `Border width must carry a unit — pass a Dimension (e.g. \`dp(1)\` or \`dim(1, "px")\`) ` +
        `rather than the bare number ${value}.`,
    );
  }

  if (isRefString(value)) {
    return value;
  }

  return assertWidth(new Dimension(value));
};

const toStyle = (value: string): string => {
  const style = String(value).toLowerCase();

  if (isRefString(value)) {
    return value;
  }

  if (isBorderStyle(style)) {
    return style;
  }

  throw new Error(
    `Invalid border style "${value}". Valid styles: ${[...borderStyles].join(', ')}.`,
  );
};

const toColor = (value: Color | string): Color | string => {
  if (value instanceof Color || isRefString(value)) {
    return value;
  }

  return new Color(value);
};

// ─── Input ───────────────────────────────────────────────────

// Any field also accepts a `{tokenName}` reference string, resolved per-field.
export type BorderInput = { width: Dimension | string; style: string; color: Color | string };

// ─── Border ──────────────────────────────────────────────────

/**
 * A composite border value (DTCG `border`): width, line style, and color in
 * one named token, serializing to the CSS `border` shorthand.
 *
 * Any field may be a `{tokenName}` reference string, resolved per-field before
 * generation (the wrapper implements the {@link RefFields} protocol). A
 * whole-value reference, by contrast, should be the token value itself, not a
 * `Border` — see {@link assertNotRef}.
 *
 * @example
 * ```ts
 * new Border({ width: dp(1), style: "solid", color: "#e0e0e0" }).toString();
 * // "1px solid #e0e0e0"
 * new Border("2px dashed steelblue"); // parsed from the shorthand
 * new Border({ width: dp(1), style: "solid", color: "{color.border}" }); // per-field ref
 * ```
 */
export class Border implements RefFields {
  /** @internal brand — do not use directly; see `isFirstClassValue()` */
  readonly __teikn_fcv__: true = true;
  readonly #width: Dimension | string;
  readonly #style: string;
  readonly #color: Color | string;

  constructor(input: BorderInput | Border | string) {
    if (input instanceof Border) {
      this.#width = input.#width;
      this.#style = input.#style;
      this.#color = input.#color;

      return;
    }

    if (typeof input === 'string') {
      assertNotRef(input, 'Border');
      const parsed = parse(input);
      this.#width = parsed.width;
      this.#style = parsed.style;
      this.#color = parsed.color;

      return;
    }

    this.#width = toWidth(input.width);
    this.#style = toStyle(input.style);
    this.#color = toColor(input.color);
  }

  get width(): Dimension | string {
    return this.#width;
  }
  get style(): string {
    return this.#style;
  }
  get color(): Color | string {
    return this.#color;
  }

  // ─── Immutable setters ──────────────────────────────────────

  with(updates: Partial<BorderInput>): Border {
    return new Border({
      width: updates.width ?? this.#width,
      style: updates.style ?? this.#style,
      color: updates.color ?? this.#color,
    });
  }

  // ─── Per-field reference protocol ────────────────────────────

  /** @internal */
  __teikn_fields__(): Record<string, unknown> {
    return { width: this.#width, style: this.#style, color: this.#color };
  }

  /** @internal */
  // oxlint-disable-next-line class-methods-use-this -- protocol method, detected per-instance
  __teikn_fromFields__(fields: Record<string, unknown>): Border {
    return new Border(fields as BorderInput);
  }

  // ─── Serialization ──────────────────────────────────────────

  toJSON(): string {
    return this.toString();
  }

  /** CSS `border` shorthand: `width style color`. */
  toString(): string {
    return [String(this.#width), this.#style, String(this.#color)].join(' ');
  }

  // ─── Static helpers ──────────────────────────────────────────

  static from(value: Border | BorderInput | string): Border {
    return new Border(value);
  }
}

import { Dimension } from "./Dimension.js";
import type { RefFields } from "./ref-guard.js";
import { assertNotRef, isRefString } from "./ref-guard.js";

// ─── Field coercion ──────────────────────────────────────────
// Every coercion passes a `{ref}` string through untouched: references are
// resolved later by `resolve.ts` (which rebuilds the wrapper via the RefFields
// protocol), then the resolved concrete value flows back through these helpers.

// A font stack is one-or-more family names. We normalize an array to the
// comma-joined CSS form up front so every getter/serializer sees a single
// string — callers may still author it as `["Inter", "sans-serif"]`. A plain
// string (including a `{ref}`) passes through.
const toFamily = (value: string | readonly string[]): string =>
  Array.isArray(value) ? value.join(", ") : (value as string);

// fontSize / letterSpacing are lengths. We accept a `Dimension` or a CSS
// string and coerce to `Dimension`, mirroring how `Transition` coerces its
// `Duration` fields. A bare `number` is rejected: a length without a unit is
// ambiguous (px? rem?), and forcing the author to say `dim(16, "px")` / `dp(16)`
// keeps the unit explicit.
const toDimension = (value: Dimension | string, field: string): Dimension | string => {
  if (value instanceof Dimension) {
    return value;
  }
  if (typeof value === "number") {
    throw new Error(
      `Typography ${field} must carry a unit — pass a Dimension (e.g. \`dp(16)\` or ` +
        `\`dim(16, "px")\`) rather than the bare number ${value}.`,
    );
  }
  if (isRefString(value)) {
    return value;
  }
  return new Dimension(value);
};

// fontWeight / lineHeight are unitless numbers (see the DTCG `number` type).
// A numeric string is tolerated so authors can paste values from a spec.
const toNumber = (value: number | string, field: string): number | string => {
  if (isRefString(value)) {
    return value;
  }
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) {
    throw new Error(`Typography ${field} must be a finite number, got ${JSON.stringify(value)}`);
  }
  return n;
};

// letterSpacing is a length, except for the `"normal"` keyword which is
// preserved verbatim. Any other string is coerced to a Dimension.
const toLetterSpacing = (value: Dimension | string): Dimension | string => {
  if (value instanceof Dimension || value === "normal" || isRefString(value)) {
    return value;
  }
  return toDimension(value, "letterSpacing");
};

// ─── Input ───────────────────────────────────────────────────

// Any field also accepts a `{tokenName}` reference string, resolved per-field.
export type TypographyInput = {
  fontFamily: string | readonly string[];
  fontSize: Dimension | string;
  fontWeight?: number | string;
  lineHeight?: number | string;
  /** `"normal"`, a `Dimension`, or any CSS length string. */
  letterSpacing?: Dimension | string;
};

// ─── Typography ──────────────────────────────────────────────

/**
 * A composite typography value (DTCG `typography`): font family, size, weight,
 * line-height, and optional letter-spacing in one named token.
 *
 * Any field may be a `{tokenName}` reference string, resolved per-field before
 * generation (the wrapper implements the {@link RefFields} protocol). A
 * whole-value reference, by contrast, should be the token value itself, not a
 * `Typography` — see {@link assertNotRef}.
 *
 * `toString()` emits the CSS `font` shorthand. Note that `letterSpacing` is not
 * representable in that shorthand and is therefore omitted from it; the getter
 * still exposes it for generators (e.g. Html docs) that read fields directly.
 *
 * @example
 * ```ts
 * new Typography({
 *   fontFamily: ["Inter", "system-ui", "sans-serif"],
 *   fontSize: dp(16),
 *   fontWeight: 400,
 *   lineHeight: 1.5,
 * }).toString(); // "400 1rem/1.5 Inter, system-ui, sans-serif"
 *
 * // Per-field references:
 * new Typography({ fontFamily: "{font.body}", fontSize: "{fontSize.md}" });
 * ```
 */
export class Typography implements RefFields {
  /** @internal brand — do not use directly; see `isFirstClassValue()` */
  readonly __teikn_fcv__: true = true;
  readonly #fontFamily: string;
  readonly #fontSize: Dimension | string;
  readonly #fontWeight: number | string | null;
  readonly #lineHeight: number | string | null;
  readonly #letterSpacing: Dimension | string | null;

  constructor(input: TypographyInput | Typography) {
    if (input instanceof Typography) {
      this.#fontFamily = input.#fontFamily;
      this.#fontSize = input.#fontSize;
      this.#fontWeight = input.#fontWeight;
      this.#lineHeight = input.#lineHeight;
      this.#letterSpacing = input.#letterSpacing;
      return;
    }

    if (typeof input === "string") {
      assertNotRef(input, "Typography");
      throw new Error(
        `Typography cannot be parsed from a string — there is no unambiguous single-string form ` +
          `(letter-spacing is not part of the CSS \`font\` shorthand). Construct it from an object: ` +
          `\`new Typography({ fontFamily, fontSize, fontWeight, lineHeight })\`.`,
      );
    }

    this.#fontFamily = toFamily(input.fontFamily);
    this.#fontSize = toDimension(input.fontSize, "fontSize");
    this.#fontWeight =
      input.fontWeight !== undefined ? toNumber(input.fontWeight, "fontWeight") : null;
    this.#lineHeight =
      input.lineHeight !== undefined ? toNumber(input.lineHeight, "lineHeight") : null;
    this.#letterSpacing =
      input.letterSpacing === undefined ? null : toLetterSpacing(input.letterSpacing);
  }

  get fontFamily(): string {
    return this.#fontFamily;
  }
  get fontSize(): Dimension | string {
    return this.#fontSize;
  }
  get fontWeight(): number | string | null {
    return this.#fontWeight;
  }
  get lineHeight(): number | string | null {
    return this.#lineHeight;
  }
  get letterSpacing(): Dimension | string | null {
    return this.#letterSpacing;
  }

  // ─── Immutable setters ──────────────────────────────────────

  with(updates: Partial<TypographyInput>): Typography {
    const next: TypographyInput = {
      fontFamily: updates.fontFamily ?? this.#fontFamily,
      fontSize: updates.fontSize ?? this.#fontSize,
    };
    const fontWeight = updates.fontWeight ?? this.#fontWeight;
    if (fontWeight !== null) {
      next.fontWeight = fontWeight;
    }
    const lineHeight = updates.lineHeight ?? this.#lineHeight;
    if (lineHeight !== null) {
      next.lineHeight = lineHeight;
    }
    const letterSpacing = updates.letterSpacing ?? this.#letterSpacing;
    if (letterSpacing !== null) {
      next.letterSpacing = letterSpacing;
    }
    return new Typography(next);
  }

  // ─── Per-field reference protocol ────────────────────────────

  /** @internal */
  __teikn_fields__(): Record<string, unknown> {
    const fields: Record<string, unknown> = {
      fontFamily: this.#fontFamily,
      fontSize: this.#fontSize,
    };
    if (this.#fontWeight !== null) {
      fields.fontWeight = this.#fontWeight;
    }
    if (this.#lineHeight !== null) {
      fields.lineHeight = this.#lineHeight;
    }
    if (this.#letterSpacing !== null) {
      fields.letterSpacing = this.#letterSpacing;
    }
    return fields;
  }

  /** @internal */
  // oxlint-disable-next-line class-methods-use-this -- protocol method, detected per-instance
  __teikn_fromFields__(fields: Record<string, unknown>): Typography {
    return new Typography(fields as TypographyInput);
  }

  // ─── Serialization ──────────────────────────────────────────

  toJSON(): string {
    return this.toString();
  }

  /**
   * CSS `font` shorthand: `[weight] size[/line-height] family`. `letterSpacing`
   * is intentionally excluded — it has no place in the `font` shorthand.
   */
  toString(): string {
    const size = String(this.#fontSize);
    const sizeLine = this.#lineHeight !== null ? `${size}/${this.#lineHeight}` : size;
    return [this.#fontWeight !== null ? String(this.#fontWeight) : null, sizeLine, this.#fontFamily]
      .filter((part): part is string => part !== null)
      .join(" ");
  }

  // ─── Static helpers ──────────────────────────────────────────

  static from(value: Typography | TypographyInput): Typography {
    return new Typography(value);
  }
}

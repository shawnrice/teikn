const REF_RE = /^\{[^}]+\}$/;

/** True when `input` is a single `{tokenName}` reference string. */
export const isRefString = (input: unknown): input is string =>
  typeof input === 'string' && REF_RE.test(input.trim());

export const assertNotRef = (input: unknown, typeName: string): void => {
  if (!isRefString(input)) {
    return;
  }

  throw new Error(
    `${typeName} cannot be constructed from a reference string ${input.trim()}. ` +
      `A whole-value reference should be the token value itself, not wrapped. ` +
      `Either: (a) make the whole token value a reference (\`value: "${input.trim()}"\` with no wrapper), ` +
      `or (b) put the reference in a composite field — first-class wrappers that ` +
      `implement the RefFields protocol (Typography, Border) resolve per-field refs.`,
  );
};

// ─── Per-field reference protocol ────────────────────────────
// First-class composite wrappers (Typography, Border) can hold `{ref}` strings
// in their fields. They expose their fields so `resolve.ts` can resolve each
// one and rebuild the wrapper, and `validate.ts` can inspect them. Leaf values
// (Color, Dimension, …) do NOT implement this — a ref as their entire value is
// the token value, guarded by `assertNotRef`.

export type RefFields = {
  /**
   * The wrapper's current field values, some of which may be `{ref}` strings.
   * Only present (non-null) fields are returned.
   * @internal
   */
  __teikn_fields__(): Record<string, unknown>;
  /**
   * Rebuild this wrapper from a (resolved) field record. Coerces each field to
   * its concrete type, so callers may pass resolved values back in.
   * @internal
   */
  __teikn_fromFields__(fields: Record<string, unknown>): unknown;
};

export const hasRefFields = (value: unknown): value is RefFields =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as Partial<RefFields>).__teikn_fields__ === 'function' &&
  typeof (value as Partial<RefFields>).__teikn_fromFields__ === 'function';

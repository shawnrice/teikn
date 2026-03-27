import type { Token } from "./Token";

// ─── First-class value brand ─────────────────────────────────────
// Every first-class value type class carries a `__teikn_fcv__`
// property so we can detect them without importing every class.

// ─── First-class value check ─────────────────────────────────────
// Shared by resolve.ts and validate.ts to prevent composite
// destructuring of private-field objects into `{}`.

export const isFirstClassValue = (value: unknown): boolean =>
  typeof value === "object" && value !== null && "__teikn_fcv__" in (value as object);

// ─── Token type classifiers ──────────────────────────────────────
// Duplicated in HTML.ts and Storybook.ts — centralized here so
// those generators (and future ones) can import from one place.

export const isColorType = (type: string): boolean => type === "color";
export const isFontSizeType = (type: string): boolean => /font[-_]?size/i.test(type);
export const isFontFamilyType = (type: string): boolean => /font[-_]?family/i.test(type);
export const isFontWeightType = (type: string): boolean => /font[-_]?weight/i.test(type);
export const isTypographyType = (type: string): boolean => /^typography$/i.test(type);
export const isBorderRadiusType = (type: string): boolean => /border[-_]?radius/i.test(type);
export const isBorderType = (type: string): boolean => /^border$/i.test(type);
export const isShadowType = (type: string): boolean => /shadow/i.test(type);
export const isDurationType = (type: string): boolean => /duration/i.test(type);
export const isTimingType = (type: string): boolean => /timing|easing/i.test(type);
export const isSpacingType = (type: string): boolean => /spacing|gap/i.test(type);
export const isGradientType = (type: string): boolean => /gradient/i.test(type);
export const isOpacityType = (type: string): boolean => /^opacity$/i.test(type);
export const isLineHeightType = (type: string): boolean => /line[-_]?height/i.test(type);
export const isLetterSpacingType = (type: string): boolean => /letter[-_]?spacing/i.test(type);
export const isBreakpointType = (type: string): boolean => /breakpoint/i.test(type);
export const isSizeType = (type: string): boolean => /^size$/i.test(type);
export const isAspectRatioType = (type: string): boolean => /aspect[-_]?ratio/i.test(type);
export const isZLayerType = (type: string): boolean => /z[-_]?(layer|index)/i.test(type);
export const isTransitionType = (type: string): boolean => /^transition$/i.test(type);

// ─── Shared helpers ──────────────────────────────────────────

export const groupTokens = (tokens: Token[]): Map<string, Token[]> =>
  tokens.reduce((groups, token) => {
    const existing = groups.get(token.type) ?? [];
    return groups.set(token.type, [...existing, token]);
  }, new Map<string, Token[]>());

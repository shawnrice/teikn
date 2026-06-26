import type { PreviewKind, Token } from './Token.js';

// ─── First-class value brand ─────────────────────────────────────
// Every first-class value type class carries a `__teikn_fcv__`
// property so we can detect them without importing every class.

// ─── First-class value check ─────────────────────────────────────
// Shared by resolve.ts and validate.ts to prevent composite
// destructuring of private-field objects into `{}`.

export const isFirstClassValue = (value: unknown): boolean =>
  typeof value === 'object' && value !== null && '__teikn_fcv__' in (value as object);

// ─── Token type classifiers ──────────────────────────────────────
// Duplicated in HTML.ts and Storybook.ts — centralized here so
// those generators (and future ones) can import from one place.

export const isColorType = (type: string): boolean => type === 'color';
export const isFontSizeType = (type: string): boolean => /font[-_]?size/i.test(type);
export const isFontFamilyType = (type: string): boolean => /font[-_]?family/i.test(type);
export const isFontWeightType = (type: string): boolean => /font[-_]?weight/i.test(type);
export const isTypographyType = (type: string): boolean => /^typography$/i.test(type);
// Matches both the prefixed `border-radius` and the bare `radius` type
// that many token sets use (e.g. `radiusSm`, `radiusPill`).
export const isBorderRadiusType = (type: string): boolean => /(?:border[-_]?)?radius/i.test(type);
export const isBorderWidthType = (type: string): boolean => /border[-_]?width/i.test(type);
export const isBorderStyleType = (type: string): boolean => /border[-_]?style/i.test(type);
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

// ─── Type → preview-kind classification ──────────────────────
// The single, ordered source of truth for turning a token's `type` string
// into a visualization kind. First match wins, so SPECIFIC patterns must
// precede BROAD ones (e.g. letter-spacing before spacing, the border-* trio
// before bare border). Centralizing the priority here means the doc
// generators no longer each re-encode (and drift on) the ordering.

const previewRules: ReadonlyArray<readonly [PreviewKind, RegExp]> = [
  ['color', /^color$/i],
  ['typography', /^typography$/i],
  ['fontSize', /font[-_]?size/i],
  ['fontFamily', /font[-_]?family/i],
  ['fontWeight', /font[-_]?weight/i],
  ['letterSpacing', /letter[-_]?spacing/i],
  ['lineHeight', /line[-_]?height/i],
  ['borderWidth', /border[-_]?width/i],
  ['borderStyle', /border[-_]?style/i],
  ['borderRadius', /(?:border[-_]?)?radius/i],
  ['border', /^border$/i],
  ['shadow', /shadow/i],
  ['duration', /duration/i],
  ['timing', /timing|easing/i],
  ['spacing', /spacing|gap/i],
  ['gradient', /gradient/i],
  ['opacity', /^opacity$/i],
  ['breakpoint', /breakpoint/i],
  ['size', /^size$/i],
  ['aspectRatio', /aspect[-_]?ratio/i],
  ['zLayer', /z[-_]?(layer|index)/i],
  ['transition', /^transition$/i],
];

/**
 * Infer a {@link PreviewKind} from a token's `type` string. Falls back to
 * `"table"` (a generic name/value table) when nothing matches.
 */
export const classifyTokenType = (type: string): PreviewKind =>
  previewRules.find(([, re]) => re.test(type))?.[0] ?? 'table';

/**
 * Resolve how a token should be pictured: an explicit `preview` hint wins,
 * otherwise infer from `type`. This is the entry point the doc generators use.
 */
export const resolvePreviewKind = (token: Pick<Token, 'type' | 'preview'>): PreviewKind =>
  token.preview ?? classifyTokenType(token.type);

// ─── Shared helpers ──────────────────────────────────────────

export const groupTokens = (tokens: Token[]): Map<string, Token[]> =>
  tokens.reduce((groups, token) => {
    const existing = groups.get(token.type) ?? [];

    return groups.set(token.type, [...existing, token]);
  }, new Map<string, Token[]>());

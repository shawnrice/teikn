import type { BoxShadow, BoxShadowList } from "./TokenTypes/BoxShadow.js";
import type { Color } from "./TokenTypes/Color/index.js";
import type { CubicBezier } from "./TokenTypes/CubicBezier.js";
import type { Dimension } from "./TokenTypes/Dimension.js";
import type { Duration } from "./TokenTypes/Duration.js";
import type { GradientList, LinearGradient, RadialGradient } from "./TokenTypes/Gradient.js";
import type { Transition, TransitionList } from "./TokenTypes/Transition.js";

export type TokenValue =
  | string
  | number
  | Color
  | CubicBezier
  | BoxShadow
  | BoxShadowList
  | LinearGradient
  | RadialGradient
  | GradientList
  | Transition
  | TransitionList
  | Dimension
  | Duration;

export type CompositeValue = Record<string, TokenValue>;

export type ModeValues = Record<string, TokenValue | CompositeValue>;

/**
 * How a token should be *pictured* in the documentation generators
 * (`Storybook`, `Html`). This is purely presentational — it never affects
 * CSS/SCSS/JS/DTCG output. When a token doesn't carry one explicitly, the
 * doc generators infer it from `type` (see `classifyTokenType`).
 */
export type PreviewKind =
  | "color"
  | "typography"
  | "fontSize"
  | "fontFamily"
  | "fontWeight"
  | "letterSpacing"
  | "lineHeight"
  | "borderWidth"
  | "borderStyle"
  | "borderRadius"
  | "border"
  | "shadow"
  | "duration"
  | "timing"
  | "spacing"
  | "gradient"
  | "opacity"
  | "breakpoint"
  | "size"
  | "aspectRatio"
  | "zLayer"
  | "transition"
  | "table";

/**
 * The first argument to the group builders (`group`, `scale`, `composite`).
 * A bare string is the common case; the object form lets an author attach a
 * documentation-only `preview` hint at declaration time without changing the
 * builder's arity.
 */
export type TypeSpec = { type: string; preview?: PreviewKind };

export type Token = {
  name: string;
  value: TokenValue | CompositeValue;
  usage?: string;
  type: string;
  group?: string;
  modes?: ModeValues;
  /**
   * Documentation-only visualization hint. Set via the object form of a
   * builder's first argument (`group({ type, preview }, …)`). When absent,
   * doc generators infer the kind from `type`.
   */
  preview?: PreviewKind;
  /**
   * Set by `DeprecationPlugin`. When `true`, the token is deprecated.
   * When a string, generators may surface it as a deprecation reason.
   */
  deprecated?: boolean;
  /** Set by `DeprecationPlugin` when a replacement token is named. */
  replacement?: string;
};

export type TokenInput = TokenValue | [value: TokenValue, usage: string] | TokenInputObject;

export type TokenInputObject = {
  value: TokenValue | CompositeValue;
  usage?: string;
  modes?: ModeValues;
};

export type CompositeInput = Record<string, TokenValue>;

export type CompositeTokenInput =
  | CompositeInput
  | [value: CompositeInput, usage: string]
  | { value: CompositeInput; usage?: string; modes?: ModeValues };

/** A named partial override layer for theming. */
export type ThemeLayer = {
  name: string;
  tokenNames: string[];
  overrides: Record<string, TokenValue>;
};

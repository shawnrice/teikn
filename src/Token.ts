import type { BoxShadow, BoxShadowList } from "./TokenTypes/BoxShadow";
import type { Color } from "./TokenTypes/Color";
import type { CubicBezier } from "./TokenTypes/CubicBezier";
import type { Dimension } from "./TokenTypes/Dimension";
import type { Duration } from "./TokenTypes/Duration";
import type { GradientList, LinearGradient, RadialGradient } from "./TokenTypes/Gradient";
import type { Transition, TransitionList } from "./TokenTypes/Transition";

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

export type ModeValues = Record<string, any>;

// Token.value stays as `any` for backward compat — plugins and generators
// depend on untyped access. Conceptually: TokenValue | CompositeValue.
export type Token = {
  name: string;
  value: any;
  usage?: string;
  type: string;
  group?: string;
  modes?: ModeValues;
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

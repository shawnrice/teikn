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

export type Token = {
  name: string;
  value: TokenValue | CompositeValue;
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

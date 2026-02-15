import type { BoxShadow } from './BoxShadow';
import type { Color } from './Color';
import type { CubicBezier } from './CubicBezier';
import type { LinearGradient, RadialGradient } from './Gradient';
import type { Transition } from './Transition';

export type TokenValue = string | number | Color | CubicBezier | BoxShadow | LinearGradient | RadialGradient | Transition;

export type CompositeValue = Record<string, TokenValue>;

export type ModeValues = Record<string, any>;

// Token.value stays as `any` for backward compat — plugins and generators
// already depend on untyped access. The builder functions provide type
// safety at the construction boundary.
export interface Token {
  name: string;
  value: any;
  usage?: string;
  type: string;
  group?: string;
  modes?: ModeValues;
}

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

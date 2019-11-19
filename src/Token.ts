export type TokenTypes = 'color' | 'font' | 'font-family';

export interface Token<Types extends TokenTypes = TokenTypes> {
  name: string;
  value: any;
  usage?: string;
  type: Types;
}

export interface ColorToken extends Token<'color'> {}

export interface FontToken extends Token<'font'> {}

export interface FontFamilyToken extends Token<'font-family'> {}

export enum ColorTransformPreference {
  HSL = 'HSL',
  HSLA = 'HSLA',
  RGB = 'RGB',
  RGBA = 'RGBA',
  HEX = 'HEX',
  HEX6 = 'HEX6',
}

export interface TokenTransformOptions {
  color?: ColorTransformPreference;
}

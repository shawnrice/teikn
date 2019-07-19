export type TokenTypes = 'color' | 'font' | 'font-family';

export interface Token<Types extends TokenTypes = TokenTypes> {
  name: string;
  value: any;
  usage?: string;
  type: Types;
}

export interface ColorToken extends Token<'color'> { }

export enum ColorTransformPreference {
  HSL = 'HSL',
  RGB = 'RGB',
  RGBA = 'RGBA',
  HEX = 'HEX',
  HEX6 = 'HEX6',
}

export interface TokenTransformOptions {
  color?: ColorTransformPreference;
}

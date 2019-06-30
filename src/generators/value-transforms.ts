import Color from 'color';
import { Token } from './Generator';

export interface TokenTransformOptions {
  preferHsl?: boolean;
  preferRgb?: boolean;
  preferRgba?: boolean;
  preferHex?: boolean;
}

export const transformValue = (token: Token, options: TokenTransformOptions) => {
  const { type, value } = token;
  switch (type) {
    case 'color':
      return transformColorValue(value, options);
    default:
      return value;
  }
};

// const separateValueAndUnit = value => {
//   const num = parseFloat(value.trim());
//   const units = value.trim().replace(`${num}`, '');

//   return { num, units };
// };

// const transformTimeValue = (value, options) => {
//   const { preferMilliseconds, preferSecond } = options;
//   const { num, units } = separateValueAndUnit(value);
// };

const transformColorValue = (value: string, options: TokenTransformOptions) => {
  const { preferHsl, preferRgb, preferRgba, preferHex } = options;

  const color = Color(value);

  if (preferHex) {
    // hex encodes this as black, so just leave it be
    return value.toLowerCase() === 'transparent' ? value.toLowerCase() : color.hex().toLowerCase();
  }

  if (preferRgba) {
    return `rgba(${color.red()}, ${color.green()}, ${color.blue()}, ${color.alpha()})`;
  }

  if (preferRgb) {
    return color.rgb().string(3);
  }

  if (preferHsl) {
    return color.hsl().string(3);
  }

  if (value.toLowerCase() === 'transparent') {
    return value.toLowerCase();
  }

  return color.hex().toLowerCase();
};

export default transformValue;

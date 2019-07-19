import Color from 'color';
import { Token, TokenTransformOptions, ColorTransformPreference } from './Token';



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

export const transformColorValue = (value: string, options: TokenTransformOptions) => {
  const { color: colorPreference } = options;

  const color = Color(value);

  if (value.toLowerCase() === 'transparent') {
    return value.toLowerCase();
  }

  switch (colorPreference) {
    case ColorTransformPreference.HSL:
      return color.hsl().string(3);
    case ColorTransformPreference.RGBA:
      return `rgba(${color.red()}, ${color.green()}, ${color.blue()}, ${color.alpha()})`;
    case ColorTransformPreference.RGB:
      return color.rgb().string(3);
    case ColorTransformPreference.HEX6:
    // TODO figure out the color function to abbreviate the hex
    case ColorTransformPreference.HEX:
    // FALLTHROUGH
    default:
      return color.hex().toLowerCase();
  }

};

export default transformValue;

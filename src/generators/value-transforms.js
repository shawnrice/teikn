const Color = require('color');

const transformValue = (value, type, options) => {
  switch (type) {
    case 'color':
      return transformColorValue(value, options);
    default:
      return value;
  }
};

const separateValueAndUnit = value => {
  const num = parseFloat(value.trim());
  const units = value.trim().replace(`${num}`, '');

  return {
    num,
    units,
  };
};

const transformTimeValue = (value, options) => {
  const { preferMilliseconds, preferSecond } = options;
  const { num, units } = separateValueAndUnit(value);
};

const transformColorValue = (value, options) => {
  const { preferHsl, preferRgb, preferRgba, preferHex } = options;

  const color = Color(value);

  if (preferHex) {
    // hex encodes this as black, so just leave it be
    return value.toLowerCase() === 'transparent' ? value.toLowerCase() : color.hex().toLowerCase();
  }

  if (preferRgba) {
    color.rgba().string(3);
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

module.exports = {
  transformValue,
  transformColorValue,
};

import { hexToRGB } from './hexToRGB';
import { namedColors } from './namedColors';

const hexRegex = /^(#)?[a-f0-9]{3,6}$/i;

const RGBRegex = /^rgb\(([0-9]{1,3}),[\s]*([0-9]{1,3}),[\s]*([0-9]{1,3})\)$/i;

const RGBARegex = /^rgba\([\s]*([0-9]{1,3}),[\s]*([0-9]{1,3}),[\s]*([0-9]{1,3}),[\s]*([0-9.]+)\)$/i;

const parseInt10 = (x: string) => parseInt(x, 10);

const inRange = (lower: number, upper: number, number: number) =>
  lower <= number && number <= upper;

const isHexRange = (x: number) => inRange(0, 255, x);

const isPercentRange = (x: number) => inRange(0, 1, x);

const isHexColor = (c: string) => hexRegex.test(c);

const isRGBColor = (c: string) => {
  if (!RGBRegex.test(c.trim())) {
    return false;
  }

  const matches = c.trim().match(RGBRegex);

  if (!matches) {
    return false;
  }

  return matches
    .slice(1)
    .map(parseInt10)
    .every(isHexRange);
};

const isRGBAColor = (c: string) => {
  if (!RGBARegex.test(c.trim())) {
    return false;
  }

  const matches = c.trim().match(RGBARegex);

  /* istanbul ignore next */
  if (!matches) {
    return false;
  }

  const [, r, g, b, a] = matches;

  return (
    [r, g, b].map(parseInt10).every(isHexRange) && isPercentRange(parseFloat(a))
  );
};

export type RGBATuple = [number, number, number, number];

export const stringToRGBA = (c: string): RGBATuple => {
  if (Object.keys(namedColors).includes(c.toLowerCase())) {
    // @ts-ignore: we've already checked for the key
    return stringToRGBA(namedColors[c.toLowerCase()]);
  }

  if (isHexColor(c)) {
    return [...hexToRGB(c), 1] as RGBATuple;
  }

  if (isRGBColor(c)) {
    const [, r, g, b] = c
      .match(RGBRegex)!
      .slice(1)
      .map(parseInt10);

    return [r, g, b, 1] as RGBATuple;
  }

  if (isRGBAColor(c)) {
    const [, r, g, b, a] = c.match(RGBARegex)!;

    return [r, g, b].map(parseInt10).concat(parseFloat(a)) as RGBATuple;
  }

  throw new Error(`Cannot extract color from "${c}"`);
};

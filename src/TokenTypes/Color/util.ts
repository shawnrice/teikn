import { clamp } from '../../utils.js';

/** Compose two unary functions: `pipe(f, g)(x)` === `g(f(x))` */
export const pipe =
  <A, B, C>(f: (a: A) => B, g: (b: B) => C) =>
  (a: A): C =>
    g(f(a));

export { clamp };
export const pad0 = (x: string): string => (x.toString().length < 2 ? `0${x}` : x);
export const hexRange = (num: number): number => clamp(0, 255, num);
export const percentRange = (num: number): number => clamp(0, 1, num);
export const degreeRange = (num: number): number => clamp(0, 360, num);

/** Clamp to 0-255 and round to an integer channel value */
export const byteRange = (num: number): number => Math.round(hexRange(num));

/** Normalize any angle to 0-359 range via modular arithmetic */
export const normalizeDegrees = (hue: number): number =>
  hue >= 0 && hue < 360 ? hue + 0 : ((hue % 360) + 360) % 360;

export const byteToUnit = (x: number): number => x / 255;
export const unitToByte = (x: number): number => Math.round(x * 255);

export const round = (digits: number, n: number): number =>
  Math.round(n * 10 ** digits) / 10 ** digits;

export const roundArray =
  (numbers: number[]) =>
  (arr: number[]): number[] =>
    arr.map((v, i) => round(numbers[i] ?? 0, v));

export const roundHSL: (arr: number[]) => number[] = roundArray([0, 2, 2]);

export const toPercentage = (n: number, precision = 0): number =>
  Math.round(n * 10 ** (2 + precision)) / 10 ** precision;

export const toPercent = (n: number, precision = 0): string => `${toPercentage(n, precision)}%`;

export const parseInt16 = (x: string): number => parseInt(x, 16);

const hexRegex = /^#?(?:[a-f0-9]{3,4}|[a-f0-9]{6}|[a-f0-9]{8})$/i;

export const isHex = (color: string): boolean => hexRegex.test(color.trim());

export const assertFinite = (label: string, values: readonly number[]): void => {
  if (!values.every(Number.isFinite)) {
    throw new Error(`Color: ${label} must be finite, got (${values.join(', ')})`);
  }
};

type Triple = readonly [number, number, number];
type MixOperand = { data: Triple; alpha: number };

/** Premultiplied-alpha interpolation, as CSS `color-mix` does */
export const mixPremultiplied = ({
  from,
  to,
  amount,
}: {
  from: MixOperand;
  to: MixOperand;
  amount: number;
}): { data: [number, number, number]; alpha: number } => {
  assertFinite('mix amount', [amount]);

  const t = percentRange(amount);
  const alpha = from.alpha * (1 - t) + to.alpha * t;

  if (alpha === 0) {
    return { data: [0, 0, 0], alpha: 0 };
  }

  const data = from.data.map(
    (v, i) => (v * from.alpha * (1 - t) + to.data[i]! * to.alpha * t) / alpha,
  ) as [number, number, number];

  return { data, alpha };
};

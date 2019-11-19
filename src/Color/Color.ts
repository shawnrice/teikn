import { HSLToRGB } from './HSLToRGB';
import { namedColorsByValue, NamedColorValue } from './namedColors';
import { RGBToHex } from './RGBToHex';
import { RGBToHSL } from './RGBToHSL';
import { stringToRGBA } from './stringToRGBA';

const clamp = (min: number, max: number, n: number) =>
  Math.min(Math.max(n, min), max);

const checkNumberInRange = (
  bounds: { lower: number; upper: number },
  n: number,
) => {
  const { lower, upper } = bounds;

  if (typeof n !== 'number') {
    throw new TypeError(`Must be a number`);
  }

  if (n < lower || n < upper) {
    throw new TypeError(`Must be between ${lower} and ${upper}`);
  }
};

const ensurePercentage = (p: number) => {
  checkNumberInRange({ lower: 0, upper: 1 }, p);
  return p;
};

const ensureHex = (c: number) => {
  checkNumberInRange({ lower: 0, upper: 255 }, c);
  return c;
};

export const round = (digits: number, n: number) =>
  Math.round(n * 10 ** digits) / 10 ** digits;

export const roundArray = (nums: number[]) => (arr: number[]) =>
  arr.map((v, i) => round(nums[i], v));

export const roundHSL = roundArray([0, 2, 2]);

const toPercentage = (n: number, precision = 0) =>
  Math.round(n * 10 ** (2 + precision)) / 10 ** precision;

export class Color {
  red: number;

  blue: number;

  green: number;

  alpha: number;

  constructor(color: string);

  constructor(r: number, g: number, b: number, a?: number);

  constructor(r: string | number, g?: number, b?: number, a?: number) {
    if (typeof r === 'string') {
      const [red, green, blue, alpha] = stringToRGBA(r);
      this.red = red;
      this.green = green;
      this.blue = blue;
      this.alpha = alpha;
      return this;
    }

    if (
      typeof r === 'number' &&
      typeof g === 'number' &&
      typeof b === 'number'
    ) {
      this.red = r;
      this.green = g;
      this.blue = b;
      this.alpha = typeof a === 'number' ? clamp(0, 1, a) : 1;
      return this;
    }

    throw new Error('Bad constructor');
  }

  setRed(red: number) {
    this.red = ensureHex(red);
    return this;
  }

  setGreen(green: number) {
    this.green = ensureHex(green);
    return this;
  }

  setBlue(blue: number) {
    this.blue = ensureHex(blue);
    return this;
  }

  setAlpha(alpha: number) {
    this.alpha = ensurePercentage(alpha);
    return this;
  }

  private setRGBA(r?: number, g?: number, b?: number, a?: number) {
    this.red = typeof r !== 'undefined' ? r : this.red;
    this.green = typeof g !== 'undefined' ? g : this.green;
    this.blue = typeof b !== 'undefined' ? b : this.blue;
    this.alpha = typeof a !== 'undefined' ? a : this.alpha;
    return this;
  }

  get hue() {
    const [hue] = this.asHSL();
    return hue;
  }

  rotateHue(degrees: number) {
    const [hue, s, l] = this.asHSL();
    return this.setRGBA(...HSLToRGB((hue + degrees) % 360, s, l));
  }

  complement() {
    return this.rotateHue(180);
  }

  invert() {
    const [r, g, b] = this.asRGB();
    return this.setRGBA(0xff ^ r, 0xff ^ g, 0xff ^ b);
  }

  set hue(val: number) {
    const [, s, l] = this.asHSL();
    const hue = clamp(0, 360, val);
    const [r, g, b] = HSLToRGB(hue, s, l);
    this.setRGBA(r, g, b);
  }

  get saturation() {
    const [, saturation] = this.asHSL();
    return saturation;
  }

  set saturation(val: number) {
    const [h, , l] = this.asHSL();
    const saturation = clamp(0, 1, val);
    const [r, g, b] = HSLToRGB(h, saturation, l);
    this.setRGBA(r, g, b);
  }

  get lightness() {
    const [, , lightness] = this.asHSL();
    return lightness;
  }

  set lightness(lightness: number) {
    const [h, s] = this.asHSL();
    const [red, green, blue] = HSLToRGB(h, s, clamp(0, 1, lightness));
    this.setRGBA(red, green, blue);
  }

  /**
   * Adds one color to another by averaging their [`r`, `g`, `b`, `a`] components
   */
  add(color: Color | string) {
    const c = color instanceof Color ? color : new Color(color);
    const otherRGBA = c.asRGBA();
    const [r, g, b, a] = [...this.asRGBA()].reduce(
      (acc, val, index) => [...acc, Math.round((otherRGBA[index] + val) / 2)],
      [] as number[],
    );

    return this.setRGBA(r, g, b, a);
  }

  /**
   * Returns the color as `[hue ∈[0, 360], saturation ∈[0, 1], lightness ∈[0, 1]]`
   */
  asHSL() {
    const { red, green, blue } = this;
    return RGBToHSL(red, green, blue);
  }

  /**
   * Returns the color as `[red ∈[0, 255], green ∈[0, 255], blue ∈[0, 255]]`
   */
  asRGB() {
    const { red, green, blue } = this;
    return [red, green, blue] as const;
  }

  /**
   * Returns the color as `[red ∈[0, 255], green ∈[0, 255], blue ∈[0, 255], alpha ∈[0, 1]]`
   */
  asRGBA() {
    const { red, green, blue, alpha } = this;
    return [red, green, blue, alpha] as const;
  }

  /**
   * Sets the lightness of the color (as in HSL), lightness: `∈[0, 1]`
   */
  setLightness(lightness: number) {
    const [h, s] = this.asHSL();
    const [red, green, blue] = HSLToRGB(h, s, clamp(0, 1, lightness));

    return this.setRGBA(red, green, blue);
  }

  /**
   * Lightens a color by a percetage, amount: `∈[0, 1]`
   *
   * Works like scaling a color's lightness in SCSS
   */
  lighten(amount: number) {
    const lightness = this.lightness;

    return this.setLightness(lightness + amount * lightness);
  }

  /**
   * Darkens a color by a percentage, amount: `∈[0, 1]`
   */
  darken(amount: number) {
    return this.lighten(amount * -1);
  }

  // tint(amount: number) {
  //   this.add(Array.from({ length: 3}).map(() => 255 * amount)
  // }

  /**
   * Gets the perceptual luminance of a color
   *
   * Note: `Color.luminance()` does not take into account alpha
   *
   * @see https://www.w3.org/TR/WCAG20-TECHS/G17.html#G17-tests
   */
  luminance() {
    const [red, green, blue] = this.asRGB().map(x => x / 255);
    const val = (x: number) =>
      x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
    return (
      0.2126 * val(red) + 0.7152 * val(green) + 0.0722 * val(blue)
      // Math.sqrt(0.299 * red ** 2 + 0.587 * green ** 2 + 0.114 * blue ** 2) / 255
    );
  }

  /**
   * Outputs the color as a string
   *
   * - If request is `named`, then it will attempt a named color, but fallback to `rgb`
   * - For `hex3`, it will return an abbreviated hex if possible but fallback to a full hex
   * - Default: `rgba` if the alpha is not `1`, but `rgb` if the alpha is `1`
   */
  toString(
    type?: 'rgb' | 'rgba' | 'hex' | 'hex3' | 'hsl' | 'hsla' | 'named',
  ): string {
    const [red, green, blue, alpha] = [...this.asRGBA()];
    const [hue, saturation, lightness] = roundHSL([...this.asHSL()]);

    switch (type) {
      case 'named':
        if (this.toString('rgba') === 'rgba(0, 0, 0, 0)') {
          return 'transparent';
        }
        return (
          namedColorsByValue[this.toString('hex') as NamedColorValue] ??
          this.toString('rgb')
        );
      case 'rgb':
        return `rgb(${red}, ${green}, ${blue})`;
      case 'rgba':
        return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
      case 'hex':
        return `#${RGBToHex(red, green, blue, false)}`;
      case 'hex3':
        return `#${RGBToHex(red, green, blue, true)}`;
      case 'hsl':
        return `hsl(${hue}, ${toPercentage(saturation)}%, ${toPercentage(
          lightness,
        )}%)`;
      case 'hsla':
        return `hsla(${hue}, ${toPercentage(saturation)}%, ${toPercentage(
          lightness,
        )}%, ${alpha})`;
      default:
        return alpha === 1
          ? `rgb(${red}, ${green}, ${blue})`
          : `rgba(${red}, ${green}, ${blue}, ${alpha})`;
    }
  }
}

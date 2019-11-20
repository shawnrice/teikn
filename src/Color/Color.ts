import { HSLToRGB } from './HSLToRGB';
import { namedColorsByValue, NamedColorValue } from './namedColors';
import { RGBToHex } from './RGBToHex';
import { RGBToHSL } from './RGBToHSL';
import { stringToRGBA } from './stringToRGBA';

const clamp = (min: number, max: number, n: number) => Math.min(Math.max(n, min), max);

const checkNumberInRange = (bounds: { lower: number; upper: number }, n: number) => {
  const { lower, upper } = bounds;

  if (typeof n !== 'number') {
    throw new TypeError(`Must be a number`);
  }

  if (n < lower || upper < n) {
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

export const round = (digits: number, n: number) => Math.round(n * 10 ** digits) / 10 ** digits;

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

    if (typeof r === 'number' && typeof g === 'number' && typeof b === 'number') {
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

  invert() {
    const [r, g, b] = this.asRGB();
    return this.setRGBA(0xff ^ r, 0xff ^ g, 0xff ^ b);
  }

  get hue() {
    const [hue] = this.asHSL();
    return hue;
  }

  set hue(val: number) {
    const [, s, l] = this.asHSL();
    const hue = clamp(0, 360, val);
    const [r, g, b] = HSLToRGB(hue, s, l);
    this.setRGBA(r, g, b);
  }

  setHue(hue: number) {
    this.hue = hue;
    return this;
  }

  rotateHue(degrees: number) {
    this.hue = (this.hue + degrees) % 360;
    return this;
  }

  complement() {
    return this.rotateHue(180);
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

  setSaturation(saturation: number) {
    this.saturation = saturation;
    return this;
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
   * Sets the lightness of the color (as in HSL), lightness: `∈[0, 1]`
   */
  setLightness(lightness: number) {
    this.lightness = lightness;
    return this;
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

  /**
   * Mixes a color with `amount% white`
   */
  tint(amount: number) {
    const [r, g, b] = this.asRGB().map(c => clamp(0, 255, Math.round(c + 255 * amount)));
    return this.setRGBA(r, g, b);
  }

  /**
   * Mixes a color with `amount% black`
   */
  shade(amount: number) {
    const [r, g, b] = this.asRGB().map(c => clamp(0, 255, Math.round(c * (1 - amount))));
    return this.setRGBA(r, g, b);
  }

  /**
   * Adds one color to another by averaging their [`r`, `g`, `b`, `a`] components
   */
  mix(color: Color | string) {
    const c = color instanceof Color ? color : new Color(color);
    const otherRGBA = c.asRGBA();
    const [r, g, b, a] = [...this.asRGBA()].reduce(
      (acc, val, index) => [...acc, Math.round((otherRGBA[index] + val) / 2)],
      [] as number[],
    );

    return this.setRGBA(r, g, b, a);
  }

  /**
   * Gets the perceptual luminance of a color
   *
   * Note: `Color.luminance()` does not take into account alpha
   *
   * @see https://www.w3.org/TR/WCAG20-TECHS/G17.html#G17-testsq
   */
  luminance() {
    const [red, green, blue] = this.asRGB().map(x => x / 255);
    const val = (x: number) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);
    return 0.2126 * val(red) + 0.7152 * val(green) + 0.0722 * val(blue);
  }

  /**
   *
   * @see https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
   */
  contrastRatio(color: Color) {
    const colors = [this.luminance(), color.luminance()].map(x => x + 0.05);

    return Math.max(...colors) / Math.min(...colors);
  }

  /**
   * Checks if a text contrast is sufficient for WCAG2
   *
   * (Large text means `14pt + bold` or `18pt regular`)
   *
   * @see https://www.w3.org/TR/WCAG21/#contrast-minimum
   */
  isTextWCAG2CompliantWith(color: Color, largeText = false) {
    return this.contrastRatio(color) >= (largeText ? 3 : 4.5);
  }

  /**
   * Checks if a text contrast is sufficient for WCAG3
   *
   * (Large text means `14pt + bold` or `18pt regular`)
   *
   * @see https://www.w3.org/TR/WCAG21/#contrast-enhanced
   */
  isTextWCAG3CompliantWith(color: Color, largeText = false) {
    return this.contrastRatio(color) >= (largeText ? 4.5 : 7);
  }

  /**
   * Checks if a non-text UI color contrast is sufficient
   *
   * @see https://www.w3.org/TR/WCAG21/#non-text-contrast
   */
  isUIWCAGCompliantWith(color: Color) {
    return this.contrastRatio(color) >= 3;
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
   * Outputs the color as a string
   *
   * - If request is `named`, then it will attempt a named color, but fallback to `rgb`
   * - For `hex3`, it will return an abbreviated hex if possible but fallback to a full hex
   * - Default: `rgba` if the alpha is not `1`, but `rgb` if the alpha is `1`
   */
  toString(type?: 'rgb' | 'rgba' | 'hex' | 'hex3' | 'hsl' | 'hsla' | 'named'): string {
    const [red, green, blue, alpha] = [...this.asRGBA()];
    const [hue, saturation, lightness] = roundHSL([...this.asHSL()]);

    const when = (condition: boolean) => (a: string, b: string) => (condition ? a : b);
    const isOpaque = alpha === 1;
    const whenOpaque = when(isOpaque);

    const rgb = `rgb(${red}, ${green}, ${blue})`;
    const rgba = `rgba(${red}, ${green}, ${blue}, ${alpha})`;

    const hsl = `hsl(${hue}, ${toPercentage(saturation)}%, ${toPercentage(lightness)}%)`;
    // prettier-ignore
    const hsla = `hsla(${hue}, ${toPercentage(saturation)}%, ${toPercentage(lightness)}%, ${alpha})`;

    switch (type) {
      case 'named':
        if (this.toString('rgba') === 'rgba(0, 0, 0, 0)') {
          return 'transparent';
        }
        return namedColorsByValue[this.toString('hex') as NamedColorValue] ?? this.toString('rgb');
      case 'rgb':
        return whenOpaque(rgb, rgba);
      case 'rgba':
        return rgba;
      case 'hex':
        return `#${RGBToHex(red, green, blue, false)}`;
      case 'hex3':
        return `#${RGBToHex(red, green, blue, true)}`;
      case 'hsl':
        return whenOpaque(hsl, hsla);
      case 'hsla':
        return hsla;
      default:
        return whenOpaque(rgb, rgba);
    }
  }
}

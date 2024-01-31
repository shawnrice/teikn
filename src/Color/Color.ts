import { HSLToRGB } from './HSLToRGB';
import { namedColorsByValue, NamedColorValue } from './namedColors';
import { RGBToHex } from './RGBToHex';
import { RGBToHSL } from './RGBToHSL';
import { stringToRGBA } from './stringToRGBA';

const clamp = (min: number, max: number, n: number) => Math.min(Math.max(n, min), max);

const hexRange = (num: number) => clamp(0, 255, num);

const percentRange = (num: number) => clamp(0, 1, num);

const degreeRange = (num: number) => clamp(0, 360, num);

const hsl = (h: number, s: number, l: number) => `hsl(${h}, ${toPercent(s)}, ${toPercent(l)})`;
const hsla = (h: number, s: number, l: number, a: number) =>
  `hsla(${h}, ${toPercent(s)}, ${toPercent(l)}, ${a})`;

const checkNumberInRange = (bounds: { lower: number; upper: number }, n: number) => {
  const { lower, upper } = bounds;

  if (typeof n !== 'number') {
    throw new TypeError(`Must be a number`);
  }

  if (n < lower || upper < n) {
    throw new TypeError(`Must be between ${lower} and ${upper}`);
  }
};

const ensureHex = (c: number): number => {
  checkNumberInRange({ lower: 0, upper: 255 }, c);
  return c;
};

export const round = (digits: number, n: number): number =>
  Math.round(n * 10 ** digits) / 10 ** digits;

export const roundArray =
  (numbers: number[]) =>
  (arr: number[]): number[] =>
    arr.map((v, i) => round(numbers[i], v));

export const roundHSL = roundArray([0, 2, 2]);

const toPercentage = (n: number, precision = 0): number =>
  Math.round(n * 10 ** (2 + precision)) / 10 ** precision;

const toPercent = (n: number, precision = 0): string => `${toPercentage(n, precision)}%`;

export class Color {
  red: number;

  blue: number;

  green: number;

  alpha: number;

  constructor(color: string | Color);

  constructor(r: number, g: number, b: number, a?: number);

  constructor(r: string | Color | number, g?: number, b?: number, a?: number) {
    if (r instanceof Color) {
      this.red = r.red;
      this.green = r.green;
      this.blue = r.blue;
      this.alpha = r.alpha;
      return this;
    }

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
      this.alpha = typeof a === 'number' ? percentRange(a) : 1;
      return this;
    }

    throw new Error('Bad constructor');
  }

  static from(color: Color): Color {
    return new Color(color);
  }

  setRed(red: number): Color {
    return Object.assign(Color.from(this), { red: ensureHex(red) });
  }

  setGreen(green: number): Color {
    return Object.assign(Color.from(this), { green: ensureHex(green) });
  }

  setBlue(blue: number): Color {
    return Object.assign(Color.from(this), { blue: ensureHex(blue) });
  }

  setAlpha(alpha: number): Color {
    return Object.assign(Color.from(this), { alpha: ensureHex(alpha) });
  }

  private setRGBA(r?: number, g?: number, b?: number, a?: number): Color {
    return Object.assign(Color.from(this), {
      red: r ?? this.red,
      green: g ?? this.green,
      blue: b ?? this.blue,
      alpha: a ?? this.alpha,
    });
  }

  invert(): Color {
    const [r, g, b] = this.asRGB();
    return this.setRGBA(0xff ^ r, 0xff ^ g, 0xff ^ b);
  }

  get hue(): number {
    const [hue] = this.asHSL();
    return hue;
  }

  set hue(val: number) {
    const [, s, l] = this.asHSL();
    const [red, green, blue] = HSLToRGB(clamp(0, 360, val), s, l);
    Object.assign(this, { red, green, blue });
  }

  setHue(hue: number): Color {
    const [, s, l] = this.asHSL();
    return this.setRGBA(...HSLToRGB(degreeRange(hue), s, l));
  }

  rotateHue(degrees: number): Color {
    return this.setHue((this.hue + degrees) % 360);
  }

  complement(): Color {
    return this.rotateHue(180);
  }

  get saturation(): number {
    const [, saturation] = this.asHSL();
    return saturation;
  }

  set saturation(val: number) {
    const [h, , l] = this.asHSL();
    const [red, green, blue] = HSLToRGB(h, percentRange(val), l);
    Object.assign(this, { red, green, blue });
  }

  setSaturation(saturation: number): Color {
    const [h, , l] = this.asHSL();
    return this.setRGBA(...HSLToRGB(h, percentRange(saturation), l));
  }

  get lightness(): number {
    const [, , lightness] = this.asHSL();
    return lightness;
  }

  set lightness(lightness: number) {
    const [h, s] = this.asHSL();
    const [red, green, blue] = HSLToRGB(h, s, percentRange(lightness));
    Object.assign(this, { red, green, blue });
  }

  /**
   * Sets the lightness of the color (as in HSL), lightness: `∈[0, 1]`
   */
  setLightness(lightness: number): Color {
    const [h, s] = this.asHSL();
    return this.setRGBA(...HSLToRGB(h, s, percentRange(lightness)));
  }

  /**
   * Lightens a color by a percentage, amount: `∈[0, 1]`
   *
   * Works like scaling a color's lightness in SCSS
   */
  lighten(amount: number): Color {
    const lightness = this.lightness;

    return this.setLightness(lightness + amount * lightness);
  }

  /**
   * Darkens a color by a percentage, amount: `∈[0, 1]`
   */
  darken(amount: number): Color {
    return this.lighten(amount * -1);
  }

  /**
   * Mixes a color with `amount% white`
   */
  tint(amount: number): Color {
    return this.mix(new Color(255, 255, 255), amount);
  }

  /**
   * Mixes a color with `amount% black`
   */
  shade(amount: number): Color {
    return this.mix(new Color(0, 0, 0), amount);
  }

  /**
   * Adds one color to another by averaging their [`r`, `g`, `b`, `a`] components
   */
  mix(color: Color | string, amount = 0.5): Color {
    const c = color instanceof Color ? color : new Color(color);
    const amt = percentRange(amount);
    const otherRGBA = c.asRGBA();
    const [r, g, b, a] = this.asRGBA().reduce(
      (acc, val, index) => {
        // Was hitting some floating point rounding errors in the tests, so we're employing
        // a different rounding strategy
        const computed = Math.round(round(2, otherRGBA[index] * amt + val * (1 - amt)));
        return acc.concat(hexRange(computed));
      },

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
  luminance(): number {
    const [red, green, blue] = this.asRGB().map(x => x / 255);
    const val = (x: number) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);
    return 0.2126 * val(red) + 0.7152 * val(green) + 0.0722 * val(blue);
  }

  /**
   *
   * @see https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
   */
  contrastRatio(color: Color): number {
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
  isTextWCAG2CompliantWith(color: Color, largeText = false): boolean {
    return this.contrastRatio(color) >= (largeText ? 3 : 4.5);
  }

  /**
   * Checks if a text contrast is sufficient for WCAG3
   *
   * (Large text means `14pt + bold` or `18pt regular`)
   *
   * @see https://www.w3.org/TR/WCAG21/#contrast-enhanced
   */
  isTextWCAG3CompliantWith(color: Color, largeText = false): boolean {
    return this.contrastRatio(color) >= (largeText ? 4.5 : 7);
  }

  /**
   * Checks if a non-text UI color contrast is sufficient
   *
   * @see https://www.w3.org/TR/WCAG21/#non-text-contrast
   */
  isUIWCAGCompliantWith(color: Color): boolean {
    return this.contrastRatio(color) >= 3;
  }

  /**
   * Returns the color as `[hue ∈[0, 360], saturation ∈[0, 1], lightness ∈[0, 1]]`
   */
  asHSL(): readonly [number, number, number] {
    const { red, green, blue } = this;
    return RGBToHSL(red, green, blue);
  }

  get hsl(): string {
    return hsl(...this.asHSL());
  }

  asHSLA(): readonly [number, number, number, number] {
    return [...this.asHSL(), this.alpha];
  }

  get hsla(): string {
    return hsla(...this.asHSLA());
  }

  /**
   * Returns the color as `[red ∈[0, 255], green ∈[0, 255], blue ∈[0, 255]]`
   */
  asRGB(): readonly [number, number, number] {
    const { red, green, blue } = this;
    return [red, green, blue] as const;
  }

  get rgb(): string {
    return `rgb(${this.asRGB().join(', ')})`;
  }

  /**
   * Returns the color as `[red ∈[0, 255], green ∈[0, 255], blue ∈[0, 255], alpha ∈[0, 1]]`
   */
  asRGBA(): readonly [number, number, number, number] {
    const { red, green, blue, alpha } = this;
    return [red, green, blue, alpha] as const;
  }

  get rgba(): string {
    return `rgba(${this.asRGBA().join(', ')})`;
  }

  asHex3(): string {
    return ['#', RGBToHex(...this.asRGB(), true)].join('');
  }

  get hex3(): string {
    return this.asHex3();
  }

  asHex(): string {
    return ['#', RGBToHex(...this.asRGB(), false)].join('');
  }

  get hex(): string {
    return this.asHex();
  }

  toJSON(): string {
    return this.toString();
  }

  /**
   * Outputs the color as a string
   *
   * - If request is `named`, then it will attempt a named color, but fallback to `rgb`
   * - For `hex3`, it will return an abbreviated hex if possible but fallback to a full hex
   * - Default: `rgba` if the alpha is not `1`, but `rgb` if the alpha is `1`
   */
  toString(type?: 'rgb' | 'rgba' | 'hex' | 'hex3' | 'hsl' | 'hsla' | 'named'): string {
    const when = (condition: boolean) => (a: string, b: string) => condition ? a : b;
    const isOpaque = this.alpha === 1;
    const whenOpaque = when(isOpaque);

    switch (type) {
      case 'named':
        if (this.toString('rgba') === 'rgba(0, 0, 0, 0)') {
          return 'transparent';
        }
        return namedColorsByValue[this.toString('hex') as NamedColorValue] ?? this.toString('rgb');
      case 'rgb':
        return whenOpaque(this.rgb, this.rgba);
      case 'rgba':
        return this.rgba;
      case 'hex':
        return this.hex;
      case 'hex3':
        return this.hex3;
      case 'hsl':
        return whenOpaque(this.hsl, this.hsla);
      case 'hsla':
        return this.hsla;
      default:
        return whenOpaque(this.rgb, this.rgba);
    }
  }
}

import { HSLToRGB } from './HSLToRGB';
import { namedColorsByValue, NamedColorValue } from './namedColors';
import { RGBToHex } from './RGBToHex';
import { RGBToHSL } from './RGBToHSL';
import { stringToRGBA } from './stringToRGBA';
import type { RGB, RGBA, HSL, HSLA, ColorFormat } from './types';
import { degreeRange, hexRange, percentRange, round, toPercent } from './util';

// String formatters
const hsl = (h: number, s: number, l: number) => `hsl(${h}, ${toPercent(s)}, ${toPercent(l)})`;
const hsla = (h: number, s: number, l: number, a: number) =>
  `hsla(${h}, ${toPercent(s)}, ${toPercent(l)}, ${a})`;

/**
 * A class for working with colors, supporting RGB, HSL, and Hex formats
 * with utilities for color manipulation, contrast checking, and format conversion.
 */
export class Color {
  // Private cache for expensive calculations
  #hslCache: HSL | null = null;

  // Basic color components
  readonly red: number;
  readonly green: number;
  readonly blue: number;
  readonly alpha: number;

  /**
   * Create a color from a string (hex, rgb, named color)
   */
  constructor(color: string | Color);

  /**
   * Create a color from RGB(A) values
   * @param r Red component (0-255)
   * @param g Green component (0-255)
   * @param b Blue component (0-255)
   * @param a Alpha component (0-1), defaults to 1
   */
  constructor(r: number, g: number, b: number, a?: number);

  constructor(r: string | Color | number, g?: number, b?: number, a?: number) {
    if (r instanceof Color) {
      this.red = r.red;
      this.green = r.green;
      this.blue = r.blue;
      this.alpha = r.alpha;
      return;
    }

    if (typeof r === 'string') {
      const [red, green, blue, alpha] = stringToRGBA(r);
      this.red = red;
      this.green = green;
      this.blue = blue;
      this.alpha = alpha;
      return;
    }

    if (typeof r === 'number' && typeof g === 'number' && typeof b === 'number') {
      this.red = hexRange(r);
      this.green = hexRange(g);
      this.blue = hexRange(b);
      this.alpha = typeof a === 'number' ? percentRange(a) : 1;
      return;
    }

    throw new Error('Invalid color constructor arguments');
  }

  /**
   * Create a new Color instance from an existing one
   */
  static from(color: Color): Color {
    return new Color(color);
  }

  /**
   * Create a modified copy with a new red value
   */
  setRed(red: number): Color {
    return new Color(hexRange(red), this.green, this.blue, this.alpha);
  }

  /**
   * Create a modified copy with a new green value
   */
  setGreen(green: number): Color {
    return new Color(this.red, hexRange(green), this.blue, this.alpha);
  }

  /**
   * Create a modified copy with a new blue value
   */
  setBlue(blue: number): Color {
    return new Color(this.red, this.green, hexRange(blue), this.alpha);
  }

  /**
   * Create a modified copy with a new alpha value
   */
  setAlpha(alpha: number): Color {
    return new Color(this.red, this.green, this.blue, percentRange(alpha));
  }

  /**
   * Create a modified copy with new RGBA values
   */
  private setRGBA(r?: number, g?: number, b?: number, a?: number): Color {
    return new Color(r ?? this.red, g ?? this.green, b ?? this.blue, a ?? this.alpha);
  }

  /**
   * Create a color with inverted RGB values
   */
  invert(): Color {
    return this.setRGBA(255 - this.red, 255 - this.green, 255 - this.blue);
  }

  /**
   * Get the hue component of the color (0-360)
   */
  get hue(): number {
    return this.asHSL()[0];
  }

  /**
   * Set the hue component, modifying the color in place
   */
  set hue(val: number) {
    const [, s, l] = this.asHSL();
    const [red, green, blue] = HSLToRGB(degreeRange(val), s, l);
    Object.defineProperties(this, {
      red: { value: red },
      green: { value: green },
      blue: { value: blue },
    });
    this.#hslCache = null;
  }

  /**
   * Create a new color with the specified hue
   */
  setHue(hue: number): Color {
    const [, s, l] = this.asHSL();
    return this.setRGBA(...HSLToRGB(degreeRange(hue), s, l));
  }

  /**
   * Create a new color with the hue rotated by the specified degrees
   */
  rotateHue(degrees: number): Color {
    return this.setHue((this.hue + degrees) % 360);
  }

  /**
   * Create a complementary color (hue rotated by 180 degrees)
   */
  complement(): Color {
    return this.rotateHue(180);
  }

  /**
   * Get the saturation component of the color (0-1)
   */
  get saturation(): number {
    return this.asHSL()[1];
  }

  /**
   * Set the saturation component, modifying the color in place
   */
  set saturation(val: number) {
    const [h, , l] = this.asHSL();
    const [red, green, blue] = HSLToRGB(h, percentRange(val), l);
    Object.defineProperties(this, {
      red: { value: red },
      green: { value: green },
      blue: { value: blue },
    });
    this.#hslCache = null;
  }

  /**
   * Create a new color with the specified saturation
   */
  setSaturation(saturation: number): Color {
    const [h, , l] = this.asHSL();
    return this.setRGBA(...HSLToRGB(h, percentRange(saturation), l));
  }

  /**
   * Get the lightness component of the color (0-1)
   */
  get lightness(): number {
    return this.asHSL()[2];
  }

  /**
   * Set the lightness component, modifying the color in place
   */
  set lightness(val: number) {
    const [h, s] = this.asHSL();
    const [red, green, blue] = HSLToRGB(h, s, percentRange(val));
    Object.defineProperties(this, {
      red: { value: red },
      green: { value: green },
      blue: { value: blue },
    });
    this.#hslCache = null;
  }

  /**
   * Create a new color with the specified lightness
   */
  setLightness(lightness: number): Color {
    const [h, s] = this.asHSL();
    return this.setRGBA(...HSLToRGB(h, s, percentRange(lightness)));
  }

  /**
   * Create a new color lightened by the specified amount (0-1)
   */
  lighten(amount: number): Color {
    const lightness = this.lightness;
    return this.setLightness(lightness + amount * lightness);
  }

  /**
   * Create a new color darkened by the specified amount (0-1)
   */
  darken(amount: number): Color {
    return this.lighten(-amount);
  }

  /**
   * Create a new color by mixing with white
   */
  tint(amount: number): Color {
    return this.mix(new Color(255, 255, 255), amount);
  }

  /**
   * Create a new color by mixing with black
   */
  shade(amount: number): Color {
    return this.mix(new Color(0, 0, 0), amount);
  }

  /**
   * Create a new color by mixing with another color
   * @param color Color to mix with
   * @param amount Amount to mix (0-1), where 0 is this color and 1 is the other color
   */
  mix(color: Color | string, amount = 0.5): Color {
    const c = color instanceof Color ? color : new Color(color);
    const amt = percentRange(amount);
    const thisRGBA = this.asRGBA();
    const otherRGBA = c.asRGBA();

    const result = thisRGBA.map((val, index) => {
      const otherVal = otherRGBA[index] ?? 0;
      const computed = Math.round(round(2, otherVal * amt + val * (1 - amt)));
      return index < 3 ? hexRange(computed) : percentRange(computed);
    });

    return this.setRGBA(
      result[0] as number,
      result[1] as number,
      result[2] as number,
      result[3] as number,
    );
  }

  /**
   * Calculate the perceptual luminance of the color
   * @see https://www.w3.org/TR/WCAG20-TECHS/G17.html#G17-testsq
   */
  luminance(): number {
    const [red, green, blue] = this.asRGB().map(x => x / 255);
    const val = (x: number) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);
    return 0.2126 * val(red) + 0.7152 * val(green) + 0.0722 * val(blue);
  }

  /**
   * Calculate the contrast ratio between this color and another
   * @see https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
   */
  contrastRatio(color: Color): number {
    const colors = [this.luminance(), color.luminance()].map(x => x + 0.05);
    return Math.max(...colors) / Math.min(...colors);
  }

  /**
   * Check if this color has sufficient contrast with another for WCAG AA text
   * @param color Color to compare with
   * @param largeText Whether the text is large (18pt or 14pt bold)
   */
  isTextWCAG2CompliantWith(color: Color, largeText = false): boolean {
    return this.contrastRatio(color) >= (largeText ? 3 : 4.5);
  }

  /**
   * Check if this color has sufficient contrast with another for WCAG AAA text
   * @param color Color to compare with
   * @param largeText Whether the text is large (18pt or 14pt bold)
   */
  isTextWCAG3CompliantWith(color: Color, largeText = false): boolean {
    return this.contrastRatio(color) >= (largeText ? 4.5 : 7);
  }

  /**
   * Check if this color has sufficient contrast with another for UI elements
   * @see https://www.w3.org/TR/WCAG21/#non-text-contrast
   */
  isUIWCAGCompliantWith(color: Color): boolean {
    return this.contrastRatio(color) >= 3;
  }

  /**
   * Get the color as an HSL tuple
   */
  asHSL(): HSL {
    if (!this.#hslCache) {
      this.#hslCache = RGBToHSL(this.red, this.green, this.blue);
    }
    return this.#hslCache;
  }

  /**
   * Get the color as an HSL string
   */
  get hsl(): string {
    return hsl(...this.asHSL());
  }

  /**
   * Get the color as an HSLA tuple
   */
  asHSLA(): HSLA {
    return [...this.asHSL(), this.alpha];
  }

  /**
   * Get the color as an HSLA string
   */
  get hsla(): string {
    return hsla(...this.asHSLA());
  }

  /**
   * Get the color as an RGB tuple
   */
  asRGB(): RGB {
    return [this.red, this.green, this.blue] as const;
  }

  /**
   * Get the color as an RGB string
   */
  get rgb(): string {
    return `rgb(${this.asRGB().join(', ')})`;
  }

  /**
   * Get the color as an RGBA tuple
   */
  asRGBA(): RGBA {
    return [this.red, this.green, this.blue, this.alpha] as const;
  }

  /**
   * Get the color as an RGBA string
   */
  get rgba(): string {
    return `rgba(${this.asRGBA().join(', ')})`;
  }

  /**
   * Get the color as a 3-digit hex string (if possible)
   */
  asHex3(): string {
    return '#' + RGBToHex(...this.asRGB(), true);
  }

  /**
   * Get the color as a 3-digit hex string (if possible)
   */
  get hex3(): string {
    return this.asHex3();
  }

  /**
   * Get the color as a 6-digit hex string
   */
  asHex(): string {
    return '#' + RGBToHex(...this.asRGB(), false);
  }

  /**
   * Get the color as a 6-digit hex string
   */
  get hex(): string {
    return this.asHex();
  }

  /**
   * Serialize the color to JSON
   */
  toJSON(): string {
    return this.toString();
  }

  /**
   * Convert the color to a string in the specified format
   * @param type Format to use (defaults to rgb/rgba based on alpha)
   */
  toString(type?: ColorFormat): string {
    const isOpaque = this.alpha === 1;
    const whenOpaque = (a: string, b: string) => (isOpaque ? a : b);

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

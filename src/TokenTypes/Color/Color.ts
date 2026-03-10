import type { Space, SpaceData } from './ColorSpace';
import { convertWithIntermediates } from './ColorSpace';
import { RGBToHex } from './conversions';
import type { NamedColorValue } from './namedColors';
import { namedColorsByValue } from './namedColors';
import { HSLOperations } from './operations/HSLOperations';
import { LABOperations } from './operations/LABOperations';
import { LCHOperations } from './operations/LCHOperations';
import { RGBOperations } from './operations/RGBOperations';
import { XYZOperations } from './operations/XYZOperations';
import { parseColorString } from './parseColorString';
import type { ColorFormat, HSL, HSLA, LAB, LABA, LCH, LCHA, RGB, RGBA, XYZ, XYZA } from './types';
import { degreeRange, hexRange, percentRange, round, toPercent } from './util';
import { closest } from './xkcdNamedColors';

// Symbol for internal construction — only accessible within this module and operations
const INTERNAL: unique symbol = Symbol('Color.internal');

export type InternalCreate = (space: Space, data: SpaceData[Space], alpha: number) => Color;

// String formatters — each handles both opaque and alpha variants
const fmtTriplet = (
  name: string,
  precision: number,
  a: number,
  b: number,
  c: number,
  alpha?: number,
): string => {
  const core = `${round(precision, a)}, ${round(precision, b)}, ${round(precision, c)}`;
  return alpha !== undefined ? `${name}(${core} / ${alpha})` : `${name}(${core})`;
};

const fmt = {
  rgb: (values: RGB | RGBA): string => {
    const [r, g, b] = values;
    const core = `${r}, ${g}, ${b}`;
    return values.length === 4 ? `rgba(${core}, ${values[3]})` : `rgb(${core})`;
  },
  hsl: (values: HSL | HSLA): string => {
    const [h, s, l] = values;
    const core = `${h}, ${toPercent(s)}, ${toPercent(l)}`;
    return values.length === 4 ? `hsla(${core}, ${values[3]})` : `hsl(${core})`;
  },
  lab: (values: LAB | LABA): string => {
    const [L, a, b] = values;
    return values.length === 4 ? fmtTriplet('lab', 2, L, a, b, values[3]) : fmtTriplet('lab', 2, L, a, b);
  },
  lch: (values: LCH | LCHA): string => {
    const [L, c, h] = values;
    return values.length === 4 ? fmtTriplet('lch', 2, L, c, h, values[3]) : fmtTriplet('lch', 2, L, c, h);
  },
  xyz: (values: XYZ | XYZA): string => {
    const [x, y, z] = values;
    return values.length === 4 ? fmtTriplet('xyz', 5, x, y, z, values[3]) : fmtTriplet('xyz', 5, x, y, z);
  },
};

/**
 * A class for working with colors, supporting RGB, HSL, XYZ, LAB, and LCH formats
 * with utilities for color manipulation, contrast checking, and format conversion.
 *
 * Colors are immutable. All mutation methods return new Color instances.
 * Internally, colors are stored in whatever space they were created in,
 * with lazy conversion and caching for other spaces.
 */
export class Color {
  #nativeSpace: Space;
  #nativeData: SpaceData[Space];
  #alpha: number;
  #cache: Partial<{ [K in Space]: SpaceData[K] }>;

  // Cached operations objects
  #rgb?: RGBOperations;
  #hsl?: HSLOperations;
  #lab?: LABOperations;
  #lch?: LCHOperations;
  #xyz?: XYZOperations;

  /**
   * Create a color from a string (hex, rgb, hsl, lab, lch, xyz, named color) or Color
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
  /** @internal */
  constructor(brand: typeof INTERNAL, space: Space, data: SpaceData[Space], alpha: number);
  constructor(
    r: string | Color | number | typeof INTERNAL,
    g?: number | Space,
    b?: number | SpaceData[Space],
    a?: number,
  ) {
    // Internal branded construction
    if (r === INTERNAL) {
      this.#nativeSpace = g as Space;
      this.#nativeData = b as SpaceData[Space];
      this.#alpha = a as number;
      this.#cache = { [this.#nativeSpace]: this.#nativeData };
      return;
    }

    // Copy constructor
    if (r instanceof Color) {
      this.#nativeSpace = r.#nativeSpace;
      this.#nativeData = r.#nativeData;
      this.#alpha = r.#alpha;
      this.#cache = { ...r.#cache };
      return;
    }

    // String constructor
    if (typeof r === 'string') {
      const parsed = parseColorString(r);
      this.#nativeSpace = parsed.space;
      this.#nativeData = parsed.data;
      this.#alpha = parsed.alpha;
      this.#cache = { [this.#nativeSpace]: this.#nativeData };
      return;
    }

    // Numeric RGB constructor
    if (typeof r === 'number' && typeof g === 'number' && typeof b === 'number') {
      this.#nativeSpace = 'rgb';
      this.#nativeData = [hexRange(r), hexRange(g as number), hexRange(b as number)] as RGB;
      this.#alpha = typeof a === 'number' ? percentRange(a) : 1;
      this.#cache = { rgb: this.#nativeData as RGB };
      return;
    }

    throw new Error('Invalid color constructor arguments');
  }

  static isColor(x: unknown): x is Color {
    return x instanceof this;
  }

  // ─── Internal helpers ──────────────────────────────────────

  #resolve<S extends Space>(space: S): SpaceData[S] {
    const cached = this.#cache[space];
    if (cached) {
      return cached as SpaceData[S];
    }

    const intermediates = convertWithIntermediates(this.#nativeSpace, space, this.#nativeData);
    Object.assign(this.#cache, intermediates);
    return this.#cache[space] as SpaceData[S];
  }

  static #new(space: Space, data: SpaceData[Space], alpha: number): Color {
    return new Color(INTERNAL, space, data, alpha);
  }

  // Bound version for operations classes
  #boundCreateInternal: InternalCreate = (space, data, alpha) => Color.#new(space, data, alpha);

  // ─── Backward-compatible property getters ──────────────────

  /** Red component (0-255) */
  get red(): number {
    return this.#resolve('rgb')[0];
  }

  /** Green component (0-255) */
  get green(): number {
    return this.#resolve('rgb')[1];
  }

  /** Blue component (0-255) */
  get blue(): number {
    return this.#resolve('rgb')[2];
  }

  /** Alpha component (0-1) */
  get alpha(): number {
    return this.#alpha;
  }

  // ─── HSL property getters ──────────────────────────────────

  /** Hue component (0-360) */
  get hue(): number {
    return this.asHSL()[0];
  }

  /** Saturation component (0-1) */
  get saturation(): number {
    return this.asHSL()[1];
  }

  /** Lightness component (0-1) */
  get lightness(): number {
    return this.asHSL()[2];
  }

  // ─── Factory methods ───────────────────────────────────────

  /** Create a new Color instance from an existing one */
  static from(color: Color): Color {
    return new Color(color);
  }

  static #fromSpace<S extends Space>(
    space: S,
    first: number | SpaceData[S],
    second?: number,
    third?: number,
    alpha?: number,
  ): Color {
    if (typeof first !== 'number') {
      return Color.#new(space, first, second ?? 1);
    }
    return Color.#new(space, [first, second!, third!] as SpaceData[S], alpha ?? 1);
  }

  static fromRGB(r: number, g: number, b: number, a?: number): Color;
  static fromRGB(rgb: RGB, a?: number): Color;
  static fromRGB(first: number | RGB, second?: number, third?: number, alpha?: number): Color {
    if (typeof first !== 'number') {
      return Color.#fromSpace('rgb', first, second);
    }
    return Color.#new(
      'rgb',
      [hexRange(first), hexRange(second!), hexRange(third!)] as RGB,
      alpha ?? 1,
    );
  }

  static fromHSL(h: number, s: number, l: number, a?: number): Color;
  static fromHSL(hsl: HSL, a?: number): Color;
  static fromHSL(first: number | HSL, second?: number, third?: number, alpha?: number): Color {
    return Color.#fromSpace('hsl', first, second, third, alpha);
  }

  static fromLAB(l: number, a: number, b: number, alpha?: number): Color;
  static fromLAB(lab: LAB, alpha?: number): Color;
  static fromLAB(first: number | LAB, second?: number, third?: number, alpha?: number): Color {
    return Color.#fromSpace('lab', first, second, third, alpha);
  }

  static fromLCH(l: number, c: number, h: number, a?: number): Color;
  static fromLCH(lch: LCH, a?: number): Color;
  static fromLCH(first: number | LCH, second?: number, third?: number, alpha?: number): Color {
    return Color.#fromSpace('lch', first, second, third, alpha);
  }

  static fromXYZ(x: number, y: number, z: number, a?: number): Color;
  static fromXYZ(xyz: XYZ, a?: number): Color;
  static fromXYZ(first: number | XYZ, second?: number, third?: number, alpha?: number): Color {
    return Color.#fromSpace('xyz', first, second, third, alpha);
  }

  // ─── Space-scoped sub-APIs ─────────────────────────────────

  /** RGB-space operations (red, green, blue, mix, invert) */
  get rgb(): RGBOperations {
    if (!this.#rgb) {
      this.#rgb = new RGBOperations(this, this.#boundCreateInternal);
    }
    return this.#rgb;
  }

  /** HSL-space operations (hue, saturation, lightness, lighten, darken) */
  get hsl(): HSLOperations {
    if (!this.#hsl) {
      this.#hsl = new HSLOperations(this, this.#boundCreateInternal);
    }
    return this.#hsl;
  }

  /** LAB-space operations (lightness, a, b, mix, lighten, darken) */
  get lab(): LABOperations {
    if (!this.#lab) {
      this.#lab = new LABOperations(this, this.#boundCreateInternal);
    }
    return this.#lab;
  }

  /** LCH-space operations (lightness, chroma, hue, rotateHue, complement) */
  get lch(): LCHOperations {
    if (!this.#lch) {
      this.#lch = new LCHOperations(this, this.#boundCreateInternal);
    }
    return this.#lch;
  }

  /** XYZ-space operations (x, y, z) */
  get xyz(): XYZOperations {
    if (!this.#xyz) {
      this.#xyz = new XYZOperations(this, this.#boundCreateInternal);
    }
    return this.#xyz;
  }

  // ─── RGB mutation methods (backward-compatible) ────────────

  /** Create a modified copy with a new red value */
  setRed(red: number): Color {
    return Color.#new('rgb', [hexRange(red), this.green, this.blue], this.#alpha);
  }

  /** Create a modified copy with a new green value */
  setGreen(green: number): Color {
    return Color.#new('rgb', [this.red, hexRange(green), this.blue], this.#alpha);
  }

  /** Create a modified copy with a new blue value */
  setBlue(blue: number): Color {
    return Color.#new('rgb', [this.red, this.green, hexRange(blue)], this.#alpha);
  }

  /** Create a modified copy with a new alpha value */
  setAlpha(alpha: number): Color {
    return Color.#new(this.#nativeSpace, this.#nativeData, percentRange(alpha));
  }

  /** Create a color with inverted RGB values */
  invert(): Color {
    const [r, g, b] = this.asRGB();
    return Color.#new('rgb', [255 - r, 255 - g, 255 - b] as RGB, this.#alpha);
  }

  // ─── HSL mutation methods (backward-compatible) ────────────

  /** Create a new color with the specified hue */
  setHue(hue: number): Color {
    const [, s, l] = this.asHSL();
    return Color.#new('hsl', [degreeRange(hue), s, l] as HSL, this.#alpha);
  }

  /** Create a new color with the hue rotated by the specified degrees */
  rotateHue(degrees: number): Color {
    const newHue = (this.hue + degrees) % 360;
    return this.setHue(newHue < 0 ? newHue + 360 : newHue);
  }

  /** Create a complementary color (hue rotated by 180 degrees) */
  complement(): Color {
    return this.rotateHue(180);
  }

  /** Create a new color with the specified saturation */
  setSaturation(saturation: number): Color {
    const [h, , l] = this.asHSL();
    return Color.#new('hsl', [h, percentRange(saturation), l] as HSL, this.#alpha);
  }

  /** Create a new color with the specified lightness */
  setLightness(lightness: number): Color {
    const [h, s] = this.asHSL();
    return Color.#new('hsl', [h, s, percentRange(lightness)] as HSL, this.#alpha);
  }

  /** Create a new color lightened by the specified amount (0-1) */
  lighten(amount: number): Color {
    const l = this.lightness;
    return this.setLightness(l + amount * l);
  }

  /** Create a new color darkened by the specified amount (0-1) */
  darken(amount: number): Color {
    return this.lighten(-amount);
  }

  /** Create a new color by mixing with white */
  tint(amount: number): Color {
    return this.mix(new Color(255, 255, 255), amount);
  }

  /** Create a new color by mixing with black */
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
    const [r1, g1, b1] = this.asRGB();
    const a1 = this.#alpha;
    const [r2, g2, b2] = c.asRGB();
    const a2 = c.#alpha;

    // Premultiplied alpha interpolation (CSS color-mix spec)
    const resultAlpha = a1 * (1 - amt) + a2 * amt;

    if (resultAlpha === 0) {
      return Color.#new('rgb', [0, 0, 0] as RGB, 0);
    }

    const premulR1 = r1 * a1;
    const premulG1 = g1 * a1;
    const premulB1 = b1 * a1;
    const premulR2 = r2 * a2;
    const premulG2 = g2 * a2;
    const premulB2 = b2 * a2;

    const unmul = (p1: number, p2: number) =>
      Math.round(hexRange(round(2, (p1 * (1 - amt) + p2 * amt) / resultAlpha)));
    const resultR = unmul(premulR1, premulR2);
    const resultG = unmul(premulG1, premulG2);
    const resultB = unmul(premulB1, premulB2);

    return Color.#new('rgb', [resultR, resultG, resultB] as RGB, resultAlpha);
  }

  // ─── Luminance & contrast ─────────────────────────────────

  /**
   * Calculate the perceptual luminance of the color
   * @see https://www.w3.org/TR/WCAG20-TECHS/G17.html#G17-testsq
   */
  luminance(): number {
    const [red, green, blue] = this.asRGB().map(x => x / 255) as [number, number, number];
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

  // ─── Output methods (tuples) ──────────────────────────────

  /** Get the color as an RGB tuple */
  asRGB(): RGB {
    return this.#resolve('rgb');
  }

  /** Get the color as an RGBA tuple */
  asRGBA(): RGBA {
    return [...this.asRGB(), this.#alpha] as unknown as RGBA;
  }

  /** Get the color as an HSL tuple */
  asHSL(): HSL {
    return this.#resolve('hsl');
  }

  /** Get the color as an HSLA tuple */
  asHSLA(): HSLA {
    return [...this.asHSL(), this.#alpha] as unknown as HSLA;
  }

  /** Get the color as an XYZ tuple */
  asXYZ(): XYZ {
    return this.#resolve('xyz');
  }

  /** Get the color as an XYZA tuple */
  asXYZA(): XYZA {
    return [...this.asXYZ(), this.#alpha] as unknown as XYZA;
  }

  /** Get the color as a LAB tuple */
  asLAB(): LAB {
    return this.#resolve('lab');
  }

  /** Get the color as a LABA tuple */
  asLABA(): LABA {
    return [...this.asLAB(), this.#alpha] as unknown as LABA;
  }

  /** Get the color as an LCH tuple */
  asLCH(): LCH {
    return this.#resolve('lch');
  }

  /** Get the color as an LCHA tuple */
  asLCHA(): LCHA {
    return [...this.asLCH(), this.#alpha] as unknown as LCHA;
  }

  /** Get the color as a 3-digit hex string (if possible) */
  asHex3(): string {
    return '#' + RGBToHex(this.asRGB(), true);
  }

  /** Get the color as a 3-digit hex string */
  get hex3(): string {
    return this.asHex3();
  }

  /** Get the color as a 6-digit hex string */
  asHex(): string {
    return '#' + RGBToHex(this.asRGB(), false);
  }

  /** Get the color as a 6-digit hex string */
  get hex(): string {
    return this.asHex();
  }

  // ─── Serialization ────────────────────────────────────────

  /** Serialize to a string (defaults to RGB) */
  toJSON(): string {
    return this.toString();
  }

  /** Convert to a string in the specified format */
  toString(type?: ColorFormat): string {
    switch (type) {
      case 'named':
        if (this.toString('rgba') === 'rgba(0, 0, 0, 0)') {
          return 'transparent';
        }
        return namedColorsByValue[this.toString('hex') as NamedColorValue] ?? this.toString('rgb');
      case 'xkcd': {
        const match = closest(this);
        return match ? match.name : this.toString('hex');
      }
      case 'rgb':
        return fmt.rgb(this.asRGB());
      case 'rgba':
        return fmt.rgb(this.asRGBA());
      case 'hex':
        return this.hex;
      case 'hex3':
        return this.hex3;
      case 'hsl':
        return fmt.hsl(this.asHSL());
      case 'hsla':
        return fmt.hsl(this.asHSLA());
      case 'lab':
        return fmt.lab(this.asLAB());
      case 'laba':
        return fmt.lab(this.asLABA());
      case 'lch':
        return fmt.lch(this.asLCH());
      case 'lcha':
        return fmt.lch(this.asLCHA());
      case 'xyz':
        return fmt.xyz(this.asXYZ());
      case 'xyza':
        return fmt.xyz(this.asXYZA());
      default:
        return this.#alpha === 1 ? fmt.rgb(this.asRGB()) : fmt.rgb(this.asRGBA());
    }
  }
}

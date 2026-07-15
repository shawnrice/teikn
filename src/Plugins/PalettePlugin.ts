import type { Token } from '../Token.js';
import { Color } from '../TokenTypes/Color/index.js';
import type { ColorFormat } from '../TokenTypes/Color/types.js';
import { Plugin } from './Plugin.js';

/**
 * Output color space for the generated ramp. `'auto'` (the default) keeps each
 * step in the base color's authored space — a color authored in `oklch` yields
 * an `oklch` ramp, one authored in hex/rgb keeps the RGB tint/shade output.
 * Any concrete {@link ColorFormat} forces that space.
 */
export type PaletteSpace = ColorFormat | 'auto';

type PalettePluginOptions = {
  steps?: number[];
  lightEnd?: number;
  darkEnd?: number;
  /** See {@link PaletteSpace}. Default `'auto'`. */
  space?: PaletteSpace;
} & Record<string, unknown>;

const DEFAULT_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const DEFAULT_LIGHT_END = 95;
const DEFAULT_DARK_END = 10;
const MID_STEP = 500;

const interpolate = (a: number, b: number, t: number): number => a + (b - a) * t;

// Spaces that carry a lightness channel we can move directly (holding hue +
// chroma) for a perceptually even ramp. lab/oklab route through their polar
// forms, whose lightness channel is identical.
type LightnessSpace = 'hsl' | 'lch' | 'oklch';

const lightnessSpaceFor = (format: ColorFormat): LightnessSpace | null => {
  switch (format) {
    case 'hsl':
    case 'hsla':
      return 'hsl';
    case 'lch':
    case 'lcha':
    case 'lab':
    case 'laba':
      return 'lch';
    case 'oklch':
    case 'oklcha':
    case 'oklab':
    case 'oklaba':
      return 'oklch';
    default:
      return null;
  }
};

// Base lightness as a 0–100 percentage plus a builder returning the base color
// at a target lightness percentage. lightEnd/darkEnd are always percentages, so
// each space maps them onto its own lightness scale (hsl/oklch: 0–1, lch: 0–100).
const lightnessOps = (
  space: LightnessSpace,
  base: Color,
): { basePct: number; at: (pct: number) => Color } => {
  switch (space) {
    case 'hsl':
      return { basePct: base.hsl.lightness() * 100, at: pct => base.hsl.lightness(pct / 100) };
    case 'lch':
      return { basePct: base.lch.lightness(), at: pct => base.lch.lightness(pct) };
    case 'oklch':
      return { basePct: base.oklch.lightness() * 100, at: pct => base.oklch.lightness(pct / 100) };
  }
};

// Color spaces that have a native representation (as opposed to a pure notation
// like hex/named). A step whose native space already matches is kept as-is so
// output is byte-for-byte identical to authoring in that space.
const NATIVE_SPACES = new Set<string>(['rgb', 'hsl', 'xyz', 'lab', 'lch', 'oklab', 'oklch']);

const toOutputValue = (color: Color, format: ColorFormat): Color | string => {
  if (NATIVE_SPACES.has(format)) {
    return color.space === format ? color : new Color(color.toString(format));
  }

  // Pure notation (hex, hex3, named, xkcd, rgba, …): store the serialized string.
  return color.toString(format);
};

const resolveFormat = (base: Color, space: PaletteSpace | undefined): ColorFormat => {
  // `undefined`, `'auto'`, and `'native'` all mean "the base color's own space".
  if (space === undefined || space === 'auto' || space === 'native') {
    return base.space;
  }

  return space;
};

const generatePaletteTokens = (
  token: Token,
  steps: number[],
  lightEnd: number,
  darkEnd: number,
  space: PaletteSpace | undefined,
): Token[] => {
  const baseColor = new Color(token.value as string | Color);
  const format = resolveFormat(baseColor, space);
  const minStep = Math.min(...steps);
  const maxStep = Math.max(...steps);

  // Perceptual ramp: hold hue + chroma, interpolate lightness in `format`'s
  // space. Falls back to RGB tint/shade for spaces without a lightness channel
  // (rgb, hex, named, …), preserving the long-standing output there.
  const lightnessSpace = lightnessSpaceFor(format);

  const stepColor = (step: number): Color => {
    if (step === MID_STEP) {
      return baseColor;
    }

    const toLight = step < MID_STEP;
    const t = toLight
      ? (MID_STEP - step) / (MID_STEP - minStep)
      : (step - MID_STEP) / (maxStep - MID_STEP);
    const endPct = toLight ? lightEnd : darkEnd;

    if (lightnessSpace) {
      const { basePct, at } = lightnessOps(lightnessSpace, baseColor);

      return at(interpolate(basePct, endPct, t));
    }

    // RGB tint (mix toward white) / shade (mix toward black).
    const targetLightness = interpolate(baseColor.lightness * 100, endPct, t) / 100;
    const amount = toLight
      ? (targetLightness - baseColor.lightness) / (1 - baseColor.lightness)
      : (baseColor.lightness - targetLightness) / baseColor.lightness;
    const clamped = Math.max(0, Math.min(1, amount));

    return toLight ? baseColor.tint(clamped) : baseColor.shade(clamped);
  };

  return steps.map(step => ({
    ...token,
    name: `${token.name}-${step}`,
    value: toOutputValue(stepColor(step), format),
  }));
};

export class PalettePlugin extends Plugin<PalettePluginOptions> {
  tokenType: string = 'color';
  outputType: RegExp = /.*/;

  constructor(options: PalettePluginOptions = {}) {
    super(options);
  }

  expand(tokens: Token[]): Token[] {
    const steps = this.options.steps ?? DEFAULT_STEPS;
    const lightEnd = this.options.lightEnd ?? DEFAULT_LIGHT_END;
    const darkEnd = this.options.darkEnd ?? DEFAULT_DARK_END;
    const { space } = this.options;

    return tokens.flatMap(token => {
      if (token.type !== 'color') {
        return [token];
      }

      return [token, ...generatePaletteTokens(token, steps, lightEnd, darkEnd, space)];
    });
  }
}

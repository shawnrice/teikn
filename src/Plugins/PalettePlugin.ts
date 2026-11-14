import { createSeedResolver } from '../resolve.js';
import type { Token } from '../Token.js';
import { tokenKey } from '../token-keys.js';
import { Color } from '../TokenTypes/Color/index.js';
import type { ColorFormat } from '../TokenTypes/Color/types.js';
import { Plugin } from './Plugin.js';

/** Resolve a seed value (default or mode) to a concrete color, following references. */
type SeedResolver = (value: unknown, tokenName: string) => unknown;

/**
 * Output color space for the generated ramp. `'auto'` (the default) keeps each
 * step in the base color's authored space — a color authored in `oklch` yields
 * an `oklch` ramp, one authored in hex/rgb keeps the RGB tint/shade output.
 * Any concrete {@link ColorFormat} forces that space.
 */
export type PaletteSpace = ColorFormat | 'auto';

export type PalettePluginOptions = {
  steps?: number[];
  lightEnd?: number;
  darkEnd?: number;
  /** See {@link PaletteSpace}. Default `'auto'`. */
  space?: PaletteSpace;
};

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
  resolveSeed: SeedResolver,
): Token[] => {
  const seedName = tokenKey(token);
  const baseColor = new Color(resolveSeed(token.value, seedName) as string | Color);
  const format = resolveFormat(baseColor, space);
  const minStep = Math.min(...steps);
  const maxStep = Math.max(...steps);

  // Perceptual ramp: hold hue + chroma, interpolate lightness in `format`'s
  // space. Falls back to RGB tint/shade for spaces without a lightness channel
  // (rgb, hex, named, …), preserving the long-standing output there. The ramp's
  // output space and endpoints are seed-level; only the base color differs per
  // mode, so each mode ramps around its own lightness.
  const lightnessSpace = lightnessSpaceFor(format);

  const stepColor = (seed: Color, step: number): Color => {
    if (step === MID_STEP) {
      return seed;
    }

    const toLight = step < MID_STEP;
    const t = toLight
      ? (MID_STEP - step) / (MID_STEP - minStep)
      : (step - MID_STEP) / (maxStep - MID_STEP);
    const endPct = toLight ? lightEnd : darkEnd;

    if (lightnessSpace) {
      const { basePct, at } = lightnessOps(lightnessSpace, seed);

      return at(interpolate(basePct, endPct, t));
    }

    // RGB tint (mix toward white) / shade (mix toward black).
    const targetLightness = interpolate(seed.lightness * 100, endPct, t) / 100;
    const amount = toLight
      ? (targetLightness - seed.lightness) / (1 - seed.lightness)
      : (seed.lightness - targetLightness) / seed.lightness;
    const clamped = Math.max(0, Math.min(1, amount));

    return toLight ? seed.tint(clamped) : seed.shade(clamped);
  };

  // Each mode (a hand-authored mode or a theme override, now indistinguishable)
  // rampifies its own resolved base color, so the whole ramp follows a theme.
  const modeColors = token.modes
    ? Object.entries(token.modes).map(
        ([mode, v]) => [mode, new Color(resolveSeed(v, seedName) as string | Color)] as const,
      )
    : [];

  // Strip the seed's own modes from the spread; each step gets its own rampified
  // modes (or none), never the seed's raw mode values.
  const { modes: _seedModes, ...rest } = token;

  return steps.map(step => {
    const modes = modeColors.length
      ? Object.fromEntries(
          modeColors.map(([mode, color]) => [mode, toOutputValue(stepColor(color, step), format)]),
        )
      : undefined;

    return {
      ...rest,
      name: `${token.name}-${step}`,
      value: toOutputValue(stepColor(baseColor, step), format),
      ...(modes ? { modes } : {}),
    };
  });
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

    // Resolve a seed against the pre-expand token set so a `{ref}` seed (default
    // or themed mode) rampifies its target. The full resolve pass still runs
    // later over the whole set; this is only the lookup needed to know the base
    // color. Generated step values come out concrete, so the later pass is a
    // no-op on them.
    const resolveSeed: SeedResolver = createSeedResolver(tokens);

    return tokens.flatMap(token => {
      if (token.type !== 'color') {
        return [token];
      }

      return [token, ...generatePaletteTokens(token, steps, lightEnd, darkEnd, space, resolveSeed)];
    });
  }
}

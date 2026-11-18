import { createSeedResolver } from '../resolve.js';
import { tokenKey } from '../token-keys.js';
import type { Token } from '../Token.js';
import { Color } from '../TokenTypes/Color/index.js';
import type { ColorFormat } from '../TokenTypes/Color/types.js';
import { Plugin } from './Plugin.js';

/** Resolve a seed value (default or mode) to a concrete color, following references. */
type SeedResolver = ReturnType<typeof createSeedResolver>;

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
  { resolveSeed, modeNames }: { resolveSeed: SeedResolver; modeNames: string[] },
): Token[] => {
  const seedName = tokenKey(token);

  // A value that does not resolve before expansion is not a seed (typically an
  // alias of another ramp's generated step); the full validate/resolve pass
  // reports it if the reference is actually broken. Neither is `currentColor`,
  // `var(--x)` and the like, which have no lightness to ramp.
  const { value: baseValue } = resolveSeed(token.value, seedName);
  const baseColor = Color.tryParse(baseValue);

  if (!baseColor) {
    return [];
  }

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
      // A seed already past the endpoint stays put (as the RGB path does)
      // rather than ramping back toward it.
      const end = toLight ? Math.max(endPct, basePct) : Math.min(endPct, basePct);

      return at(interpolate(basePct, end, t));
    }

    // RGB tint (mix toward white) / shade (mix toward black).
    const targetLightness = interpolate(seed.lightness * 100, endPct, t) / 100;
    const amount = toLight
      ? (targetLightness - seed.lightness) / (1 - seed.lightness)
      : (seed.lightness - targetLightness) / seed.lightness;
    // A white seed tinting (or a black seed shading) divides 0 by 0: there is
    // nowhere further to go, so the step stays at the seed.
    const clamped = Number.isFinite(amount) ? Math.max(0, Math.min(1, amount)) : 0;

    // tint/shade mix with opaque white/black; a ramp holds the seed's alpha.
    return (toLight ? seed.tint(clamped) : seed.shade(clamped)).setAlpha(seed.alpha);
  };

  // Each mode (a hand-authored mode or a theme override, now indistinguishable)
  // rampifies its own resolved base color, so the whole ramp follows a theme.
  // A seed without its own value for a mode still gets one when its reference
  // chain does (`brand = {primary}` follows primary's modes).
  const modeColors = modeNames.flatMap(mode => {
    const own = token.modes && Object.hasOwn(token.modes, mode) ? token.modes[mode] : undefined;

    // Not resolvable before expansion (e.g. a mode pointing at another ramp's
    // generated step): the steps fall back to their default value in this
    // mode. The seed keeps its mode, so the full validate/resolve pass still
    // reports a genuinely dangling or circular reference.
    const { value: resolved } = resolveSeed(own ?? token.value, seedName, mode);
    const color = own === undefined && resolved === baseValue ? null : Color.tryParse(resolved);

    return color ? [[mode, color] as const] : [];
  });

  // Strip the seed's own modes from the spread; each step gets its own rampified
  // modes (or none), never the seed's raw mode values. A step is a concrete
  // color, so it does not carry the seed's `link` either.
  const { modes: _seedModes, link: _seedLink, ...rest } = token;

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

    for (const end of ['lightEnd', 'darkEnd'] as const) {
      const value = options[end];

      if (value !== undefined && !(value >= 0 && value <= 100)) {
        throw new Error(
          `PalettePlugin: ${end} must be a lightness percentage from 0 to 100, got ${value}`,
        );
      }
    }

    const { space } = options;

    if (space !== undefined && space !== 'auto' && !Color.isFormat(space)) {
      throw new Error(`PalettePlugin: unknown space "${String(space)}"`);
    }
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
    const modeNames = [...new Set(tokens.flatMap(t => Object.keys(t.modes ?? {})))];

    return tokens.flatMap(token => {
      if (token.type !== 'color') {
        return [token];
      }

      return [
        token,
        ...generatePaletteTokens(token, steps, lightEnd, darkEnd, space, {
          resolveSeed,
          modeNames,
        }),
      ];
    });
  }
}

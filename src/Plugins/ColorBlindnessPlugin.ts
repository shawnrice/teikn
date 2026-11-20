import { createSeedResolver } from '../resolve.js';
import { tokenKey } from '../token-keys.js';
import type { Token } from '../Token.js';
import { Color } from '../TokenTypes/Color/index.js';
import { Plugin } from './Plugin.js';

type ColorBlindnessType = 'protanopia' | 'deuteranopia' | 'tritanopia';

export type ColorBlindnessPluginOptions = { types?: ColorBlindnessType[]; suffix?: string };

const DEFAULT_TYPES: ColorBlindnessType[] = ['protanopia', 'deuteranopia', 'tritanopia'];
const DEFAULT_SUFFIX = '-{type}';

const capitalize = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

const buildName = (baseName: string, type: ColorBlindnessType, suffix: string): string =>
  `${baseName}${suffix.replace('{type}', type)}`;

type Resolve = (value: unknown, mode?: string) => unknown;

type Source = { token: Token; base: Color; modeColors: (readonly [string, Color])[] };

const makeSimulatedToken = (
  { token, base, modeColors }: Source,
  type: ColorBlindnessType,
  suffix: string,
): Token => {
  // The simulated token is derived: it simulates each mode value too (a theme
  // or mode on the source must not put the unsimulated color back) and is
  // never a `link` alias of the source's target.
  const { modes: _modes, link: _link, ...rest } = token;
  const simulatedModes = modeColors.map(
    ([mode, color]) => [mode, color.simulateColorBlindness(type)] as const,
  );

  return {
    ...rest,
    name: buildName(token.name, type, suffix),
    value: base.simulateColorBlindness(type),
    usage: `${capitalize(type)} simulation of ${token.name}`,
    ...(simulatedModes.length ? { modes: Object.fromEntries(simulatedModes) } : {}),
  };
};

export class ColorBlindnessPlugin extends Plugin<ColorBlindnessPluginOptions> {
  tokenType: string = 'color';
  outputType: RegExp = /.*/;

  constructor(options: ColorBlindnessPluginOptions = {}) {
    super(options);
  }

  expand(tokens: Token[]): Token[] {
    const types = this.options.types ?? DEFAULT_TYPES;
    const suffix = this.options.suffix ?? DEFAULT_SUFFIX;

    const resolveSeed = createSeedResolver(tokens);
    const modeNames = [...new Set(tokens.flatMap(t => Object.keys(t.modes ?? {})))];

    return tokens.flatMap(token => {
      if (token.type !== 'color') {
        return [token];
      }

      // `undefined` when not resolvable before expansion (e.g. a mode pointing at
      // a token another plugin generates later): the simulated token keeps its
      // default there.
      const resolve: Resolve = (value, mode) => resolveSeed(value, tokenKey(token), mode).value;

      // A default that is not resolvable yet, or is not a color at all
      // (`currentColor`, `var(--x)`), has nothing to simulate.
      const baseValue = resolve(token.value);
      const base = Color.tryParse(baseValue);

      if (!base) {
        return [token];
      }

      // A token without its own value for a mode still gets one when its
      // reference chain does (`brand = {primary}` follows primary's modes).
      const modeColors = modeNames.flatMap(mode => {
        const own = token.modes && Object.hasOwn(token.modes, mode) ? token.modes[mode] : undefined;
        const resolved = resolve(own ?? token.value, mode);
        const color = own === undefined && resolved === baseValue ? null : Color.tryParse(resolved);

        return color ? [[mode, color] as const] : [];
      });

      const source = { token, base, modeColors };
      const simulated = types.map(type => makeSimulatedToken(source, type, suffix));

      return [token, ...simulated];
    });
  }
}

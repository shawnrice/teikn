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

const simulate = (value: unknown, type: ColorBlindnessType): Color =>
  (value instanceof Color ? value : new Color(value as string)).simulateColorBlindness(type);

const makeSimulatedToken = (
  token: Token,
  type: ColorBlindnessType,
  suffix: string,
  resolve: Resolve,
): Token => {
  // The simulated token is derived: it simulates each mode value too (a theme
  // or mode on the source must not put the unsimulated color back) and is
  // never a `link` alias of the source's target.
  const { modes, link: _link, ...rest } = token;
  const simulatedModes = Object.entries(modes ?? {}).flatMap(([mode, modeValue]) => {
    try {
      return [[mode, simulate(resolve(modeValue, mode), type)] as const];
    } catch {
      // Not resolvable before expansion (e.g. a mode pointing at a token another
      // plugin generates later): the simulated token keeps its default there.
      return [];
    }
  });

  return {
    ...rest,
    name: buildName(token.name, type, suffix),
    value: simulate(resolve(token.value), type),
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

    return tokens.flatMap(token => {
      if (token.type !== 'color') {
        return [token];
      }

      const resolve: Resolve = (value, mode) => resolveSeed(value, tokenKey(token), mode);
      const simulated = types.map(type => makeSimulatedToken(token, type, suffix, resolve));

      return [token, ...simulated];
    });
  }
}

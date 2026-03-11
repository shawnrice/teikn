import type { Token } from '../Token';
import { Color } from '../TokenTypes/Color';
import { Plugin } from './Plugin';

type ColorBlindnessType = 'protanopia' | 'deuteranopia' | 'tritanopia';

type ColorBlindnessPluginOptions = {
  types?: ColorBlindnessType[];
  suffix?: string;
} & Record<string, unknown>;

const DEFAULT_TYPES: ColorBlindnessType[] = ['protanopia', 'deuteranopia', 'tritanopia'];
const DEFAULT_SUFFIX = '-{type}';

const capitalize = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

const buildName = (baseName: string, type: ColorBlindnessType, suffix: string): string =>
  `${baseName}${suffix.replace('{type}', type)}`;

const makeSimulatedToken = (token: Token, type: ColorBlindnessType, suffix: string): Token => {
  const color = token.value instanceof Color ? token.value : new Color(token.value);

  const simulated = color.simulateColorBlindness(type);

  return {
    ...token,
    name: buildName(token.name, type, suffix),
    value: simulated,
    usage: `${capitalize(type)} simulation of ${token.name}`,
  };
};

export class ColorBlindnessPlugin extends Plugin<ColorBlindnessPluginOptions> {
  tokenType: string = 'color';
  outputType: RegExp = /.*/;

  constructor(options: ColorBlindnessPluginOptions = {}) {
    super(options);
  }

  toJSON(token: Token): Token {
    return token;
  }

  expand(tokens: Token[]): Token[] {
    const types = this.options.types ?? DEFAULT_TYPES;
    const suffix = this.options.suffix ?? DEFAULT_SUFFIX;

    return tokens.flatMap(token => {
      if (token.type !== 'color') {
        return [token];
      }

      const simulated = types.map(type => makeSimulatedToken(token, type, suffix));

      return [token, ...simulated];
    });
  }
}

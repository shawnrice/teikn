import type { Token } from "../Token";
import { Color } from "../TokenTypes/Color";
import { Plugin } from "./Plugin";

type PalettePluginOptions = {
  steps?: number[];
  lightEnd?: number;
  darkEnd?: number;
} & Record<string, unknown>;

const DEFAULT_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const DEFAULT_LIGHT_END = 95;
const DEFAULT_DARK_END = 10;

const interpolate = (a: number, b: number, t: number): number => a + (b - a) * t;

const generatePaletteTokens = (
  token: Token,
  steps: number[],
  lightEnd: number,
  darkEnd: number,
): Token[] => {
  const baseColor = new Color(token.value);
  const midStep = 500;
  const minStep = Math.min(...steps);
  const maxStep = Math.max(...steps);

  return steps.map((step) => {
    if (step === midStep) {
      return {
        ...token,
        name: `${token.name}-${step}`,
        value: baseColor,
      };
    }

    // For steps lighter than 500, tint (mix with white)
    // For steps darker than 500, shade (mix with black)
    if (step < midStep) {
      // Map step range [minStep..500] to tint amount [1..0]
      // Lower step = more tint (lighter)
      const t = (midStep - step) / (midStep - minStep);
      const targetLightness = interpolate(baseColor.lightness * 100, lightEnd, t) / 100;
      const tintAmount = (targetLightness - baseColor.lightness) / (1 - baseColor.lightness);
      return {
        ...token,
        name: `${token.name}-${step}`,
        value: baseColor.tint(Math.max(0, Math.min(1, tintAmount))),
      };
    }

    // step > midStep: shade (mix with black)
    const t = (step - midStep) / (maxStep - midStep);
    const targetLightness = interpolate(baseColor.lightness * 100, darkEnd, t) / 100;
    const shadeAmount = (baseColor.lightness - targetLightness) / baseColor.lightness;
    return {
      ...token,
      name: `${token.name}-${step}`,
      value: baseColor.shade(Math.max(0, Math.min(1, shadeAmount))),
    };
  });
};

export class PalettePlugin extends Plugin<PalettePluginOptions> {
  tokenType: string = "color";
  outputType: RegExp = /.*/;

  constructor(options: PalettePluginOptions = {}) {
    super(options);
  }

  toJSON(token: Token): Token {
    return token;
  }

  expand(tokens: Token[]): Token[] {
    const steps = this.options.steps ?? DEFAULT_STEPS;
    const lightEnd = this.options.lightEnd ?? DEFAULT_LIGHT_END;
    const darkEnd = this.options.darkEnd ?? DEFAULT_DARK_END;

    return tokens.flatMap((token) => {
      if (token.type !== "color") {
        return [token];
      }
      return [token, ...generatePaletteTokens(token, steps, lightEnd, darkEnd)];
    });
  }
}

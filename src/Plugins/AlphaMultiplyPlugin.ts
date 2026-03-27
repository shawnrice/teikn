import type { Token } from "../Token";
import { Color } from "../TokenTypes/Color";
import { Plugin } from "./Plugin";

type AlphaMultiplyPluginOptions = {
  background?: string;
} & Record<string, unknown>;

export class AlphaMultiplyPlugin extends Plugin<AlphaMultiplyPluginOptions> {
  tokenType: string = "color";
  outputType: RegExp = /.*/;

  constructor(options: AlphaMultiplyPluginOptions = {}) {
    super(options);
  }

  transform(token: Token): Token {
    const { background = "#ffffff" } = this.options;

    const fg = token.value instanceof Color ? token.value : new Color(token.value as string);

    if (fg.alpha >= 1) {
      return token;
    }

    const bg = new Color(background);
    const a = fg.alpha;

    const r = Math.round(fg.red * a + bg.red * (1 - a));
    const g = Math.round(fg.green * a + bg.green * (1 - a));
    const b = Math.round(fg.blue * a + bg.blue * (1 - a));

    return {
      ...token,
      value: new Color(r, g, b).toString(),
    };
  }
}

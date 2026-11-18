import type { Token } from '../Token.js';
import { Color } from '../TokenTypes/Color/index.js';
import { parseColor } from './color-values.js';
import { Plugin } from './Plugin.js';

export type AlphaMultiplyPluginOptions = { background?: string };

export class AlphaMultiplyPlugin extends Plugin<AlphaMultiplyPluginOptions> {
  tokenType: string = 'color';
  outputType: RegExp = /.*/;

  constructor(options: AlphaMultiplyPluginOptions = {}) {
    super(options);
  }

  override transform(token: Token): Token {
    const { background = '#ffffff' } = this.options;

    const fg = parseColor(token.value);

    if (!fg || fg.alpha >= 1) {
      return token;
    }

    const bg = new Color(background);
    const a = fg.alpha;

    const r = Math.round(fg.red * a + bg.red * (1 - a));
    const g = Math.round(fg.green * a + bg.green * (1 - a));
    const b = Math.round(fg.blue * a + bg.blue * (1 - a));

    return { ...token, value: new Color(r, g, b).toString() };
  }
}

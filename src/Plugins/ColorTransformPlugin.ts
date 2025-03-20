/* eslint-disable @typescript-eslint/no-useless-constructor */
import { Color } from '../Color';
import { Token } from '../Token';
import { Plugin } from './Plugin';

type ColorTransformPluginOptions = {
  type?: 'rgb' | 'rgba' | 'hex' | 'hex3' | 'hsl' | 'hsla' | 'named';
};

/**
 * Normalizes colors
 */
export class ColorTransformPlugin extends Plugin<ColorTransformPluginOptions> {
  outputType = /.*/;

  tokenType = 'color';

  constructor(options: ColorTransformPluginOptions) {
    super(options);
  }

  toJSON(token: Token): Token {
    const { type } = this.options;

    return {
      ...token,
      value: new Color(token.value).toString(type),
    };
  }
}

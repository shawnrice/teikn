/* eslint-disable @typescript-eslint/no-useless-constructor */
import { Color } from '../Color';
import type { ColorFormat } from '../Color/types';
import type { Token } from '../Token';
import { Plugin } from './Plugin';

interface ColorTransformPluginOptions extends Record<string, unknown> {
  type?: ColorFormat;
}

/**
 * Normalizes colors
 */
export class ColorTransformPlugin extends Plugin<ColorTransformPluginOptions> {
  outputType: RegExp = /.*/;

  tokenType: string = 'color';

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

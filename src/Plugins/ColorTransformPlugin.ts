import type { Token } from '../Token';
/* eslint-disable @typescript-eslint/no-useless-constructor */
import { Color } from '../TokenTypes/Color';
import type { ColorFormat } from '../TokenTypes/Color/types';
import { Plugin } from './Plugin';

type ColorTransformPluginOptions = {
  type?: ColorFormat;
} & Record<string, unknown>;

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

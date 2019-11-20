import { Color } from '../Color';
import { Token } from '../Token';
import { Plugin } from './Plugin';

/**
 * Normalizes colors
 */
export class ColorTransformPlugin extends Plugin {
  outputType = /.*/;

  tokenType = 'color';

  constructor(options: { type?: 'rgb' | 'rgba' | 'hex' | 'hex3' | 'hsl' | 'hsla' | 'named' }) {
    super(options);
  }

  toJSON(token: Token) {
    const { type } = this.options;

    return {
      ...token,
      value: new Color(token.value).toString(type),
    };
  }
}

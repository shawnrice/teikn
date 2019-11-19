import { Color } from '../Color';
import { Token } from '../Generators/Token';
import { Plugin } from './Plugin';

export class ColorTransformPlugin extends Plugin {
  outputType = /.*/;

  tokenType = 'color';

  constructor(options: {
    type?: 'rgb' | 'rgba' | 'hex' | 'hex3' | 'hsl' | 'hsla' | 'named';
  }) {
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

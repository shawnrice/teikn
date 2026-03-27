import type { Token } from "../Token";
/* eslint-disable @typescript-eslint/no-useless-constructor */
import { Color } from "../TokenTypes/Color";
import type { ColorFormat } from "../TokenTypes/Color/types";
import { Plugin } from "./Plugin";

type ColorTransformPluginOptions = {
  type?: ColorFormat;
} & Record<string, unknown>;

/**
 * Normalizes colors
 */
export class ColorTransformPlugin extends Plugin<ColorTransformPluginOptions> {
  outputType: RegExp = /.*/;

  tokenType: string = "color";

  override readonly runAfter: string[] = ["AlphaMultiplyPlugin"];

  constructor(options: ColorTransformPluginOptions) {
    super(options);
  }

  transform(token: Token): Token {
    const { type } = this.options;

    return {
      ...token,
      value: new Color(token.value as string | Color).toString(type),
    };
  }
}

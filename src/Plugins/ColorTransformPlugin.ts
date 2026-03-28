import type { Token } from "../Token";
/* eslint-disable @typescript-eslint/no-useless-constructor */
import { Color } from "../TokenTypes/Color";
import type { ColorFormat } from "../TokenTypes/Color/types";
import type { AuditIssue } from "./Plugin";
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

    // Skip unresolved references — they'll be resolved later
    if (
      typeof token.value === "string" &&
      token.value.startsWith("{") &&
      token.value.endsWith("}")
    ) {
      return token;
    }

    return {
      ...token,
      value: new Color(token.value as string | Color).toString(type),
    };
  }

  override audit(tokens: Token[]): AuditIssue[] {
    const { type } = this.options;

    if (type !== "hex" && type !== "hex3") {
      return [];
    }

    return tokens
      .filter((t) => t.type === this.tokenType)
      .flatMap((t) => {
        // Skip unresolved references
        if (typeof t.value === "string" && t.value.startsWith("{") && t.value.endsWith("}")) {
          return [];
        }

        const color = new Color(t.value as string | Color);
        if (color.alpha < 1) {
          return [
            {
              severity: "warning" as const,
              token: t.name,
              message: `Color has alpha ${color.alpha} but output format "${type}" discards the alpha channel`,
            },
          ];
        }

        return [];
      });
  }
}

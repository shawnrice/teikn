import type { Token } from "../Token.js";
import { CubicBezier } from "../TokenTypes/CubicBezier.js";
import { Duration } from "../TokenTypes/Duration.js";
import { Transition } from "../TokenTypes/Transition.js";
import { Plugin } from "./Plugin.js";

type ReducedMotionPluginOptions = {
  prefix?: string;
  zeroDuration?: boolean;
} & Record<string, unknown>;

const DEFAULT_PREFIX = "reduced-";

const TOKEN_TYPE_RE = /^(duration|timing|transition)$/;

const getDurationValue = (value: unknown): Duration | string =>
  value instanceof Duration ? new Duration(0.01, "s") : "0.01s";

const makeReducedToken = (token: Token, prefix: string, zeroDuration: boolean): Token | null => {
  const { type, value } = token;

  if (type === "duration") {
    return {
      ...token,
      name: `${prefix}${token.name}`,
      value: zeroDuration ? new Duration(0, "s") : getDurationValue(value),
    };
  }

  if (type === "timing") {
    return {
      ...token,
      name: `${prefix}${token.name}`,
      value: CubicBezier.linear,
    };
  }

  if (type === "transition") {
    if (value instanceof Transition) {
      return {
        ...token,
        name: `${prefix}${token.name}`,
        value: value.setDuration("0s").setTimingFunction(CubicBezier.linear),
      };
    }
    // String-based transition fallback
    return {
      ...token,
      name: `${prefix}${token.name}`,
      value: new Transition("0s", CubicBezier.linear),
    };
  }

  return null;
};

export class ReducedMotionPlugin extends Plugin<ReducedMotionPluginOptions> {
  tokenType: RegExp = TOKEN_TYPE_RE;
  outputType: RegExp = /.*/;

  constructor(options: ReducedMotionPluginOptions = {}) {
    super(options);
  }

  expand(tokens: Token[]): Token[] {
    const prefix = this.options.prefix ?? DEFAULT_PREFIX;
    const zeroDuration = this.options.zeroDuration ?? true;

    return tokens.flatMap((token) => {
      if (!TOKEN_TYPE_RE.test(token.type)) {
        return [token];
      }
      const reduced = makeReducedToken(token, prefix, zeroDuration);
      return reduced ? [token, reduced] : [token];
    });
  }
}

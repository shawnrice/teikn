import type { Token } from '../Token.js';
import { CubicBezier } from '../TokenTypes/CubicBezier.js';
import { Duration } from '../TokenTypes/Duration.js';
import { Transition } from '../TokenTypes/Transition.js';
import { Plugin } from './Plugin.js';

export type ReducedMotionPluginOptions = { prefix?: string; zeroDuration?: boolean };

const DEFAULT_PREFIX = 'reduced-';

const TOKEN_TYPE_RE = /^(duration|timing|transition)$/;

const getDurationValue = (value: unknown): Duration | string =>
  value instanceof Duration ? new Duration(0.01, 's') : '0.01s';

const reduceValue = (
  type: string,
  value: unknown,
  zeroDuration: boolean,
): Token['value'] | null => {
  if (type === 'duration') {
    return zeroDuration ? new Duration(0, 's') : getDurationValue(value);
  }

  if (type === 'timing') {
    return CubicBezier.linear;
  }

  if (type === 'transition') {
    // String-based transitions fall back to a bare zero-duration transition.
    return value instanceof Transition
      ? value.setDuration('0s').setTimingFunction(CubicBezier.linear)
      : new Transition('0s', CubicBezier.linear);
  }

  return null;
};

const makeReducedToken = (token: Token, prefix: string, zeroDuration: boolean): Token | null => {
  // The reduced token is derived, so it carries reduced mode values (a theme or
  // mode on the source must not put the unreduced value back) and no `link`.
  const { modes, link: _link, ...rest } = token;
  const value = reduceValue(token.type, token.value, zeroDuration);

  if (value === null) {
    return null;
  }

  const reducedModes = Object.entries(modes ?? {}).map(
    ([mode, modeValue]) => [mode, reduceValue(token.type, modeValue, zeroDuration)!] as const,
  );

  return {
    ...rest,
    name: `${prefix}${token.name}`,
    value,
    ...(reducedModes.length ? { modes: Object.fromEntries(reducedModes) } : {}),
  };
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

    return tokens.flatMap(token => {
      if (!TOKEN_TYPE_RE.test(token.type)) {
        return [token];
      }

      const reduced = makeReducedToken(token, prefix, zeroDuration);

      return reduced ? [token, reduced] : [token];
    });
  }
}

import { createSeedResolver } from '../resolve.js';
import { tokenKey } from '../token-keys.js';
import type { Token } from '../Token.js';
import { CubicBezier } from '../TokenTypes/CubicBezier.js';
import { Duration } from '../TokenTypes/Duration.js';
import { isRefString } from '../TokenTypes/ref-guard.js';
import type { TransitionInput } from '../TokenTypes/Transition.js';
import { Transition, TransitionList } from '../TokenTypes/Transition.js';
import { Plugin } from './Plugin.js';

export type ReducedMotionPluginOptions = { prefix?: string; zeroDuration?: boolean };

const DEFAULT_PREFIX = 'reduced-';

const TOKEN_TYPE_RE = /^(duration|timing|transition)$/;

const getDurationValue = (value: unknown): Duration | string =>
  value instanceof Duration ? new Duration(0.01, 's') : '0.01s';

// A transition (or list) in any authored form: first-class, shorthand string or
// plain composite. `null` when the value is not one (`none`, `var(--x)`, …).
const toTransition = (value: unknown): Transition | TransitionList | null => {
  if (value instanceof Transition || value instanceof TransitionList) {
    return value;
  }

  try {
    if (typeof value === 'string') {
      const list = new TransitionList(value);

      return list.length === 1 ? list.at(0)! : list;
    }

    return Transition.from(value as TransitionInput);
  } catch {
    return null;
  }
};

// Only the motion goes: the property and delay are kept.
const reduceTransition = (transition: Transition): Transition =>
  transition.setDuration('0s').setTimingFunction(CubicBezier.linear);

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
    const transition = toTransition(value);

    if (transition instanceof TransitionList) {
      return transition.map(reduceTransition);
    }

    // Anything that is not a transition falls back to a bare zero-duration transition.
    return transition ? reduceTransition(transition) : new Transition('0s', CubicBezier.linear);
  }

  return null;
};

type Resolve = (value: unknown, mode?: string) => unknown;

const makeReducedToken = (
  token: Token,
  prefix: string,
  zeroDuration: boolean,
  resolve: Resolve,
): Token | null => {
  // The reduced token is derived, so it carries reduced mode values (a theme or
  // mode on the source must not put the unreduced value back) and no `link`.
  const { modes, link: _link, ...rest } = token;
  const value = reduceValue(token.type, resolve(token.value), zeroDuration);

  if (value === null) {
    return null;
  }

  const reducedModes = Object.entries(modes ?? {}).map(
    ([mode, modeValue]) =>
      [mode, reduceValue(token.type, resolve(modeValue, mode), zeroDuration)!] as const,
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
    const resolveSeed = createSeedResolver(tokens);

    return tokens.flatMap(token => {
      if (!TOKEN_TYPE_RE.test(token.type)) {
        return [token];
      }

      // An alias is reduced as its target, so it keeps the target's property.
      // One that does not resolve before expansion is left for the fallback.
      const resolve: Resolve = (value, mode) =>
        isRefString(value) ? (resolveSeed(value, tokenKey(token), mode).value ?? value) : value;

      const reduced = makeReducedToken(token, prefix, zeroDuration, resolve);

      return reduced ? [token, reduced] : [token];
    });
  }
}

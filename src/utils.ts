export const clamp = (min: number, max: number, value: number): number =>
  Math.min(max, Math.max(min, value));

export const pad0 = (num: number | string): string | number => {
  if (typeof num === 'string') {
    return num.length < 2 ? `0${num}` : num;
  }

  if (typeof num === 'number') {
    // Only pad non-negative single digits: `pad0(-5)` must stay `-5`, not `0-5`.
    return num >= 0 && num < 10 ? `0${num}` : num;
  }

  throw new TypeError('pad0 can only work with numbers and strings');
};

const matchesString = (t1: any, t2: string): boolean => typeof t1 === 'string' && t1 === t2;

const matchesRegexp = (t1: any, t2: string): boolean => {
  if (!(t1 instanceof RegExp)) {
    return false;
  }

  // `RegExp.prototype.test` advances `lastIndex` for global/sticky regexes, so
  // reusing the same instance across tokens would match only every other one.
  // Test against a stateless clone.
  const stateless =
    t1.global || t1.sticky ? new RegExp(t1.source, t1.flags.replace(/[gy]/g, '')) : t1;

  return stateless.test(t2);
};

export const matches = (t1: unknown, t2: string): boolean =>
  matchesString(t1, t2) || matchesRegexp(t1, t2);

/* istanbul ignore next */

/**
 * Default date function that is used if another one is not passed
 */
export const getDate = (): string => {
  const now = new Date();
  const date = now.toDateString();
  const time = [now.getHours(), pad0(now.getMinutes()), pad0(now.getSeconds())].join(':');

  return `${date} ${time}`;
};

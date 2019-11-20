export const pad0 = (num: number | string) => {
  if (typeof num === 'string') {
    return num.length < 2 ? `0${num}` : num;
  }

  if (typeof num === 'number') {
    return num < 10 ? `0${num}` : num;
  }

  throw new TypeError('pad0 can only work with numbers and strings');
};

const matchesString = (t1: any, t2: string) => typeof t1 === 'string' && t1 === t2;

const matchesRegexp = (t1: any, t2: string) => t1 instanceof RegExp && t1.test(t2);

export const matches = (t1: any, t2: string) => matchesString(t1, t2) || matchesRegexp(t1, t2);

/**
 * Default date function that is used if another one is not passed
 */
export const getDate = () => {
  const now = new Date();
  const date = now.toDateString();
  const time = [now.getHours(), pad0(now.getMinutes()), pad0(now.getSeconds())].join(':');
  return `${date} ${time}`;
};

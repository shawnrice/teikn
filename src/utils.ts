export const pad0 = (num: number | string) => {
  if (typeof num === 'string') {
    return num.length < 2 ? `0${num}` : num;
  }

  if (typeof num === 'number') {
    return num < 10 ? `0${num}` : num;
  }

  throw new TypeError('pad0 can only work with numbers and strings');
};

/**
 * Default date function that is used if another one is not passed
 */
export const getDate = () => {
  const now = new Date();
  const date = now.toDateString();
  const time = [
    now.getHours(),
    pad0(now.getMinutes()),
    pad0(now.getSeconds()),
  ].join(':');
  return `${date} ${time}`;
};

export default getDate;

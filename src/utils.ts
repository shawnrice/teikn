/**
 * Default date function that is used if another one is not passed
 */
export const getDate = () => {
  const pad0 = (num: number) => (num < 10 ? `0${num}` : num);

  const now = new Date();
  const date = now.toDateString();
  const time = [now.getHours(), pad0(now.getMinutes()), pad0(now.getSeconds())].join(':');
  return `${date} ${time}`;
};

export default getDate;

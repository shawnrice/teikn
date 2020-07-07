const pad0 = (x: string): string => (x.toString().length < 2 ? `0${x}` : x);

export const RGBToHex = (red: number, green: number, blue: number, preferShort = false): string => {
  const initial = [red, green, blue].map(x => x.toString(16)).map(pad0);

  if (preferShort && initial.every(x => x.length === 2 && x[0] === x[1])) {
    return initial.map(x => x[0]).join('');
  }

  return initial.join('');
};

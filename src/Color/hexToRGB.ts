export const parseInt16 = (x: string) => parseInt(x, 16);

type RGBTuple = [number, number, number];

export const hexToRGB = (c: string): RGBTuple => {
  // Possibly remove the hash
  const color = c.slice(0, 1) === '#' ? c.slice(1) : c;

  // If it's a 6-character hex, then just parse it
  if (color.length === 6) {
    return [color.slice(0, 2), color.slice(2, 4), color.slice(4, 6)].map(parseInt16) as RGBTuple;
  }

  // If it's an abbreviated hex, then double each value and parse it as a 6 color hex
  if (color.length === 3) {
    return color
      .split('')
      .map(x => `${x}${x}`)
      .map(parseInt16) as RGBTuple;
  }

  throw new Error(`Cannot parse color ${c} as hex.`);
};

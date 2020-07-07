export const HSLToRGB = (
  hue: number,
  saturation: number,
  lightness: number,
): [number, number, number] => {
  const f = (coefficient: number) => {
    const angle = saturation * Math.min(lightness, 1 - lightness);
    const k = (coefficient + hue / 30) % 12;
    return lightness - angle * Math.max(Math.min(k - 3, 9 - k, 1), -1);
  };

  return [f(0), f(8), f(4)].map(x => x * 255).map(Math.round) as [number, number, number];
};

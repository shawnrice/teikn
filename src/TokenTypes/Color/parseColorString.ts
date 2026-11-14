import type { Space, SpaceData } from './ColorSpace.js';
import { hexToRGBWithAlpha } from './conversions.js';
import { namedColors } from './namedColors.js';
import { clamp, isHex, normalizeDegrees } from './util.js';
import { xkcdColors } from './xkcdNamedColors.js';

export type ParsedColor = { space: Space; data: SpaceData[Space]; alpha: number };

const functionRegex = /^(rgba?|hsla?|lab|lch|oklab|oklch|xyz)\(\s*(.*?)\s*\)$/i;
const numberRegex = /^([+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?)(%|deg|grad|rad|turn)?$/i;
// Components are separated by a comma or by whitespace — never by nothing.
const separatorRegex = /\s*,\s*|\s+/;

type Token = { value: number; unit: string };

// A reader returns NaN for a token it cannot accept (wrong unit, out of range).
type Reader = (token: Token) => number;

const hueFactors = new Map([
  ['', 1],
  ['deg', 1],
  ['grad', 0.9],
  ['rad', 180 / Math.PI],
  ['turn', 360],
]);

/** A plain number, or a percentage where 100% maps to `ref` */
const numberOrPercent =
  (ref: number): Reader =>
  ({ value, unit }) => {
    if (unit === '') {
      return value;
    }

    return unit === '%' ? (value / 100) * ref : NaN;
  };

const clamped =
  ({ min, max, read }: { min: number; max: number; read: Reader }): Reader =>
  token =>
    clamp(min, max, read(token));

const hue: Reader = ({ value, unit }) => normalizeDegrees(value * (hueFactors.get(unit) ?? NaN));

// Out-of-range rgb channels are rejected rather than clamped.
const rgbChannel: Reader = token => {
  const value = numberOrPercent(255)(token);

  return value >= 0 && value <= 255 ? Math.round(value) : NaN;
};

const hslPercent: Reader = token => clamp(0, 100, numberOrPercent(100)(token)) / 100;

const alphaChannel = clamped({ min: 0, max: 1, read: numberOrPercent(1) });
const labLightness = clamped({ min: 0, max: 100, read: numberOrPercent(100) });
// Oklab/Oklch lightness accepts either a 0-1 number or a 0%-100% percentage.
const okLightness = clamped({ min: 0, max: 1, read: numberOrPercent(1) });
const chroma = (ref: number): Reader =>
  clamped({ min: 0, max: Infinity, read: numberOrPercent(ref) });

// `legacy` functions also take alpha as a fourth positional argument.
type FunctionSpec = { space: Space; readers: readonly Reader[]; legacy: boolean };

const rgbSpec: FunctionSpec = {
  space: 'rgb',
  readers: [rgbChannel, rgbChannel, rgbChannel],
  legacy: true,
};

const hslSpec: FunctionSpec = {
  space: 'hsl',
  readers: [hue, hslPercent, hslPercent],
  legacy: true,
};

const modern = (space: Space, readers: readonly Reader[]): FunctionSpec => ({
  space,
  readers,
  legacy: false,
});

const specs = new Map<string, FunctionSpec>([
  ['rgb', rgbSpec],
  ['rgba', rgbSpec],
  ['hsl', hslSpec],
  ['hsla', hslSpec],
  ['lab', modern('lab', [labLightness, numberOrPercent(125), numberOrPercent(125)])],
  ['lch', modern('lch', [labLightness, chroma(150), hue])],
  ['oklab', modern('oklab', [okLightness, numberOrPercent(0.4), numberOrPercent(0.4)])],
  ['oklch', modern('oklch', [okLightness, chroma(0.4), hue])],
  ['xyz', modern('xyz', [numberOrPercent(1), numberOrPercent(1), numberOrPercent(1)])],
]);

// `none` (a missing component) is treated as 0.
const tokenize = (raw: string): Token => {
  if (raw.toLowerCase() === 'none') {
    return { value: 0, unit: '' };
  }

  const m = raw.match(numberRegex);

  return m
    ? { value: parseFloat(m[1]!), unit: (m[2] ?? '').toLowerCase() }
    : { value: NaN, unit: '' };
};

const parseFunction = ({ name, args }: { name: string; args: string }): ParsedColor | null => {
  const { space, readers, legacy } = specs.get(name.toLowerCase())!;
  const [body, slashAlpha, ...rest] = args.split('/');
  const parts = body!.trim().split(separatorRegex);
  const positionalAlpha = legacy && slashAlpha === undefined ? parts[3] : undefined;
  const expected = positionalAlpha === undefined ? 3 : 4;

  if (rest.length > 0 || parts.length !== expected) {
    return null;
  }

  const rawAlpha = slashAlpha?.trim() ?? positionalAlpha;
  const data = readers.map((read, i) => read(tokenize(parts[i]!)));
  const alpha = rawAlpha === undefined ? 1 : alphaChannel(tokenize(rawAlpha));

  if (![...data, alpha].every(Number.isFinite)) {
    return null;
  }

  return { space, data: data as unknown as SpaceData[Space], alpha };
};

export const parseColorString = (c: string): ParsedColor => {
  const trimmed = c.trim();

  // xkcd named colors (e.g. "xkcd:seafoam", "xkcd:electric purple")
  if (trimmed.toLowerCase().startsWith('xkcd:')) {
    const name = trimmed.slice(5).toLowerCase();

    if (Object.hasOwn(xkcdColors, name)) {
      return parseColorString(xkcdColors[name as keyof typeof xkcdColors]);
    }

    throw new Error(`Unknown xkcd color "${name}"`);
  }

  // CSS named colors → resolve to their hex value and re-parse
  if (Object.hasOwn(namedColors, trimmed.toLowerCase())) {
    const resolved: string = namedColors[trimmed.toLowerCase() as keyof typeof namedColors];

    return parseColorString(resolved);
  }

  // Hex
  if (isHex(trimmed)) {
    const { rgb, alpha } = hexToRGBWithAlpha(trimmed);

    return { space: 'rgb', data: rgb, alpha };
  }

  // Functional notation: rgb(a), hsl(a), lab, lch, oklab, oklch, xyz
  const fn = trimmed.match(functionRegex);
  const parsed = fn ? parseFunction({ name: fn[1]!, args: fn[2]! }) : null;

  if (!parsed) {
    throw new Error(`Cannot extract color from "${c}"`);
  }

  return parsed;
};

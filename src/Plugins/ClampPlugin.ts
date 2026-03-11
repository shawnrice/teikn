import type { Token } from "../Token";
import { Dimension } from "../TokenTypes/Dimension";
import { Plugin } from "./Plugin";

type ClampPair = {
  min: string;
  max: string;
  output: string;
};

type ClampPluginOptions = {
  viewportMin?: number;
  viewportMax?: number;
  pairs?: ClampPair[];
} & Record<string, unknown>;

const DEFAULT_VIEWPORT_MIN = 320;
const DEFAULT_VIEWPORT_MAX = 1280;

const round = (n: number, decimals = 4): number => Math.round(n * 10 ** decimals) / 10 ** decimals;

const toRem = (value: number, unit: string, remBase = 16): number => {
  if (unit === "rem") {
    return value;
  }
  if (unit === "px") {
    return value / remBase;
  }
  // For other absolute units, convert to px first then to rem
  const dim = new Dimension(value, unit as any);
  return dim.to("px").value / remBase;
};

const extractNumericValue = (token: Token): { value: number; unit: string } | null => {
  const { value } = token;

  if (value instanceof Dimension) {
    return { value: value.value, unit: value.unit };
  }

  if (typeof value === "string") {
    const match = value.match(/^(-?\d+(?:\.\d+)?)(px|rem|em|%|cm|mm|in|pt|pc)$/);
    if (match) {
      return { value: parseFloat(match[1]!), unit: match[2]! };
    }
  }

  if (typeof value === "number") {
    return { value, unit: "px" };
  }

  return null;
};

const buildClampValue = (
  minVal: number,
  maxVal: number,
  viewportMin: number,
  viewportMax: number,
): string => {
  const minRem = round(minVal);
  const maxRem = round(maxVal);

  // Convert viewport breakpoints to rem
  const vMin = viewportMin / 16;
  const vMax = viewportMax / 16;

  // slope = (maxVal - minVal) / (vMax - vMin)
  // intercept = minVal - slope * vMin
  // preferred = intercept + slope * 100vw (converted to vw)
  const slope = (maxVal - minVal) / (vMax - vMin);
  const intercept = minVal - slope * vMin;

  // Convert slope to vw units: slope is rem/rem, multiply by 100 for vw
  const slopeVw = round(slope * 100);
  const interceptRem = round(intercept);

  const preferred = interceptRem === 0 ? `${slopeVw}vw` : `${interceptRem}rem + ${slopeVw}vw`;

  return `clamp(${minRem}rem, ${preferred}, ${maxRem}rem)`;
};

export class ClampPlugin extends Plugin<ClampPluginOptions> {
  tokenType: RegExp = /.*/;
  outputType: RegExp = /.*/;

  constructor(options: ClampPluginOptions = {}) {
    super(options);
  }

  toJSON(token: Token): Token {
    return token;
  }

  expand(tokens: Token[]): Token[] {
    const pairs = this.options.pairs ?? [];
    const viewportMin = this.options.viewportMin ?? DEFAULT_VIEWPORT_MIN;
    const viewportMax = this.options.viewportMax ?? DEFAULT_VIEWPORT_MAX;

    if (pairs.length === 0) {
      return tokens;
    }

    const tokenMap = new Map(tokens.map((t) => [t.name, t]));
    const generated: Token[] = [];

    for (const pair of pairs) {
      const minToken = tokenMap.get(pair.min);
      const maxToken = tokenMap.get(pair.max);

      if (!minToken || !maxToken) {
        continue;
      }

      const minExtracted = extractNumericValue(minToken);
      const maxExtracted = extractNumericValue(maxToken);

      if (!minExtracted || !maxExtracted) {
        continue;
      }

      const minRem = toRem(minExtracted.value, minExtracted.unit);
      const maxRem = toRem(maxExtracted.value, maxExtracted.unit);

      const clampStr = buildClampValue(minRem, maxRem, viewportMin, viewportMax);

      generated.push({
        name: pair.output,
        type: minToken.type,
        value: clampStr,
      });
    }

    return [...tokens, ...generated];
  }
}

import { createSeedResolver } from '../resolve.js';
import { tokenKey } from '../token-keys.js';
import type { Token } from '../Token.js';
import { Dimension } from '../TokenTypes/Dimension.js';
import { Plugin } from './Plugin.js';
import { findTokens } from './token-names.js';

type ClampPair = { min: string; max: string; output: string };

export type ClampPluginOptions = {
  viewportMin?: number;
  viewportMax?: number;
  pairs?: ClampPair[];
};

const DEFAULT_VIEWPORT_MIN = 320;
const DEFAULT_VIEWPORT_MAX = 1280;

const round = (n: number, decimals = 4): number => Math.round(n * 10 ** decimals) / 10 ** decimals;

const toRem = (value: number, unit: string, remBase = 16): number => {
  if (unit === 'rem') {
    return value;
  }

  if (unit === 'px') {
    return value / remBase;
  }

  // For other absolute units, convert to px first then to rem
  const dim = new Dimension(value, unit as any);

  return dim.to('px').value / remBase;
};

const extractNumericValue = (value: unknown): { value: number; unit: string } | null => {
  if (value instanceof Dimension) {
    return { value: value.value, unit: value.unit };
  }

  if (typeof value === 'string') {
    const match = value.match(/^(-?\d+(?:\.\d+)?)(px|rem|em|%|cm|mm|in|pt|pc)$/);

    if (match) {
      return { value: parseFloat(match[1]!), unit: match[2]! };
    }
  }

  if (typeof value === 'number') {
    return { value, unit: 'px' };
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

    const { viewportMin = DEFAULT_VIEWPORT_MIN, viewportMax = DEFAULT_VIEWPORT_MAX } = options;

    if (!(viewportMin < viewportMax)) {
      throw new Error(
        `ClampPlugin: viewportMin (${viewportMin}) must be less than viewportMax (${viewportMax})`,
      );
    }
  }

  expand(tokens: Token[]): Token[] {
    const pairs = this.options.pairs ?? [];
    const viewportMin = this.options.viewportMin ?? DEFAULT_VIEWPORT_MIN;
    const viewportMax = this.options.viewportMax ?? DEFAULT_VIEWPORT_MAX;

    if (pairs.length === 0) {
      return tokens;
    }

    const resolve = createSeedResolver(tokens);

    const find = (pair: ClampPair, role: 'min' | 'max'): Token => {
      const name = pair[role];
      const where = `ClampPlugin pair "${pair.output}": ${role} token "${name}"`;
      const found = findTokens(tokens, name);

      if (found.length === 0) {
        throw new Error(`${where} was not found`);
      }

      if (found.length > 1) {
        const keys = found.map(t => tokenKey(t));

        throw new Error(
          `${where} is ambiguous — matches ${keys.join(', ')}. Use a qualified name like "${keys[0]}".`,
        );
      }

      return found[0]!;
    };

    const remOf = (pair: ClampPair, role: 'min' | 'max'): { token: Token; rem: number } => {
      const token = find(pair, role);
      const where = `ClampPlugin pair "${pair.output}": ${role} token "${pair[role]}"`;
      const { value, error } = resolve(token.value, tokenKey(token));

      if (error !== undefined) {
        throw new Error(error);
      }

      const extracted = extractNumericValue(value);

      if (!extracted) {
        throw new Error(
          `${where} is not a length (expected a number, a Dimension, or e.g. "16px")`,
        );
      }

      try {
        return { token, rem: toRem(extracted.value, extracted.unit) };
      } catch {
        throw new Error(
          `${where} uses unit "${extracted.unit}", which cannot be converted to rem. Use px, rem or an absolute unit.`,
        );
      }
    };

    const generated = pairs.map((pair): Token => {
      const min = remOf(pair, 'min');
      const max = remOf(pair, 'max');

      return {
        name: pair.output,
        type: min.token.type,
        value: buildClampValue(min.rem, max.rem, viewportMin, viewportMax),
      };
    });

    return [...tokens, ...generated];
  }
}

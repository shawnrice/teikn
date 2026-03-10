import type { Token } from '../Token';
import { Dimension } from '../TokenTypes/Dimension';
import type { AuditIssue } from './Plugin';
import { Plugin } from './Plugin';

type TouchTargetPluginOptions = {
  minPx?: number;
  basePx?: number;
  types?: string[];
} & Record<string, unknown>;

const DIMENSION_RE = /^(-?\d+(?:\.\d+)?)(px|rem|em|pt)$/;

const toPx = (value: unknown, basePx: number): number | null => {
  if (value instanceof Dimension) {
    try {
      return value.toPx(basePx).value;
    } catch {
      return null;
    }
  }

  if (typeof value === 'number') {
    return value;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const m = value.match(DIMENSION_RE);
  if (!m) {
    return null;
  }

  const num = parseFloat(m[1]!);
  const unit = m[2]!;

  switch (unit) {
    case 'px': return num;
    case 'rem': return num * basePx;
    case 'em': return num * basePx;
    case 'pt': return num * (96 / 72);
    default: return null;
  }
};

const DEFAULT_TYPES = ['size', 'touch-target', 'icon'];

export class TouchTargetPlugin extends Plugin<TouchTargetPluginOptions> {
  tokenType: RegExp = /.*/;
  outputType: RegExp = /.*/;

  toJSON(token: Token): Token {
    return token;
  }

  audit(tokens: Token[]): AuditIssue[] {
    const { minPx = 44, basePx = 16, types = DEFAULT_TYPES } = this.options;
    const typeSet = new Set(types);

    return tokens
      .filter(t => typeSet.has(t.type))
      .flatMap(t => {
        const px = toPx(t.value, basePx);
        if (px === null) {
          return [];
        }

        if (px < minPx) {
          return [{
            severity: 'warning' as const,
            token: t.name,
            message: `Touch target size ${t.value} (${px}px) is below minimum of ${minPx}px`,
          }];
        }

        return [];
      });
  }
}

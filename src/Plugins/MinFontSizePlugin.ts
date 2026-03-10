import type { Token } from '../Token';
import { Dimension } from '../TokenTypes/Dimension';
import type { AuditIssue } from './Plugin';
import { Plugin } from './Plugin';

type MinFontSizePluginOptions = {
  minPx?: number;
  basePx?: number;
} & Record<string, unknown>;

const DIMENSION_RE = /^(-?\d+(?:\.\d+)?)(px|rem|em|pt)$/;

const toPx = (value: unknown, basePx: number): number | null => {
  if (value instanceof Dimension) {
    try {
      return value.toPx(basePx).value;
    } catch {
      // Non-convertible unit (e.g., vw)
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

export class MinFontSizePlugin extends Plugin<MinFontSizePluginOptions> {
  tokenType: RegExp = /font-size/;
  outputType: RegExp = /.*/;

  toJSON(token: Token): Token {
    return token;
  }

  override audit(tokens: Token[]): AuditIssue[] {
    const { minPx = 12, basePx = 16 } = this.options;

    return tokens
      .filter(t => this.tokenType.test(t.type))
      .flatMap(t => {
        const px = toPx(t.value, basePx);
        if (px === null) {
          return [];
        }

        if (px < minPx) {
          return [{
            severity: 'warning' as const,
            token: t.name,
            message: `Font size ${t.value} (${px}px) is below minimum of ${minPx}px`,
          }];
        }

        return [];
      });
  }
}

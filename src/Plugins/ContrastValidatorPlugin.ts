import { tokenKey } from '../token-keys.js';
import type { Token } from '../Token.js';
import { Color } from '../TokenTypes/Color/index.js';
import type { AuditIssue } from './Plugin.js';
import { Plugin } from './Plugin.js';
import { findTokens } from './token-names.js';

export type ContrastValidatorPluginOptions = {
  pairs: { foreground: string; background: string; level?: 'AA' | 'AAA' }[];
  minRatio?: number;
};

const WCAG_THRESHOLDS: Record<'AA' | 'AAA', number> = { AA: 4.5, AAA: 7 };

// Prefer color tokens so `color.primary` wins over `spacing.primary`.
const findColorTokens = (tokens: Token[], name: string): Token[] => {
  const found = findTokens(tokens, name);
  const colors = found.filter(t => t.type === 'color');

  return colors.length > 0 ? colors : found;
};

const ambiguous = (role: string, name: string, found: Token[]): AuditIssue => ({
  severity: 'warning',
  token: name,
  message: `${role} token "${name}" is ambiguous — matches ${found.map(t => tokenKey(t)).join(', ')}. Use a qualified name.`,
});

export class ContrastValidatorPlugin extends Plugin<ContrastValidatorPluginOptions> {
  tokenType: string = 'color';
  outputType: RegExp = /.*/;

  constructor(options: ContrastValidatorPluginOptions) {
    super(options);

    if (!Array.isArray(options?.pairs)) {
      throw new Error(
        'ContrastValidatorPlugin: `pairs` is required, e.g. ' +
          '{ pairs: [{ foreground: "text", background: "surface" }] }',
      );
    }
  }

  override audit(tokens: Token[]): AuditIssue[] {
    const { pairs, minRatio } = this.options;

    return pairs.flatMap(({ foreground, background, level = 'AA' }) => {
      const fgFound = findColorTokens(tokens, foreground);
      const bgFound = findColorTokens(tokens, background);
      const [fgToken] = fgFound;
      const [bgToken] = bgFound;

      if (!fgToken) {
        return [
          {
            severity: 'warning' as const,
            token: foreground,
            message: `Foreground token "${foreground}" not found`,
          },
        ];
      }

      if (!bgToken) {
        return [
          {
            severity: 'warning' as const,
            token: background,
            message: `Background token "${background}" not found`,
          },
        ];
      }

      if (fgFound.length > 1) {
        return [ambiguous('Foreground', foreground, fgFound)];
      }

      if (bgFound.length > 1) {
        return [ambiguous('Background', background, bgFound)];
      }

      try {
        const fgColor =
          fgToken.value instanceof Color ? fgToken.value : new Color(fgToken.value as string);
        const bgColor =
          bgToken.value instanceof Color ? bgToken.value : new Color(bgToken.value as string);
        const ratio = fgColor.contrastRatio(bgColor);
        const threshold = minRatio ?? WCAG_THRESHOLDS[level];
        const rounded = Math.round(ratio * 100) / 100;

        if (ratio < threshold) {
          return [
            {
              severity: 'warning' as const,
              token: foreground,
              message: `Contrast ratio ${rounded}:1 between "${foreground}" and "${background}" is below WCAG ${level} threshold of ${threshold}:1`,
            },
          ];
        }

        return [];
      } catch {
        return [
          {
            severity: 'warning' as const,
            token: foreground,
            message: `Could not compute contrast between "${foreground}" and "${background}" — invalid color value`,
          },
        ];
      }
    });
  }
}

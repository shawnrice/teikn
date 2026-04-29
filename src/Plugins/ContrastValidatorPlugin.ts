import type { Token } from "../Token.js";
import { Color } from "../TokenTypes/Color/index.js";
import type { AuditIssue } from "./Plugin.js";
import { Plugin } from "./Plugin.js";

type ContrastValidatorPluginOptions = {
  pairs: { foreground: string; background: string; level?: "AA" | "AAA" }[];
  minRatio?: number;
} & Record<string, unknown>;

const WCAG_THRESHOLDS: Record<"AA" | "AAA", number> = {
  AA: 4.5,
  AAA: 7,
};

export class ContrastValidatorPlugin extends Plugin<ContrastValidatorPluginOptions> {
  tokenType: string = "color";
  outputType: RegExp = /.*/;

  override audit(tokens: Token[]): AuditIssue[] {
    const tokenMap = new Map(tokens.map((t) => [t.name, t]));
    const { pairs, minRatio } = this.options;

    return pairs.flatMap(({ foreground, background, level = "AA" }) => {
      const fgToken = tokenMap.get(foreground);
      const bgToken = tokenMap.get(background);

      if (!fgToken) {
        return [
          {
            severity: "error" as const,
            token: foreground,
            message: `Foreground token "${foreground}" not found`,
          },
        ];
      }
      if (!bgToken) {
        return [
          {
            severity: "error" as const,
            token: background,
            message: `Background token "${background}" not found`,
          },
        ];
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
              severity: "error" as const,
              token: foreground,
              message: `Contrast ratio ${rounded}:1 between "${foreground}" and "${background}" is below WCAG ${level} threshold of ${threshold}:1`,
            },
          ];
        }

        return [];
      } catch {
        return [
          {
            severity: "error" as const,
            token: foreground,
            message: `Could not compute contrast between "${foreground}" and "${background}" — invalid color value`,
          },
        ];
      }
    });
  }
}

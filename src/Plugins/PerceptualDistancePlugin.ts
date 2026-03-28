import type { Token } from "../Token";
import { Color } from "../TokenTypes/Color";
import type { AuditIssue } from "./Plugin";
import { Plugin } from "./Plugin";

type PerceptualDistancePluginOptions = {
  minDeltaE?: number;
  groups?: string[][];
} & Record<string, unknown>;

export class PerceptualDistancePlugin extends Plugin<PerceptualDistancePluginOptions> {
  tokenType: string = "color";
  outputType: RegExp = /.*/;

  override audit(tokens: Token[]): AuditIssue[] {
    const { minDeltaE = 5.0, groups } = this.options;

    const colorTokens = tokens.filter((t) => t.type === "color");
    const tokenMap = new Map(colorTokens.map((t) => [t.name, t]));

    const toColor = (t: Token): Color | null => {
      try {
        return t.value instanceof Color ? t.value : new Color(t.value as string);
      } catch {
        return null;
      }
    };

    const comparePairs = (names: string[]): AuditIssue[] => {
      const issues: AuditIssue[] = [];

      for (let i = 0; i < names.length; i++) {
        for (let j = i + 1; j < names.length; j++) {
          const tA = tokenMap.get(names[i]!);
          const tB = tokenMap.get(names[j]!);
          if (!tA || !tB) {
            continue;
          }

          const cA = toColor(tA);
          const cB = toColor(tB);
          if (!cA || !cB) {
            continue;
          }

          const dE = cA.deltaE(cB);
          const rounded = Math.round(dE * 100) / 100;

          if (dE < minDeltaE) {
            issues.push({
              severity: "warning",
              token: tA.name,
              message: `Colors "${tA.name}" and "${tB.name}" are very similar (ΔE = ${rounded}), minimum is ${minDeltaE}`,
            });
          }
        }
      }

      return issues;
    };

    if (groups) {
      return groups.flatMap(comparePairs);
    }

    // Auto-group by token.group (set by the group() builder)
    const byGroup = new Map<string, string[]>();
    for (const t of colorTokens) {
      const g = t.group ?? "_ungrouped";
      if (!byGroup.has(g)) {
        byGroup.set(g, []);
      }
      byGroup.get(g)!.push(t.name);
    }
    return [...byGroup.values()].flatMap(comparePairs);
  }
}

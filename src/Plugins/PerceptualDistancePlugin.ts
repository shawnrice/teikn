import type { Token } from '../Token.js';
import { Color } from '../TokenTypes/Color/index.js';
import type { AuditIssue } from './Plugin.js';
import { Plugin } from './Plugin.js';

/**
 * "These two colors are too similar" is a judgment, and judgment needs intent:
 * it presumes the two colors are *meant* to be told apart. Ramps (adjacent steps
 * are supposed to be close), aliases (ΔE 0 by design), and unrelated families are
 * not mutually-distinguishable peers, and there is no reliable way to infer which
 * tokens are peers from their names or structure without baking one house style
 * into a general tool.
 *
 * So this plugin takes the intent as input — the same model as
 * `ContrastValidatorPlugin`, which never guesses foreground vs. background but is
 * handed the pairs. Declare the peer `sets` that must be mutually distinguishable
 * and it measures within each. Measurement itself is always fair game, so a
 * non-gating `report` mode is available too. Nothing is compared by default.
 */
type PerceptualDistancePluginOptions = {
  /** Minimum acceptable ΔE00 between two tokens in a peer set. Default: 5.0 */
  minDeltaE?: number;
  /**
   * Peer sets: each inner array lists token names that must be mutually
   * distinguishable. The plugin measures every pair *within* each set and warns
   * when ΔE00 falls below `minDeltaE`. Tokens not in any set are ignored.
   */
  sets?: string[][];
  /**
   * @deprecated Renamed to {@link PerceptualDistancePluginOptions.sets}.
   * Still honored (as an alias) for backward compatibility; `sets` wins when
   * both are given.
   */
  groups?: string[][];
  /**
   * Opt in to comparing *every* pair of color tokens and gating below
   * `minDeltaE`. This asserts that all color tokens are mutually-distinguishable
   * peers — usually false once ramps and aliases exist — so it is off by default
   * and must be requested explicitly.
   */
  all?: boolean;
  /**
   * Report mode: emit the pairwise ΔE00 as non-gating `info` findings
   * (worst/most-similar first) with no pass/fail. Measures within `sets`/`groups`
   * when provided, otherwise across all color pairs. Takes precedence over
   * gating — use it to inspect the data and decide intent yourself.
   */
  report?: boolean;
} & Record<string, unknown>;

const toColor = (t: Token): Color | null => {
  try {
    return t.value instanceof Color ? t.value : new Color(t.value as string);
  } catch {
    return null;
  }
};

type Measurement = { a: Token; b: Token; deltaE: number };

const round2 = (n: number): number => Math.round(n * 100) / 100;

/** Measure ΔE00 for every pair of the named tokens, skipping unknown/invalid. */
const measurePairs = (names: string[], tokenMap: Map<string, Token>): Measurement[] => {
  const measurements: Measurement[] = [];

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

      measurements.push({ a: tA, b: tB, deltaE: cA.deltaE(cB) });
    }
  }

  return measurements;
};

export class PerceptualDistancePlugin extends Plugin<PerceptualDistancePluginOptions> {
  tokenType: string = 'color';
  outputType: RegExp = /.*/;

  override audit(tokens: Token[]): AuditIssue[] {
    const { minDeltaE = 5.0, sets, groups, all, report } = this.options;
    const peerSets = sets ?? groups;

    const colorTokens = tokens.filter(t => t.type === 'color');
    const tokenMap = new Map(colorTokens.map(t => [t.name, t]));
    const allNames = colorTokens.map(t => t.name);

    // Report mode: pure measurement, no judgment. Emit every measured pair as a
    // non-gating `info`, most-similar first, so the author (or a downstream
    // tool) can decide what counts as "too close".
    if (report) {
      const scope = peerSets ?? [allNames];
      const measurements = scope
        .flatMap(names => measurePairs(names, tokenMap))
        .toSorted((x, y) => x.deltaE - y.deltaE);

      return measurements.map(({ a, b, deltaE }) => ({
        severity: 'info' as const,
        token: a.name,
        message: `ΔE = ${round2(deltaE)} between "${a.name}" and "${b.name}"`,
      }));
    }

    const gate = (measurements: Measurement[]): AuditIssue[] =>
      measurements
        .filter(({ deltaE }) => deltaE < minDeltaE)
        .map(({ a, b, deltaE }) => ({
          severity: 'warning' as const,
          token: a.name,
          message: `Colors "${a.name}" and "${b.name}" are very similar (ΔE = ${round2(deltaE)}), minimum is ${minDeltaE}`,
        }));

    // Declared peer sets — the recommended, intent-explicit mode.
    if (peerSets) {
      return peerSets.flatMap(names => gate(measurePairs(names, tokenMap)));
    }

    // Explicit opt-in to all-pairs gating.
    if (all) {
      return gate(measurePairs(allNames, tokenMap));
    }

    // No intent declared → no judgment. Surface a single non-gating advisory so
    // the plugin isn't silently inert.
    return [
      {
        severity: 'info',
        token: '',
        message:
          'PerceptualDistancePlugin compared no colors: declare peer `sets` to gate, ' +
          'pass `all: true` to compare every pair, or `report: true` for a non-gating ΔE report.',
      },
    ];
  }
}

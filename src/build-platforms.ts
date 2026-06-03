import path from 'node:path';

import type { Generator } from './Generators/Generator.js';
import type { Plugin } from './Plugins/index.js';
import { Teikn } from './Teikn.js';
import type { TransformResult } from './Teikn.js';
import type { ThemeLayer } from './Token.js';
import { composeTokenSets } from './TokenSet.js';
import type { TokenSet } from './TokenSet.js';

export type PlatformBuild = {
  /** The base token set every platform starts from. */
  base: TokenSet;
  /**
   * Platform name → its delta token set. `null` means "use base unchanged"
   * (e.g. the canonical web build). A delta overrides the base by qualified
   * key (`group.name`) via {@link composeTokenSets} — a build-time collapse,
   * not a runtime mode: the platform's artifact carries flat values with no
   * `modes` block or `[data-theme]` selector.
   */
  platforms: Record<string, TokenSet | null>;
  /**
   * Fresh generator instances per platform. A factory rather than an array
   * because each {@link Teikn} build binds its generators to itself (via
   * `siblings`), so sharing instances across builds would cross-wire them.
   * Receives the platform name so a platform can emit a different set
   * (e.g. a Swift generator for iOS, CSS for web).
   */
  generators: (platform: string) => Generator[];
  /** Optional per-platform plugins, built fresh per platform for the same reason. */
  plugins?: (platform: string) => Plugin[];
  /** Optional per-platform theme layers, if you mix modes into a platform build. */
  themes?: (platform: string) => ThemeLayer[];
  /** Output root. Each platform writes to `${outDir}/${platform}`. */
  outDir: string;
};

/**
 * Build one flat artifact set per platform from a shared base plus per-platform
 * deltas — the "base tokens, change some for another platform" workflow.
 *
 * Runs platforms sequentially (builds are fast; concurrency can be added later
 * without changing the signature). Returns each platform's {@link TransformResult}
 * keyed by platform name.
 *
 * @example
 * ```ts
 * await buildPlatforms({
 *   base,
 *   platforms: { web: null, mobile },
 *   generators: () => [new JavaScript({ filename: "tokens" }), new CssVars({ filename: "tokens" })],
 *   outDir: "generated",
 * });
 * ```
 */
export const buildPlatforms = ({
  base,
  platforms,
  generators,
  plugins,
  themes,
  outDir,
}: PlatformBuild): Promise<Map<string, TransformResult>> =>
  Object.entries(platforms).reduce(async (acc, [platform, delta]) => {
    const results = await acc;
    const tokens = delta ? composeTokenSets(base, delta) : base.tokens;
    const writer = new Teikn({
      outDir: path.join(outDir, platform),
      generators: generators(platform),
      ...(plugins ? { plugins: plugins(platform) } : {}),
      ...(themes ? { themes: themes(platform) } : {}),
    });

    return results.set(platform, await writer.transform(tokens));
  }, Promise.resolve(new Map<string, TransformResult>()));

import { serializeDtcg } from "../dtcg";
import type { Plugin } from "../Plugins";
import { sortPlugins } from "../Plugins/Plugin";
import type { Token } from "../Token";
import { matches } from "../utils";
import type { GeneratorInfo, GeneratorOptions } from "./Generator";
import { Generator, applyPlugin } from "./Generator";

const defaultOptions = {
  ext: "tokens.json",
};

export type DtcgOpts = {
  /** Use hierarchical grouping based on token names. Default: true */
  hierarchical?: boolean;
  /** Separator for reconstructing groups. Default: '.' */
  separator?: string;
} & GeneratorOptions;

export class DtcgGenerator extends Generator<DtcgOpts> {
  constructor(options = {}) {
    super(Object.assign({}, defaultOptions, options));
  }

  override describe(): GeneratorInfo {
    return {
      format: "DTCG",
      usage: `// W3C Design Token Community Group format\n// Import into Style Dictionary, Tokens Studio, or other DTCG-compatible tools`,
    };
  }

  override tokenUsage(_: Token): string | null {
    return null;
  }

  // DTCG skips stringifyValues() because it needs raw first-class values
  // (e.g., Dimension serializes as { value: 1, unit: "rem" }, not "1rem").
  // But it still uses sortPlugins + applyPlugin for correct ordering and mode handling.
  protected override prepareTokens(tokens: Token[], plugins: Plugin[]): Token[] {
    const sorted = sortPlugins(plugins);
    return tokens.map((token) =>
      sorted.reduce((acc, plugin) => {
        if (!matches(plugin.tokenType, token.type)) {
          return acc;
        }

        if (!matches(plugin.outputType, this.options.ext)) {
          return acc;
        }

        return applyPlugin(plugin, acc);
      }, token),
    );
  }

  generateToken(_: Token): string {
    return "";
  }

  combinator(tokens: Token[]): string {
    const doc = serializeDtcg(tokens, {
      hierarchical: this.options.hierarchical ?? true,
      separator: this.options.separator ?? ".",
    });
    return JSON.stringify(doc, null, 2);
  }
}

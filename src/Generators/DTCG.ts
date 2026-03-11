import { serializeDTCG } from "../dtcg";
import type { Plugin } from "../Plugins";
import type { Token } from "../Token";
import { matches } from "../utils";
import type { GeneratorInfo, GeneratorOptions } from "./Generator";
import { Generator } from "./Generator";

const defaultOptions = {
  ext: "tokens.json",
};

export type DTCGOpts = {
  /** Use hierarchical grouping based on token names. Default: true */
  hierarchical?: boolean;
  /** Separator for reconstructing groups. Default: '.' */
  separator?: string;
} & GeneratorOptions;

export class DTCGGenerator extends Generator<DTCGOpts> {
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

  protected override prepareTokens(tokens: Token[], plugins: Plugin[]): Token[] {
    return tokens.map((token) =>
      plugins.reduce((acc, plugin) => {
        if (!matches(plugin.tokenType, token.type)) {
          return acc;
        }

        if (!matches(plugin.outputType, this.options.ext)) {
          return acc;
        }

        return plugin.toJSON(acc);
      }, token),
    );
  }

  generateToken(_: Token): string {
    return "";
  }

  combinator(tokens: Token[]): string {
    const doc = serializeDTCG(tokens, {
      hierarchical: this.options.hierarchical ?? true,
      separator: this.options.separator ?? ".",
    });
    return JSON.stringify(doc, null, 2);
  }
}

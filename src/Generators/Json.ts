import { camelCase } from "../string-utils.js";
import type { Token } from "../Token.js";
import type { GeneratorInfo, GeneratorOptions } from "./Generator.js";
import { Generator } from "./Generator.js";

const defaultOptions = {
  ext: "json",
  nameTransformer: camelCase,
};

export type JsonOpts = {
  nameTransformer?: (name: string) => string;
} & GeneratorOptions;

export class Json extends Generator<JsonOpts> {
  constructor(options = {}) {
    const opts = Object.assign({}, defaultOptions, options);
    super(opts);
  }

  override describe(): GeneratorInfo {
    return {
      format: "JSON",
      usage: `// Import as a module (Node ESM requires the import attribute)\nimport tokens from './${this.file}' with { type: 'json' };\n\n// Or fetch at runtime\nfetch('./${this.file}').then(r => r.json())`,
    };
  }

  generateToken(token: Token): Record<string, Omit<Token, "name">> {
    const { nameTransformer } = this.options;
    const { name, ...values } = token;
    const key = nameTransformer!(name);

    return { [key]: values };
  }

  combinator(tokens: Token[]): string {
    const combined = tokens.reduce(
      (acc, token) => Object.assign(acc, this.generateToken(token)),
      {},
    );

    return JSON.stringify(combined, null, 2);
  }
}

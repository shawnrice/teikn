import { EOL } from "node:os";

import { kebabCase } from "../string-utils";
import type { Token } from "../Token";
import { getDate } from "../utils";
import type { GeneratorInfo, GeneratorOptions } from "./Generator";
import { Generator } from "./Generator";
import { cssValue } from "./value-serializers";

const defaultOptions = {
  ext: "css",
  nameTransformer: kebabCase,
  dateFn: getDate,
};

export type CssVarsOpts = {
  nameTransformer?: (name: string) => string;
  dateFn?: () => string | null;
  useMediaQuery?: boolean;
  modeSelectors?: Record<string, string>;
} & GeneratorOptions;

export class CssVars extends Generator<CssVarsOpts> {
  constructor(options = {}) {
    const opts = Object.assign({}, defaultOptions, options);
    super(opts);
    if (this.options.groups) {
      throw new Error(
        "CssVars does not support the `groups` option — CSS has no function syntax. Use Scss or ScssVars for grouped accessors.",
      );
    }
  }

  override describe(): GeneratorInfo {
    return {
      format: "CSS Custom Properties",
      usage: `<link rel="stylesheet" href="./${this.file}">\n\n/* Then use variables anywhere in your CSS */\nvar(--token-name)`,
    };
  }

  override tokenUsage(token: Token): string | null {
    const { nameTransformer } = this.options;
    return `var(--${nameTransformer!(token.name)})`;
  }

  override header(): string {
    return this.commentHeader();
  }

  generateToken(token: Token): string {
    const { nameTransformer } = this.options;
    const { usage, value } = token;
    const key = `--${nameTransformer!(token.name)}`;

    return [usage && `  /* ${usage} */`, `  ${key}: ${cssValue(value)};`].filter(Boolean).join(EOL);
  }

  combinator(tokens: Token[]): string {
    const rootVars = tokens.map((token) => this.generateToken(token));

    const modeMap = this.buildModeMap(tokens, (key, val) => `  --${key}: ${cssValue(val)};`);

    const blocks = [`:root {`, rootVars.join(EOL), `}`];

    for (const [mode, vars] of modeMap) {
      const { useMediaQuery, modeSelectors } = this.options;
      const selector = modeSelectors?.[mode] ?? `[data-theme="${mode}"]`;
      blocks.push("", `${selector} {`, vars.join(EOL), `}`);

      if (useMediaQuery && mode === "dark") {
        const indented = vars.map((v) => `  ${v}`);
        blocks.push(
          "",
          `@media (prefers-color-scheme: dark) {`,
          `  :root {`,
          indented.join(EOL),
          `  }`,
          `}`,
        );
      }
    }

    return blocks.join(EOL);
  }
}

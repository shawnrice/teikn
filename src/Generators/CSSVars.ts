import { EOL } from "node:os";

import { kebabCase } from "../string-utils";
import type { Token } from "../Token";
import { getDate } from "../utils";
import type { GeneratorOptions } from "./Generator";
import { Generator } from "./Generator";

const cssValue = (value: unknown): string => {
  if (typeof value !== "object" || value === null) {
    return String(value);
  }
  const obj = value as Record<string, unknown>;
  if ("width" in obj && "style" in obj && "color" in obj) {
    return [obj.width, obj.style, obj.color].filter(Boolean).join(" ");
  }
  return Object.values(obj).join(" ");
};

const defaultOptions = {
  ext: "css",
  nameTransformer: kebabCase,
  dateFn: getDate,
};

export type CSSVarsOpts = {
  nameTransformer?: (name: string) => string;
  dateFn?: () => string | null;
  useMediaQuery?: boolean;
  modeSelectors?: Record<string, string>;
} & GeneratorOptions;

export class CSSVars extends Generator<CSSVarsOpts> {
  constructor(options = {}) {
    const opts = Object.assign({}, defaultOptions, options);
    super(opts);
  }

  override describe() {
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
    const { dateFn } = this.options;

    return [
      `/**`,
      ` * ${this.signature()}`,
      ` * Generated ${dateFn!()}`,
      ` *`,
      ` * This file is generated and should be committed to source control`,
      ` */`,
    ].join(EOL);
  }

  generateToken(token: Token): string {
    const { nameTransformer } = this.options;
    const { usage, value } = token;
    const key = `--${nameTransformer!(token.name)}`;

    return [usage && `  /* ${usage} */`, `  ${key}: ${cssValue(value)};`].filter(Boolean).join(EOL);
  }

  combinator(tokens: Token[]): string {
    const { nameTransformer } = this.options;
    const rootVars = tokens.map((token) => this.generateToken(token));

    const modeMap = new Map<string, string[]>();

    for (const token of tokens) {
      if (!token.modes) {
        continue;
      }

      const key = `--${nameTransformer!(token.name)}`;

      for (const [mode, val] of Object.entries(token.modes)) {
        const line = `  ${key}: ${val};`;

        if (!modeMap.has(mode)) {
          modeMap.set(mode, []);
        }
        modeMap.get(mode)!.push(line);
      }
    }

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

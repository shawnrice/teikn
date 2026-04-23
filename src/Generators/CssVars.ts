import { EOL } from "node:os";

import { kebabCase } from "../string-utils";
import type { Token, TokenValue } from "../Token";
import { getDate } from "../utils";
import type { GeneratorInfo, GeneratorOptions } from "./Generator";
import { Generator } from "./Generator";
import { cssValue, stringifyWithRefs } from "./value-serializers";

const defaultOptions = {
  ext: "css",
  nameTransformer: kebabCase,
  dateFn: getDate,
};

export type ModeSelector = string | { atRule: string; selector?: string };

export type CssVarsOpts = {
  nameTransformer?: (name: string) => string;
  dateFn?: () => string | null;
  useMediaQuery?: boolean;
  modeSelectors?: Record<string, ModeSelector>;
} & GeneratorOptions;

const parseModeSelector = (
  raw: ModeSelector | undefined,
  mode: string,
): { atRule: string | null; selector: string } => {
  if (raw == null) {
    return { atRule: null, selector: `[data-theme="${mode}"]` };
  }
  if (typeof raw === "object") {
    return { atRule: raw.atRule, selector: raw.selector ?? ":root" };
  }
  if (raw.startsWith("@")) {
    return { atRule: raw, selector: ":root" };
  }
  return { atRule: null, selector: raw };
};

export class CssVars extends Generator<CssVarsOpts> {
  #refMap: Map<unknown, string> = new Map();

  constructor(options = {}) {
    const opts = Object.assign({}, defaultOptions, options);
    super(opts);
    if (this.options.groups) {
      throw new Error(
        "CssVars does not support the `groups` option — CSS has no function syntax. Use Scss or ScssVars for grouped accessors.",
      );
    }
  }

  #ref(value: unknown): string | null {
    const name = this.#refMap.get(value);
    if (!name) {
      return null;
    }
    const { nameTransformer } = this.options;
    return `var(--${nameTransformer!(name)})`;
  }

  protected override stringifyTokenValue(value: TokenValue): string {
    return stringifyWithRefs(value, (v) => this.#ref(v));
  }

  override prepareTokens(...args: Parameters<Generator["prepareTokens"]>): Token[] {
    this.#refMap = this.buildReferenceMap(args[0]);
    return super.prepareTokens(...args);
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
      const raw = modeSelectors?.[mode];
      const { atRule, selector } = parseModeSelector(raw, mode);

      if (atRule) {
        const indented = vars.map((v) => `  ${v}`);
        blocks.push("", `${atRule} {`, `  ${selector} {`, indented.join(EOL), `  }`, `}`);
      } else {
        blocks.push("", `${selector} {`, vars.join(EOL), `}`);
      }

      if (useMediaQuery && mode === "dark" && !atRule) {
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

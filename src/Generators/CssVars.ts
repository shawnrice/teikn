import { EOL } from "node:os";

import { kebabCase } from "../string-utils.js";
import type { Token, TokenValue } from "../Token.js";
import { getDate } from "../utils.js";
import type { GeneratorInfo, GeneratorOptions } from "./Generator.js";
import { Generator } from "./Generator.js";
import type { PrefixOptions } from "./prefix-utils.js";
import { composeSymbol } from "./prefix-utils.js";
import { cssValue, stringifyWithRefs } from "./value-serializers.js";

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
} & GeneratorOptions &
  PrefixOptions;

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
    return `var(--${this.#emit(name)})`;
  }

  #emit(name: string): string {
    const { nameTransformer } = this.options;
    return composeSymbol(name, nameTransformer!, this.options);
  }

  protected override stringifyTokenValue(value: TokenValue): string {
    return stringifyWithRefs(value, (v) => this.#ref(v));
  }

  override prepareTokens(...args: Parameters<Generator["prepareTokens"]>): Token[] {
    // Run plugins first so the refMap captures any name changes (e.g., from
    // NameConventionPlugin). Otherwise references inside composed values
    // (Transition, BoxShadow) point at the pre-rename names.
    const transformed = this.applyPluginPipeline(args[0], args[1]);
    this.#refMap = this.buildReferenceMap(transformed);
    return transformed.map((t) => this.stringifyValues(t));
  }

  override describe(): GeneratorInfo {
    return {
      format: "CSS Custom Properties",
      usage: `<link rel="stylesheet" href="./${this.file}">\n\n/* Then use variables anywhere in your CSS */\nvar(--token-name)`,
    };
  }

  override tokenUsage(token: Token): string | null {
    return `var(--${this.#emit(token.name)})`;
  }

  override header(): string {
    return this.commentHeader();
  }

  generateToken(token: Token): string {
    const { usage, value } = token;
    const key = `--${this.#emit(token.name)}`;

    return [usage && `  /* ${usage} */`, `  ${key}: ${cssValue(value)};`].filter(Boolean).join(EOL);
  }

  combinator(tokens: Token[]): string {
    const rootVars = tokens.map((token) => this.generateToken(token));

    const modeMap = this.buildModeMap(tokens, (_key, val, _mode, token) => {
      return `  --${this.#emit(token.name)}: ${cssValue(val)};`;
    });

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

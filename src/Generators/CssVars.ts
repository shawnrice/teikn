import { EOL } from 'node:os';

import { kebabCase } from '../string-utils.js';
import type { Token, TokenValue } from '../Token.js';
import type { GeneratorInfo, GeneratorOptions } from './Generator.js';
import { Generator } from './Generator.js';
import type { PrefixOptions } from './prefix-utils.js';
import { composeSymbol } from './prefix-utils.js';
import { cssValue, stringifyWithRefs } from './value-serializers.js';

const defaultOptions = { ext: 'css', nameTransformer: kebabCase };

export type ModeSelector = string | { atRule: string; selector?: string };

/**
 * Wrap the emitted custom properties in a named CSS cascade layer.
 *
 * A bare string is the layer name; the object form additionally controls
 * whether a leading `@layer <name>;` statement is emitted before the block so
 * the layer's position in the cascade is established even if the sheet is
 * imported after other layered CSS.
 */
export type LayerOption = string | { name: string; statement?: boolean };

export type CssVarsOpts = {
  nameTransformer?: (name: string) => string;
  dateFn?: () => string | null;
  useMediaQuery?: boolean;
  modeSelectors?: Record<string, ModeSelector>;
  layer?: LayerOption;
} & GeneratorOptions &
  PrefixOptions;

const parseLayer = (
  layer: LayerOption | undefined,
): { name: string; statement: boolean } | null => {
  if (layer == null) {
    return null;
  }

  if (typeof layer === 'string') {
    return { name: layer, statement: false };
  }

  return { name: layer.name, statement: layer.statement ?? false };
};

const parseModeSelector = (
  raw: ModeSelector | undefined,
  mode: string,
): { atRule: string | null; selector: string } => {
  if (raw == null) {
    return { atRule: null, selector: `[data-theme="${mode}"]` };
  }

  if (typeof raw === 'object') {
    return { atRule: raw.atRule, selector: raw.selector ?? ':root' };
  }

  if (raw.startsWith('@')) {
    return { atRule: raw, selector: ':root' };
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
        'CssVars does not support the `groups` option — CSS has no function syntax. Use Scss or ScssVars for grouped accessors.',
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
    return stringifyWithRefs(value, v => this.#ref(v));
  }

  override prepareTokens(...args: Parameters<Generator['prepareTokens']>): Token[] {
    // Run plugins first so the refMap captures any name changes (e.g., from
    // NameConventionPlugin). Otherwise references inside composed values
    // (Transition, BoxShadow) point at the pre-rename names.
    const transformed = this.applyPluginPipeline(args[0], args[1]);
    this.#refMap = this.buildReferenceMap(transformed);

    return transformed.map(t => this.stringifyValues(t));
  }

  override describe(): GeneratorInfo {
    return {
      format: 'CSS Custom Properties',
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
    const rootVars = tokens.map(token => this.generateToken(token));

    const modeMap = this.buildModeMap(tokens, (_key, val, _mode, token) => {
      return `  --${this.#emit(token.name)}: ${cssValue(val)};`;
    });

    const blocks = [`:root {`, rootVars.join(EOL), `}`];

    for (const [mode, vars] of modeMap) {
      const { useMediaQuery, modeSelectors } = this.options;
      const raw = modeSelectors?.[mode];
      const { atRule, selector } = parseModeSelector(raw, mode);

      if (atRule) {
        const indented = vars.map(v => `  ${v}`);
        blocks.push('', `${atRule} {`, `  ${selector} {`, indented.join(EOL), `  }`, `}`);
      } else {
        blocks.push('', `${selector} {`, vars.join(EOL), `}`);
      }

      if (useMediaQuery && mode === 'dark' && !atRule) {
        const indented = vars.map(v => `  ${v}`);
        blocks.push(
          '',
          `@media (prefers-color-scheme: dark) {`,
          `  :root {`,
          indented.join(EOL),
          `  }`,
          `}`,
        );
      }
    }

    const body = blocks.join(EOL);

    const layer = parseLayer(this.options.layer);

    if (!layer) {
      return body;
    }

    // Wrap the whole sheet — base `:root` plus every mode/theme block, including
    // `@media` at-rules, which simply nest one level deeper inside the layer.
    const indented = body
      .split(EOL)
      .map(line => (line.length > 0 ? `  ${line}` : line))
      .join(EOL);
    const block = `@layer ${layer.name} {${EOL}${indented}${EOL}}`;

    // An optional leading statement fixes the layer's cascade position up front,
    // independent of where this sheet lands in the consumer's import order.
    return layer.statement ? `@layer ${layer.name};${EOL}${EOL}${block}` : block;
  }
}

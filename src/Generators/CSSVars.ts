import { EOL } from 'os';

import { kebabCase } from '../string-utils';
import type { Token } from '../Token';
import { getDate } from '../utils';
import type { GeneratorOptions } from './Generator';
import Generator from './Generator';

const cssValue = (value: unknown): string => {
  if (typeof value !== 'object' || value === null) { return String(value); }
  const obj = value as Record<string, unknown>;
  if ('width' in obj && 'style' in obj && 'color' in obj) {
    return [obj.width, obj.style, obj.color].filter(Boolean).join(' ');
  }
  return Object.values(obj).join(' ');
};

const defaultOptions = {
  ext: 'css',
  nameTransformer: kebabCase,
  dateFn: getDate,
};

export interface CSSVarsOpts extends GeneratorOptions {
  nameTransformer?: (name: string) => string;
  dateFn?: () => string | null;
}

export class CSSVars extends Generator<CSSVarsOpts> {
  constructor(options = {}) {
    const opts = Object.assign({}, defaultOptions, options);
    super(opts);
  }

  override describe() {
    return {
      format: 'CSS Custom Properties',
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

    return [usage && `  /* ${usage} */`, `  ${key}: ${cssValue(value)};`]
      .filter(Boolean)
      .join(EOL);
  }

  combinator(tokens: Token[]): string {
    const { nameTransformer } = this.options;
    const rootVars = tokens.map(token => this.generateToken(token));

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
      blocks.push('', `[data-theme="${mode}"] {`, vars.join(EOL), `}`);
    }

    return blocks.join(EOL);
  }
}

export default CSSVars;

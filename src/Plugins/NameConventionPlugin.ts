import { camelCase, kebabCase } from '../string-utils';
import type { Token } from '../Token';
import { Plugin } from './Plugin';

type NameConvention = 'camelCase' | 'kebab-case' | 'snake_case' | 'PascalCase' | 'SCREAMING_SNAKE';

type NameConventionPluginOptions = {
  convention: NameConvention;
} & Record<string, unknown>;

// Split a name into word segments, handling camel, kebab, snake, and mixed
const toWords = (str: string): string[] =>
  str
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .split(/[\W_-]+/g)
    .filter(Boolean)
    .map(w => w.toLowerCase());

const upperFirst = (str: string): string =>
  str.slice(0, 1).toUpperCase() + str.slice(1);

const converters: Record<NameConvention, (name: string) => string> = {
  'camelCase': (name) => camelCase(name),
  'kebab-case': (name) => kebabCase(name),
  'snake_case': (name) => toWords(name).join('_'),
  'PascalCase': (name) => toWords(name).map(w => upperFirst(w)).join(''),
  'SCREAMING_SNAKE': (name) => toWords(name).map(w => w.toUpperCase()).join('_'),
};

export class NameConventionPlugin extends Plugin<NameConventionPluginOptions> {
  tokenType: RegExp = /.*/;
  outputType: RegExp = /.*/;

  constructor(options: NameConventionPluginOptions) {
    super(options);
  }

  toJSON(token: Token): Token {
    const { convention } = this.options;
    const convert = converters[convention];

    return {
      ...token,
      name: convert(token.name),
    };
  }
}

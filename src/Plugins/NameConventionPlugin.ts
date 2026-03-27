import { camelCase, kebabCase } from "../string-utils";
import type { ModeValues, Token } from "../Token";
import { Plugin } from "./Plugin";

type NameConvention = "camelCase" | "kebab-case" | "snake_case" | "PascalCase" | "SCREAMING_SNAKE";

type NameConventionPluginOptions = {
  convention: NameConvention;
} & Record<string, unknown>;

// Split a name into word segments, handling camel, kebab, snake, and mixed
const toWords = (str: string): string[] =>
  str
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .split(/[\W_-]+/g)
    .filter(Boolean)
    .map((w) => w.toLowerCase());

const upperFirst = (str: string): string => str.slice(0, 1).toUpperCase() + str.slice(1);

const converters: Record<NameConvention, (name: string) => string> = {
  camelCase: (s) => camelCase(s),
  "kebab-case": (s) => kebabCase(s),
  snake_case: (s) => toWords(s).join("_"),
  PascalCase: (s) =>
    toWords(s)
      .map((w) => upperFirst(w))
      .join(""),
  SCREAMING_SNAKE: (s) =>
    toWords(s)
      .map((w) => w.toUpperCase())
      .join("_"),
};

export class NameConventionPlugin extends Plugin<NameConventionPluginOptions> {
  tokenType: RegExp = /.*/;
  outputType: RegExp = /.*/;

  override readonly runAfter: string[] = ["PrefixTypePlugin", "StripTypePrefixPlugin"];

  transform(token: Token): Token {
    const { convention } = this.options;
    const convert = converters[convention];

    const result: Token = {
      ...token,
      name: convert(token.name),
    };

    if (token.modes) {
      const convertedModes: ModeValues = {};
      for (const [key, value] of Object.entries(token.modes)) {
        convertedModes[convert(key)] = value;
      }
      result.modes = convertedModes;
    }

    return result;
  }
}

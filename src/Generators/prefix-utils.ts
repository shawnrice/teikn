/**
 * Compose a generator's emitted symbol from prefix segments and a token name.
 *
 * The prefix is an *output-format* concern — it lives on the generator, not
 * the token. It's used to namespace global symbols (CSS custom properties,
 * top-level SCSS variables) so they don't collide with other consumers of
 * the same global namespace.
 *
 * Each segment runs through the same `transform` as the token name, so
 * authoring style (`prefix: "myCompany"` vs `prefix: "my-company"`) does
 * not matter — both yield `my-company-color-primary` under `kebabCase`.
 */
export type PrefixOptions = {
  prefix?: string | string[];
  separator?: string;
};

const toSegments = (prefix: string | string[] | undefined): string[] => {
  if (prefix === undefined) {
    return [];
  }
  return Array.isArray(prefix) ? prefix : [prefix];
};

export const composeSymbol = (
  name: string,
  transform: (s: string) => string,
  { prefix, separator = "-" }: PrefixOptions,
): string => {
  const segments = toSegments(prefix);
  if (segments.length === 0) {
    return transform(name);
  }
  return [...segments.map(transform), transform(name)].join(separator);
};

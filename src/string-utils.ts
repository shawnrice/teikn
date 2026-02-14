const lowerFirst = (str: string) => str.slice(0, 1).toLowerCase() + str.slice(1);
const upperFirst = (str: string) => str.slice(0, 1).toUpperCase() + str.slice(1);
const lower = (str: string) => str.toLowerCase();

/**
 * Converts camelCase => kebab-case
 */
export const camelToKebabCase = (str: string): string => {
  const ret = lower(str.replace(/[A-Z]/g, '-$1'));
  return ret.startsWith('-') ? ret.slice(1) : ret;
};

export const kebabCase = (str: string): string => {
  return camelToKebabCase(camelCase(str));
};

export const camelCase = (str: string): string =>
  lowerFirst(
    str
      .split(/[\W_]/g)
      .filter(Boolean)
      .map(part => upperFirst(lower(part)))
      .join(''),
  );

const lowerFirst = (str: string) => str.slice(0, 1).toLowerCase() + str.slice(1);
const upperFirst = (str: string) => str.slice(0, 1).toUpperCase() + str.slice(1);
const lower = (str: string) => str.toLowerCase();

/**
 * Converts camelCase => kebab-case
 */
export const camelToKebabCase = (str: string): string => {
  const ret = lower(
    str
      .replace(/[A-Z]/g, '-$&')
      .replace(/([a-zA-Z])(\d)/g, '$1-$2'),
  );
  return ret.startsWith('-') ? ret.slice(1) : ret;
};

export const kebabCase = (str: string): string => {
  return camelToKebabCase(camelCase(str));
};

export const camelCase = (str: string): string =>
  lowerFirst(
    str
      .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
      .split(/[\W_]/g)
      .filter(Boolean)
      .map(part => upperFirst(lower(part)))
      .join(''),
  );

export const deriveShortName = (tokenName: string, type: string): string => {
  const prefix = camelCase(type);
  if (tokenName.length > prefix.length && tokenName.startsWith(prefix)) {
    return tokenName[prefix.length].toLowerCase() + tokenName.slice(prefix.length + 1);
  }
  return tokenName;
};

const lowerFirst = (str: string) => str.slice(0, 1).toLowerCase() + str.slice(1);
const upperFirst = (str: string) => str.slice(0, 1).toUpperCase() + str.slice(1);
const lower = (str: string) => str.toLowerCase();

/**
 * Converts camelCase => kebab-case
 */
export const camelToKebabCase = (str: string): string => {
  const ret = lower(str.replace(/[A-Z]/g, "-$&").replace(/([a-zA-Z])(\d)/g, "$1-$2"));
  return ret.startsWith("-") ? ret.slice(1) : ret;
};

export const kebabCase = (str: string): string => {
  return camelToKebabCase(camelCase(str));
};

export const camelCase = (str: string): string =>
  lowerFirst(
    str
      .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
      .split(/[\W_]/g)
      .filter(Boolean)
      .map((part) => upperFirst(lower(part)))
      .join(""),
  );

/**
 * Splits a string on a delimiter while respecting parenthesis depth.
 * Defaults to splitting on commas.
 */
export const splitTopLevel = (str: string, delimiter = ","): string[] => {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i]!;
    if (ch === "(") {
      depth++;
    } else if (ch === ")") {
      depth--;
    } else if (ch === delimiter && depth === 0) {
      parts.push(str.slice(start, i).trim());
      start = i + 1;
    }
  }
  const last = str.slice(start).trim();
  if (last.length > 0) {
    parts.push(last);
  }
  return parts;
};

export const deriveShortName = (tokenName: string, type: string): string => {
  // Hyphen-separated prefix (e.g., "color-primary" with type "color")
  const hyphenPrefix = `${type}-`;
  if (tokenName.startsWith(hyphenPrefix)) {
    return tokenName.slice(hyphenPrefix.length);
  }

  // camelCase prefix (e.g., "colorPrimary" with type "color")
  const prefix = camelCase(type);
  const next = tokenName[prefix.length];
  if (
    tokenName.length > prefix.length &&
    tokenName.startsWith(prefix) &&
    next !== undefined &&
    next === next.toUpperCase() &&
    next !== next.toLowerCase()
  ) {
    return next.toLowerCase() + tokenName.slice(prefix.length + 1);
  }

  return tokenName;
};

type Flip<T extends Record<string, string>> = {
  [V in T[keyof T]]: {
    [K in keyof T]: V extends T[K] ? K : never;
  }[keyof T];
};

/**
 * Flips the keys and values of an object
 *
 * ```javascript
 * flip({ a: 'b', c: 'd' }) // { b: 'a', d: 'c' }
 * ```
 *
 * Note: keys are always strings (because they are object keys)
 *
 * So,
 * ```javascript
 * flip({ a: 1, b: 2 }) // { 1: 'a', 2: 'b' }
 * ```
 * There, we'd also note that the key '1' would be coerced to a string, etc...
 *
 * If you want to preserve the keys exactly, then we can implement this with a Map instead
 */
export const flip = <T extends Record<string, string>>(obj: T) =>
  Object.keys(obj).reduce((acc, name) => {
    // @ts-ignore
    acc[obj[name]] = name;
    return acc;
  }, {} as Flip<T>);

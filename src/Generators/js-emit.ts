import { isValidIdentifier, quoteKey, quoteString } from './value-serializers.js';

// Words that cannot be a binding name in a (strict-mode) ES module.
const RESERVED = new Set(
  (
    'arguments await break case catch class const continue debugger default delete do else enum ' +
    'eval export extends false finally for function if implements import in instanceof interface ' +
    'let new null package private protected public return static super switch this throw true ' +
    'try typeof var void while with yield'
  ).split(' '),
);

// Names the emitted module already exports.
const OWN_EXPORTS = new Set(['tokens', 'modes']);

// Bindings the CommonJS module wrapper passes in; a top-level `const` of the
// same name does not load.
const CJS_BINDINGS = new Set(['exports', 'require', 'module', '__filename', '__dirname']);

const unusableReason = ({
  name,
  module,
}: {
  name: string;
  module: string | undefined;
}): string | null => {
  if (!isValidIdentifier(name)) {
    return 'is not a valid JavaScript identifier';
  }

  if (RESERVED.has(name)) {
    return 'is a reserved word';
  }

  if (module === 'cjs' && CJS_BINDINGS.has(name)) {
    return 'is a CommonJS module binding';
  }

  if (OWN_EXPORTS.has(name)) {
    return `collides with the module's own \`${name}\` export`;
  }

  return null;
};

/**
 * Group accessors are emitted as `export const <groupName>`, so the name must
 * be a usable binding. Throws rather than silently renaming.
 */
export const assertGroupExportName = ({
  generator,
  groupName,
  module,
  type,
}: {
  generator: string;
  groupName: string;
  module: string | undefined;
  type: string;
}): void => {
  const reason = unusableReason({ name: groupName, module });

  if (reason) {
    throw new Error(
      `${generator}: cannot emit a group accessor for token type ${JSON.stringify(type)} — ` +
        `the export name \`${groupName}\` ${reason}. Rename the type or disable \`groups\`.`,
    );
  }
};

/**
 * Group names are the camelCased token type, so distinct types can share one
 * (`font-size` / `fontSize`) and would be emitted as duplicate declarations.
 */
export const assertUniqueGroupNames = ({
  generator,
  groups,
}: {
  generator: string;
  groups: { groupName: string; entries: { token: { type: string } }[] }[];
}): void => {
  const seen = new Map<string, string>();

  for (const { groupName, entries } of groups) {
    const { type } = entries[0]!.token;
    const prior = seen.get(groupName);

    if (prior !== undefined) {
      throw new Error(
        `${generator}: token types ${JSON.stringify(prior)} and ${JSON.stringify(type)} both ` +
          `produce the group name \`${groupName}\`. Rename one of them so their group names differ.`,
      );
    }

    seen.set(groupName, type);
  }
};

/**
 * Object-literal key. `__proto__` must be a computed key: both `__proto__: v`
 * and `'__proto__': v` set the prototype instead of defining a property.
 */
export const objectKey = (name: string): string =>
  name === '__proto__' ? `['__proto__']` : quoteKey(name);

/** `.name` when `name` is an identifier, `['name']` otherwise. */
export const propertyAccess = (name: string): string =>
  isValidIdentifier(name) ? `.${name}` : `[${quoteString(name)}]`;

/** Free text as JSDoc body lines: one per source line, comment terminators neutralised. */
export const jsDocLines = (text: string): string[] =>
  text
    .replace(/\*\//g, '*\\/')
    .split(/\r?\n/)
    .map(line => `   *  ${line}`);

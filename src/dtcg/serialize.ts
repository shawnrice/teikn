import { tokenKey } from '../token-keys.js';
import type { Token } from '../Token.js';
import type { TokenWithExtensions, WithGroupMeta } from './meta.js';
import { groupMetaKey, sourceKey, teiknExtension } from './meta.js';
import type { DtcgDocument, DtcgToken } from './types.js';
import type { DtcgRefMap } from './values.js';
import { dtcgTypeToTeikn, mapAliases, teiknToDtcg } from './values.js';

export type SerializeOptions = {
  /** Separator used in token names to reconstruct groups. Default: '.' */
  separator?: string;
  /** When true, reconstruct group hierarchy from token names. Default: true */
  hierarchical?: boolean;
};

type Node = Record<string, any>;

// Group and document nodes have no prototype, so a `__proto__` (or
// `constructor`) path segment is just another key instead of a way to reach
// `Object.prototype`. They still JSON-serialize like any object.
const emptyNode = (): Node => Object.create(null) as Node;

const isObject = (value: unknown): value is Node =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const collisionError = (path: string[]): Error =>
  new Error(
    `DTCG serialization: token name collision at "${path.join('.')}" — one token's name is a ` +
      `group prefix of another's (e.g. "a" and "a${'.'}b"). DTCG cannot represent a node that is ` +
      `both a token and a group; rename so no token name is a prefix segment of another, or pick a ` +
      `separator that doesn't split these names.`,
  );

const duplicateError = (path: string[]): Error =>
  new Error(
    `DTCG serialization: two tokens share the path "${path.join('.')}". Each DTCG token needs a ` +
      `unique path; rename one, or give the tokens different groups.`,
  );

const setNestedValue = (obj: Node, path: string[], token: DtcgToken): void => {
  let current = obj;

  for (let i = 0; i < path.length - 1; i++) {
    const segment = path[i]!;
    const existing = current[segment];

    // Descending through a node that is already a token leaf ($value) would
    // attach a child group to it — invalid DTCG, and the token is silently lost
    // on reparse. Fail loudly instead. (forward order: `a` then `a.b`.)
    if (existing && typeof existing === 'object' && '$value' in existing) {
      throw collisionError(path.slice(0, i + 1));
    }

    if (!(segment in current) || typeof current[segment] !== 'object') {
      current[segment] = emptyNode();
    }

    current = current[segment];
  }

  const leaf = path[path.length - 1]!;
  const existing = current[leaf];

  // The leaf slot is already a group (has children, no $value): placing a token
  // here would clobber those child tokens. (reverse order: `a.b` then `a`.)
  if (existing && typeof existing === 'object' && !('$value' in existing)) {
    throw collisionError(path);
  }

  // A second token at the same path would silently replace the first.
  if (existing) {
    throw duplicateError(path);
  }

  current[leaf] = token;
};

// `$root` is a token like any other child; other `$` keys are metadata.
const isMetaKey = (key: string): boolean => key.startsWith('$') && key !== '$root';

// Returns whether every token under `obj` carries (or inherits) a `$type`. A
// group type is only hoisted when that holds, since an untyped token (an
// inexpressible value, an alias) would otherwise inherit a type it lacks.
const hoistGroupTypes = (obj: Node): boolean => {
  let allTyped = true;

  for (const [key, value] of Object.entries(obj)) {
    if (isMetaKey(key) || !value || typeof value !== 'object') {
      continue;
    }

    // If this node has $value, it's a token leaf — skip
    if ('$value' in value) {
      allTyped &&= Boolean(value.$type);
      continue;
    }

    // Recurse into sub-groups first
    const groupTyped = hoistGroupTypes(value);
    allTyped &&= groupTyped;

    if (!groupTyped) {
      continue;
    }

    // Collect $type from all direct children
    const childTypes = new Set<string>();

    for (const [childKey, childVal] of Object.entries(value)) {
      if (isMetaKey(childKey) || !childVal || typeof childVal !== 'object') {
        continue;
      }

      const childType = (childVal as any).$type;

      if (childType) {
        childTypes.add(childType);
      }
    }

    // If all children share the same type, hoist it to the group
    if (childTypes.size === 1) {
      const sharedType = [...childTypes][0]!;
      value.$type = sharedType;

      // Remove $type from children
      for (const [childKey, childVal] of Object.entries(value)) {
        if (isMetaKey(childKey) || !childVal || typeof childVal !== 'object') {
          continue;
        }

        if ((childVal as any).$type === sharedType) {
          delete (childVal as any).$type;
        }
      }
    }
  }

  return allTyped;
};

const tokenToDtcg = (
  token: TokenWithExtensions,
  refMap: DtcgRefMap,
  toAliasPath: (name: string) => string,
): DtcgToken => {
  const relink = (value: unknown): unknown =>
    mapAliases(value, alias => `{${toAliasPath(alias.slice(1, -1))}}`);

  // A linked ref (`ref(name, { link: true })`) serializes as a DTCG alias to
  // the target token, mirroring CSS `var(--…)`. The alias must use the token's
  // *hierarchical* path (`{group.token}`), not the flat emitted name, or it
  // dangles when groups are reconstructed.
  const { value, type } = teiknToDtcg(
    token.link ? `{${token.link}}` : token.value,
    token.type,
    refMap,
  );

  // `$type` is only ever a real DTCG type; a teikn-only type name is omitted
  // (never invented) and recorded under `$extensions` so it round-trips.
  const result: DtcgToken = { $value: relink(value) as any, ...(type ? { $type: type } : {}) };

  if (token.usage) {
    result.$description = token.usage;
  }

  // Recorded whenever parsing the emitted `$type` would not give the name back.
  const ownType =
    token.type !== 'unknown' &&
    token.type !== type &&
    (type === undefined || token.type !== dtcgTypeToTeikn(type))
      ? token.type
      : undefined;
  const previous = token.extensions?.[teiknExtension];
  const modes = Object.entries(token.modes ?? {});

  const extensions = {
    ...token.extensions,
    ...(ownType
      ? { [teiknExtension]: { ...(isObject(previous) ? previous : {}), type: ownType } }
      : {}),
    ...(modes.length > 0
      ? {
          mode: Object.fromEntries(
            modes.map(([mode, val]) => [mode, relink(teiknToDtcg(val, token.type).value)]),
          ),
        }
      : {}),
  };

  if (Object.keys(extensions).length > 0) {
    result.$extensions = extensions;
  }

  return result;
};

const buildRefMap = (tokens: Token[], aliasOf: (token: Token) => string): DtcgRefMap => {
  const map: DtcgRefMap = new Map();

  for (const token of tokens) {
    if (typeof token.value === 'object' && token.value !== null && !map.has(token.value)) {
      // Store the hierarchical alias path so identity/composite refs also emit
      // `{group.token}` rather than the flat emitted name.
      map.set(token.value, aliasOf(token));
    }
  }

  return map;
};

const groupMetaKeys = ['$description', '$extensions', '$deprecated'];

// Put back the group-level metadata `parseDtcg` set aside, wherever the group
// still exists.
const restoreGroupMeta = (doc: Node, tokens: Token[], hierarchical: boolean): void => {
  for (const [key, meta] of (tokens as WithGroupMeta)[groupMetaKey] ?? []) {
    const path = key === '' ? [] : key.split('.');
    const group =
      hierarchical || path.length === 0
        ? path.reduce<Node | undefined>(
            (node, segment) => (node && Object.hasOwn(node, segment) ? node[segment] : undefined),
            doc,
          )
        : undefined;

    if (!isObject(group) || '$value' in group) {
      continue;
    }

    for (const metaKey of groupMetaKeys.filter(k => meta[k] !== undefined)) {
      group[metaKey] = meta[metaKey];
    }
  }
};

// A parsed token goes back where the document had it, unless it was renamed.
const sourcePath = (token: TokenWithExtensions): string[] | undefined =>
  token[sourceKey]?.key === tokenKey(token) ? token[sourceKey].path : undefined;

export const serializeDtcg = (tokens: Token[], options?: SerializeOptions): DtcgDocument => {
  const separator = options?.separator ?? '.';
  const hierarchical = options?.hierarchical ?? true;

  // A token's group is part of its path, so same-named tokens in different
  // groups (`line-height.tight`, `letter-spacing.tight`) do not collide.
  const keyOf = (token: Token): string =>
    token.group ? `${token.group}${separator}${token.name}` : token.name;
  const pathOf = (token: Token): string[] => {
    const nested = sourcePath(token) ?? keyOf(token).split(separator);
    const path = hierarchical ? nested : [nested.join(separator)];
    const reserved = path.find(segment => segment.startsWith('$') && segment !== '$root');

    if (reserved !== undefined) {
      throw new Error(
        `DTCG serialization: token "${tokenKey(token)}" has the path segment "${reserved}". A ` +
          `DTCG token or group name must not start with "$" (reserved for \`$value\`, \`$type\` ` +
          `and the like); rename the token or its group.`,
      );
    }

    return path;
  };

  const aliasOf = (token: Token): string => pathOf(token).join('.');

  // Bare names first, so a qualified key always wins over a bare one. Teikn
  // references are written `group.name` whatever the separator.
  const aliasPaths = new Map<string, string>([
    ...tokens.toReversed().map(token => [token.name, aliasOf(token)] as const),
    ...tokens.map(token => [tokenKey(token), aliasOf(token)] as const),
    ...tokens.map(token => [keyOf(token), aliasOf(token)] as const),
  ]);

  // DTCG aliases always use `.` as the path separator. When groups are
  // reconstructed from names, rewrite the emitted name's separator to `.`;
  // otherwise (flat output) the name is the key verbatim.
  const toAliasPath = (name: string): string =>
    aliasPaths.get(name) ?? (hierarchical ? name.split(separator).join('.') : name);
  const refMap = buildRefMap(tokens, aliasOf);

  const doc = emptyNode();

  for (const token of tokens) {
    setNestedValue(doc, pathOf(token), tokenToDtcg(token, refMap, toAliasPath));
  }

  if (hierarchical) {
    hoistGroupTypes(doc);
  }

  restoreGroupMeta(doc, tokens, hierarchical);

  return doc as DtcgDocument;
};

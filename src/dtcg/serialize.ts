import type { Token } from '../Token.js';
import type { DtcgDocument, DtcgToken } from './types.js';
import type { DtcgRefMap } from './values.js';
import { teiknTypeToDtcg, teiknValueToDtcg } from './values.js';

export type SerializeOptions = {
  /** Separator used in token names to reconstruct groups. Default: '.' */
  separator?: string;
  /** When true, reconstruct group hierarchy from token names. Default: true */
  hierarchical?: boolean;
};

const collisionError = (path: string[]): Error =>
  new Error(
    `DTCG serialization: token name collision at "${path.join('.')}" — one token's name is a ` +
      `group prefix of another's (e.g. "a" and "a${'.'}b"). DTCG cannot represent a node that is ` +
      `both a token and a group; rename so no token name is a prefix segment of another, or pick a ` +
      `separator that doesn't split these names.`,
  );

const setNestedValue = (obj: Record<string, any>, path: string[], token: DtcgToken): void => {
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
      current[segment] = {};
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

  current[leaf] = token;
};

const hoistGroupTypes = (obj: Record<string, any>): void => {
  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith('$') || !value || typeof value !== 'object') {
      continue;
    }

    // If this node has $value, it's a token leaf — skip
    if ('$value' in value) {
      continue;
    }

    // Recurse into sub-groups first
    hoistGroupTypes(value);

    // Collect $type from all direct children
    const childTypes = new Set<string>();

    for (const [childKey, childVal] of Object.entries(value)) {
      if (childKey.startsWith('$') || !childVal || typeof childVal !== 'object') {
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
        if (childKey.startsWith('$') || !childVal || typeof childVal !== 'object') {
          continue;
        }

        if ((childVal as any).$type === sharedType) {
          delete (childVal as any).$type;
        }
      }
    }
  }
};

const tokenToDtcg = (
  token: Token,
  refMap: DtcgRefMap,
  toAliasPath: (name: string) => string,
): DtcgToken => {
  const dtcgType = teiknTypeToDtcg(token.type);
  // A linked ref (`ref(name, { link: true })`) serializes as a DTCG alias to
  // the target token, mirroring CSS `var(--…)`. The alias must use the token's
  // *hierarchical* path (`{group.token}`), not the flat emitted name, or it
  // dangles when groups are reconstructed.
  const dtcgValue = token.link
    ? `{${toAliasPath(token.link)}}`
    : teiknValueToDtcg(token.value, token.type, refMap);

  const result: DtcgToken = { $value: dtcgValue as any, $type: dtcgType };

  if (token.usage) {
    result.$description = token.usage;
  }

  if (token.modes && Object.keys(token.modes).length > 0) {
    const modeEntries: Record<string, unknown> = {};

    for (const [mode, val] of Object.entries(token.modes)) {
      modeEntries[mode] = teiknValueToDtcg(val, token.type);
    }

    result.$extensions = { mode: modeEntries };
  }

  return result;
};

const buildRefMap = (tokens: Token[], toAliasPath: (name: string) => string): DtcgRefMap => {
  const map: DtcgRefMap = new Map();

  for (const token of tokens) {
    if (typeof token.value === 'object' && token.value !== null && !map.has(token.value)) {
      // Store the hierarchical alias path so identity/composite refs also emit
      // `{group.token}` rather than the flat emitted name.
      map.set(token.value, toAliasPath(token.name));
    }
  }

  return map;
};

export const serializeDtcg = (tokens: Token[], options?: SerializeOptions): DtcgDocument => {
  const separator = options?.separator ?? '.';
  const hierarchical = options?.hierarchical ?? true;
  // DTCG aliases always use `.` as the path separator. When groups are
  // reconstructed from names, rewrite the emitted name's separator to `.`;
  // otherwise (flat output) the name is the key verbatim.
  const toAliasPath = (name: string): string =>
    hierarchical ? name.split(separator).join('.') : name;
  const refMap = buildRefMap(tokens, toAliasPath);

  const doc: DtcgDocument = {};

  for (const token of tokens) {
    const dtcgToken = tokenToDtcg(token, refMap, toAliasPath);

    if (hierarchical) {
      const segments = token.name.split(separator);
      setNestedValue(doc as Record<string, any>, segments, dtcgToken);
    } else {
      (doc as Record<string, any>)[token.name] = dtcgToken;
    }
  }

  if (hierarchical) {
    hoistGroupTypes(doc as Record<string, any>);
  }

  return doc;
};

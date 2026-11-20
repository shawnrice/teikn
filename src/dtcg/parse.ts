import { tokenKey } from '../token-keys.js';
import type { CompositeValue, ModeValues, Token, TokenValue } from '../Token.js';
import { isFirstClassValue } from '../type-classifiers.js';
import type { DtcgGroupMeta, TokenWithExtensions } from './meta.js';
import { groupMetaKey, sourceKey, teiknExtension } from './meta.js';
import type { DtcgDocument, DtcgGroup, DtcgToken } from './types.js';
import { dtcgTypeToTeikn, dtcgValueToTeikn, mapAliases, namedDtcgType } from './values.js';

export type ParseOptions = {
  /**
   * Separator joining the path segments below the top-level group into the
   * token name (the top-level group becomes the token's `group`). Default: '-'
   */
  separator?: string;
  /** When true, map Dtcg type names to teikn equivalents. Default: true */
  mapTypes?: boolean;
};

const isObject = (node: unknown): node is Record<string, unknown> =>
  node !== null && typeof node === 'object' && !Array.isArray(node);

const isDtcgToken = (node: unknown): node is DtcgToken => isObject(node) && '$value' in node;

const isAlias = (value: unknown): value is string =>
  typeof value === 'string' && value.startsWith('{') && value.endsWith('}');

const typeOf = (node: Record<string, unknown>): string | undefined =>
  typeof node.$type === 'string' ? node.$type : undefined;

/**
 * Parse a DTCG `$extensions.mode` object into Teikn mode values.
 * Skips null / undefined entries (a common idiom for "no override in this
 * mode"). Returns `undefined` when no mode entries survive filtering.
 */
const parseModeExtensions = (
  rawModes: unknown,
  toValue: (value: unknown) => TokenValue | CompositeValue,
): ModeValues | undefined => {
  if (!isObject(rawModes)) {
    return undefined;
  }

  const entries = Object.entries(rawModes)
    .filter(([, modeValue]) => modeValue !== null && modeValue !== undefined)
    .map(([mode, modeValue]) => [mode, toValue(modeValue)] as const);

  // `fromEntries` defines own properties, so a `__proto__` mode stays a mode.
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
};

// What a group hands down to the tokens beneath it.
type Inherited = { type: string | undefined; deprecated: unknown };

// A token found in the document, before its type is settled.
type Entry = {
  path: string[];
  node: DtcgToken;
  declaredType: string | undefined;
  deprecated: boolean;
};

const groupMetaKeys = ['$description', '$extensions', '$deprecated'] as const;

const unsupported = (construct: string, path: string[]): Error =>
  new Error(
    `DTCG parse: ${construct} is not supported (at "${path.join('.')}"). teikn reads \`$ref\` ` +
      `only as a whole-token reference to another token's value ("#/group/token/$value") and ` +
      `does not read \`$extends\`; use a "{group.token}" alias or inline the tokens.`,
  );

const hasRef = (value: unknown): boolean =>
  Array.isArray(value)
    ? value.some(hasRef)
    : isObject(value) && ('$ref' in value || Object.values(value).some(hasRef));

// A JSON-pointer `$ref` to another token's `$value` is that token's alias.
const refToken = (node: Record<string, unknown>, path: string[]): DtcgToken => {
  const { $ref, ...rest } = node;
  const pointer = typeof $ref === 'string' && $ref.startsWith('#/') ? $ref.slice(2).split('/') : [];
  const target = pointer.slice(0, -1).map(s => s.replaceAll('~1', '/').replaceAll('~0', '~'));

  if (target.length === 0 || pointer.at(-1) !== '$value' || target.includes('$value')) {
    throw unsupported(`$ref ${JSON.stringify($ref)}`, path);
  }

  return { ...rest, $value: `{${target.join('.')}}` };
};

const collect = (
  node: DtcgDocument | DtcgGroup,
  path: string[],
  inherited: Inherited,
  entries: Entry[],
  groups: Map<string, DtcgGroupMeta>,
): void => {
  if ('$extends' in node) {
    throw unsupported('$extends', path);
  }

  const meta = Object.fromEntries(
    groupMetaKeys.filter(key => node[key] !== undefined).map(key => [key, node[key]]),
  );

  if (Object.keys(meta).length > 0) {
    groups.set(path.join('.'), meta);
  }

  for (const [key, child] of Object.entries(node)) {
    // `$root` is the group's own token; every other `$` key is group metadata.
    if (key.startsWith('$') && key !== '$root') {
      continue;
    }

    if (!isObject(child)) {
      continue;
    }

    const childPath = [...path, key];
    const token = '$ref' in child ? refToken(child, childPath) : child;
    const handedDown = {
      type: typeOf(child) ?? inherited.type,
      // A group's `$deprecated` covers its tokens unless they say otherwise.
      deprecated: child.$deprecated ?? inherited.deprecated,
    };

    if (isDtcgToken(token)) {
      entries.push({
        path: childPath,
        node: token,
        declaredType: handedDown.type,
        deprecated: Boolean(handedDown.deprecated),
      });
      continue;
    }

    if (key !== '$root') {
      collect(child as DtcgGroup, childPath, handedDown, entries, groups);
    }
  }
};

// A token with no `$type` of its own (or its groups') takes the type of the
// token it references, following alias chains and stopping on a cycle.
const resolveType = (
  entry: Entry,
  byPath: Map<string, Entry>,
  seen: Set<Entry> = new Set(),
): string | undefined => {
  if (entry.declaredType !== undefined || !isAlias(entry.node.$value) || seen.has(entry)) {
    return entry.declaredType;
  }

  const target = byPath.get(entry.node.$value.slice(1, -1));

  return target ? resolveType(target, byPath, seen.add(entry)) : undefined;
};

// The teikn type name `serializeDtcg` recorded for a token, if any.
const recordedType = (extensions: unknown): string | undefined => {
  const own = isObject(extensions) ? extensions[teiknExtension] : undefined;

  return isObject(own) && typeof own.type === 'string' ? own.type : undefined;
};

// Unknown `$extensions` are kept for re-emission; `mode` and (when
// `restoreType`) teikn's own type record are consumed. A `mode` that is not an
// object of mode values is someone else's data, and is kept.
const splitExtensions = (
  raw: unknown,
  restoreType: boolean,
): { mode?: unknown; teiknType?: string; rest?: Record<string, unknown> } => {
  if (!isObject(raw)) {
    return {};
  }

  const { mode, ...unmoded } = raw;
  const rest = isObject(mode) ? unmoded : raw;
  const own = rest[teiknExtension];

  if (!restoreType || !isObject(own) || typeof own.type !== 'string') {
    return { mode, ...(Object.keys(rest).length > 0 ? { rest } : {}) };
  }

  const { type: teiknType, ...ownRest } = own;
  const { [teiknExtension]: _, ...others } = rest;
  const kept = Object.keys(ownRest).length > 0 ? { ...others, [teiknExtension]: ownRest } : others;

  return { mode, teiknType, ...(Object.keys(kept).length > 0 ? { rest: kept } : {}) };
};

const usageOf = ({ $deprecated: deprecated, $description: description }: DtcgToken) => {
  if (!deprecated) {
    return description;
  }

  const depMsg = typeof deprecated === 'string' ? deprecated : 'DEPRECATED';

  return description ? `[${depMsg}] ${description}` : `[${depMsg}]`;
};

export const parseDtcg = (document: DtcgDocument, options?: ParseOptions): Token[] => {
  const separator = options?.separator ?? '-';
  const mapTypes = options?.mapTypes ?? true;
  const entries: Entry[] = [];
  const groups = new Map<string, DtcgGroupMeta>();

  // The document root is itself a group, so a root `$type` is inherited too.
  collect(document, [], { type: typeOf(document), deprecated: undefined }, entries, groups);

  const byPath = new Map(entries.map(entry => [entry.path.join('.'), entry]));

  // The top-level group is the token's `group` and the rest of the path its
  // `name`, so the token key is `group.name` with no further dots.
  const naming = ([head, ...rest]: string[]): Pick<Token, 'name' | 'group'> =>
    rest.length > 0 ? { group: head!, name: rest.join(separator) } : { name: head! };

  // Alias paths (always dotted in DTCG) are rewritten to the key of the token
  // they point at, or they would dangle.
  const localize = (value: unknown): unknown =>
    mapAliases(value, alias => `{${tokenKey(naming(alias.slice(1, -1).split('.')))}}`);

  const tokens = entries.map((entry): Token => {
    const { node, path } = entry;

    if (hasRef(node.$value)) {
      throw unsupported('a `$ref` inside a value', path);
    }

    const dtcgType = resolveType(entry, byPath);
    const recorded = recordedType(node.$extensions);
    const recordedDtcgType = recorded === undefined ? undefined : namedDtcgType(recorded);
    // A token emitted with no `$type` still converts by its recorded teikn type.
    const toValue = (value: unknown): TokenValue | CompositeValue =>
      dtcgValueToTeikn(localize(value) as any, dtcgType ?? recordedDtcgType ?? 'unknown');
    const value = toValue(node.$value);

    // A recorded teikn type name replaces the DTCG type only when serializing
    // gets that DTCG type back, from the value itself or from the name; a plain
    // composite under any other name needs the DTCG type to serialize.
    const selfDescribing =
      dtcgType === undefined ||
      dtcgType === recordedDtcgType ||
      isFirstClassValue(value) ||
      isAlias(value);
    const { mode, teiknType, rest } = splitExtensions(node.$extensions, mapTypes && selfDescribing);

    const mappedType = mapTypes && dtcgType ? dtcgTypeToTeikn(dtcgType) : dtcgType;
    const named = naming(path);
    const token: TokenWithExtensions = {
      ...named,
      value,
      type: teiknType ?? mappedType ?? 'unknown',
      // Where the token sits in the document, so `serializeDtcg` can put it back.
      [sourceKey]: { path, key: tokenKey(named) },
    };

    const modes = parseModeExtensions(mode, toValue);

    if (modes) {
      token.modes = modes;
    }

    const usage = usageOf(node);

    if (usage) {
      token.usage = usage;
    }

    if (entry.deprecated) {
      token.deprecated = true;
    }

    if (rest) {
      token.extensions = rest;
    }

    return token;
  });

  // Group-level metadata has no home on a flat token list; it rides along on
  // the array so `serializeDtcg(parseDtcg(doc))` can put it back.
  if (groups.size > 0) {
    Object.defineProperty(tokens, groupMetaKey, { value: groups });
  }

  return tokens;
};

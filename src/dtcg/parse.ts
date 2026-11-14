import type { CompositeValue, ModeValues, Token, TokenValue } from '../Token.js';
import { isFirstClassValue } from '../type-classifiers.js';
import type { DtcgGroupMeta, TokenWithExtensions } from './meta.js';
import { groupMetaKey, teiknExtension } from './meta.js';
import type { DtcgDocument, DtcgGroup, DtcgToken } from './types.js';
import { dtcgTypeToTeikn, dtcgValueToTeikn, mapAliases } from './values.js';

export type ParseOptions = {
  /** Separator for flattening group paths into token names. Default: '.' */
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

// A token found in the document, before its type is settled.
type Entry = { path: string[]; node: DtcgToken; declaredType: string | undefined };

const groupMetaKeys = ['$description', '$extensions', '$deprecated'] as const;

const collect = (
  node: DtcgDocument | DtcgGroup,
  path: string[],
  inheritedType: string | undefined,
  entries: Entry[],
  groups: Map<string, DtcgGroupMeta>,
): void => {
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

    if (isDtcgToken(child)) {
      entries.push({ path: childPath, node: child, declaredType: typeOf(child) ?? inheritedType });
      continue;
    }

    if (key !== '$root') {
      collect(child as DtcgGroup, childPath, typeOf(child) ?? inheritedType, entries, groups);
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

// Unknown `$extensions` are kept for re-emission; `mode` and (when
// `restoreType`) teikn's own type record are consumed.
const splitExtensions = (
  raw: unknown,
  restoreType: boolean,
): { mode?: unknown; teiknType?: string; rest?: Record<string, unknown> } => {
  if (!isObject(raw)) {
    return {};
  }

  const { mode, ...rest } = raw;
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
  const separator = options?.separator ?? '.';
  const mapTypes = options?.mapTypes ?? true;
  const entries: Entry[] = [];
  const groups = new Map<string, DtcgGroupMeta>();

  // The document root is itself a group, so a root `$type` is inherited too.
  collect(document, [], typeOf(document), entries, groups);

  const byPath = new Map(entries.map(entry => [entry.path.join('.'), entry]));

  // Token names are joined with `separator`, so alias paths (always dotted in
  // DTCG) are rewritten to match or they would dangle.
  const localize = (value: unknown): unknown =>
    separator === '.'
      ? value
      : mapAliases(value, alias => `{${alias.slice(1, -1).split('.').join(separator)}}`);

  const tokens = entries.map((entry): Token => {
    const { node, path } = entry;
    const dtcgType = resolveType(entry, byPath);
    const toValue = (value: unknown): TokenValue | CompositeValue =>
      dtcgValueToTeikn(localize(value) as any, dtcgType ?? 'unknown');
    const value = toValue(node.$value);

    // A recorded teikn type name replaces the DTCG type only when the value
    // still says what it is; a plain composite needs the DTCG type to serialize.
    const selfDescribing = dtcgType === undefined || isFirstClassValue(value) || isAlias(value);
    const { mode, teiknType, rest } = splitExtensions(node.$extensions, mapTypes && selfDescribing);

    const mappedType = mapTypes && dtcgType ? dtcgTypeToTeikn(dtcgType) : dtcgType;
    const token: TokenWithExtensions = {
      name: path.join(separator),
      value,
      type: teiknType ?? mappedType ?? 'unknown',
    };

    const modes = parseModeExtensions(mode, toValue);

    if (modes) {
      token.modes = modes;
    }

    const usage = usageOf(node);

    if (usage) {
      token.usage = usage;
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

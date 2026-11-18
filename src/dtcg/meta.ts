import type { Token } from '../Token.js';

// DTCG data teikn's Token has no field for, carried between `parseDtcg` and
// `serializeDtcg` so a document survives the round trip.

/**
 * Symbol key on a parsed token: its path in the document, and the token key it
 * had when parsed. The path is only trusted while that key is unchanged.
 */
export const sourceKey: unique symbol = Symbol.for('teikn.dtcg.source');

export type DtcgSource = { path: string[]; key: string };

/** A token carrying the `$extensions` teikn does not itself understand. */
export type TokenWithExtensions = Token & {
  extensions?: Record<string, unknown>;
  [sourceKey]?: DtcgSource;
};

/** A group's own `$description` / `$extensions` / `$deprecated`. */
export type DtcgGroupMeta = Record<string, unknown>;

/** Non-enumerable key on a parsed token array: dotted group path → metadata. */
export const groupMetaKey: unique symbol = Symbol.for('teikn.dtcg.groups');

export type WithGroupMeta = { [groupMetaKey]?: Map<string, DtcgGroupMeta> };

/** `$extensions` key under which the original teikn type name is recorded. */
export const teiknExtension = 'teikn';

import type { Token } from '../Token.js';

// DTCG data teikn's Token has no field for, carried between `parseDtcg` and
// `serializeDtcg` so a document survives the round trip.

/** A token carrying the `$extensions` teikn does not itself understand. */
export type TokenWithExtensions = Token & { extensions?: Record<string, unknown> };

/** A group's own `$description` / `$extensions` / `$deprecated`. */
export type DtcgGroupMeta = Record<string, unknown>;

/** Non-enumerable key on a parsed token array: dotted group path → metadata. */
export const groupMetaKey: unique symbol = Symbol.for('teikn.dtcg.groups');

export type WithGroupMeta = { [groupMetaKey]?: Map<string, DtcgGroupMeta> };

/** `$extensions` key under which the original teikn type name is recorded. */
export const teiknExtension = 'teikn';

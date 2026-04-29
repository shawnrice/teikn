import type { Token } from "../Token.js";
import type { DtcgDocument, DtcgToken } from "./types.js";
import type { DtcgRefMap } from "./values.js";
import { teiknTypeToDtcg, teiknValueToDtcg } from "./values.js";

export type SerializeOptions = {
  /** Separator used in token names to reconstruct groups. Default: '.' */
  separator?: string;
  /** When true, reconstruct group hierarchy from token names. Default: true */
  hierarchical?: boolean;
};

const setNestedValue = (obj: Record<string, any>, path: string[], token: DtcgToken): void => {
  let current = obj;
  for (let i = 0; i < path.length - 1; i++) {
    const segment = path[i]!;
    if (!(segment in current) || typeof current[segment] !== "object") {
      current[segment] = {};
    }
    current = current[segment];
  }
  current[path[path.length - 1]!] = token;
};

const hoistGroupTypes = (obj: Record<string, any>): void => {
  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith("$") || !value || typeof value !== "object") {
      continue;
    }

    // If this node has $value, it's a token leaf — skip
    if ("$value" in value) {
      continue;
    }

    // Recurse into sub-groups first
    hoistGroupTypes(value);

    // Collect $type from all direct children
    const childTypes = new Set<string>();
    for (const [childKey, childVal] of Object.entries(value)) {
      if (childKey.startsWith("$") || !childVal || typeof childVal !== "object") {
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
        if (childKey.startsWith("$") || !childVal || typeof childVal !== "object") {
          continue;
        }
        if ((childVal as any).$type === sharedType) {
          delete (childVal as any).$type;
        }
      }
    }
  }
};

const tokenToDtcg = (token: Token, refMap?: DtcgRefMap): DtcgToken => {
  const dtcgType = teiknTypeToDtcg(token.type);
  const dtcgValue = teiknValueToDtcg(token.value, token.type, refMap);

  const result: DtcgToken = {
    $value: dtcgValue as any,
    $type: dtcgType,
  };

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

const buildRefMap = (tokens: Token[]): DtcgRefMap => {
  const map: DtcgRefMap = new Map();
  for (const token of tokens) {
    if (typeof token.value === "object" && token.value !== null && !map.has(token.value)) {
      map.set(token.value, token.name);
    }
  }
  return map;
};

export const serializeDtcg = (tokens: Token[], options?: SerializeOptions): DtcgDocument => {
  const separator = options?.separator ?? ".";
  const hierarchical = options?.hierarchical ?? true;
  const refMap = buildRefMap(tokens);

  const doc: DtcgDocument = {};

  for (const token of tokens) {
    const dtcgToken = tokenToDtcg(token, refMap);

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

import type { Token } from "../Token";
import type { DTCGDocument, DTCGGroup, DTCGToken } from "./types";
import { dtcgTypeToTeikn, dtcgValueToTeikn } from "./values";

export type ParseOptions = {
  /** Separator for flattening group paths into token names. Default: '.' */
  separator?: string;
  /** When true, map DTCG type names to teikn equivalents. Default: true */
  mapTypes?: boolean;
};

const isDTCGToken = (node: unknown): node is DTCGToken =>
  node !== null && typeof node === "object" && "$value" in node;

const isDTCGGroup = (node: unknown): node is DTCGGroup =>
  node !== null && typeof node === "object" && !("$value" in node);

const isAlias = (value: unknown): value is string =>
  typeof value === "string" && value.startsWith("{") && value.endsWith("}");

const walk = (
  node: DTCGDocument | DTCGGroup,
  path: string[],
  inheritedType: string | undefined,
  separator: string,
  mapTypes: boolean,
  tokens: Token[],
): void => {
  for (const [key, child] of Object.entries(node)) {
    if (key.startsWith("$")) {
      continue;
    }

    if (child === undefined || child === null || typeof child !== "object") {
      continue;
    }

    const childPath = [...path, key];

    if (isDTCGToken(child)) {
      const rawType = child.$type ?? inheritedType;
      const dtcgType = rawType ?? "unknown";
      const teiknType = mapTypes ? dtcgTypeToTeikn(dtcgType) : dtcgType;

      const value = isAlias(child.$value)
        ? child.$value
        : dtcgValueToTeikn(child.$value as any, dtcgType);

      const token: Token = {
        name: childPath.join(separator),
        value,
        type: teiknType,
      };

      // Preserve $description as usage, prepending [DEPRECATED] if needed
      const deprecated = child.$deprecated;
      const description = child.$description;

      if (deprecated && description) {
        const depMsg = typeof deprecated === "string" ? deprecated : "DEPRECATED";
        token.usage = `[${depMsg}] ${description}`;
      } else if (deprecated) {
        const depMsg = typeof deprecated === "string" ? deprecated : "DEPRECATED";
        token.usage = `[${depMsg}]`;
      } else if (description) {
        token.usage = description;
      }

      tokens.push(token);
      continue;
    }

    if (isDTCGGroup(child)) {
      const groupType = (child as DTCGGroup).$type ?? inheritedType;
      walk(child as DTCGGroup, childPath, groupType, separator, mapTypes, tokens);
    }
  }
};

export const parseDTCG = (document: DTCGDocument, options?: ParseOptions): Token[] => {
  const separator = options?.separator ?? ".";
  const mapTypes = options?.mapTypes ?? true;
  const tokens: Token[] = [];

  walk(document, [], undefined, separator, mapTypes, tokens);

  return tokens;
};

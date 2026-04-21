import type { CompositeValue, ModeValues, Token, TokenValue } from "../Token";
import type { DtcgDocument, DtcgGroup, DtcgToken } from "./types";
import { dtcgTypeToTeikn, dtcgValueToTeikn } from "./values";

export type ParseOptions = {
  /** Separator for flattening group paths into token names. Default: '.' */
  separator?: string;
  /** When true, map Dtcg type names to teikn equivalents. Default: true */
  mapTypes?: boolean;
};

const isDtcgToken = (node: unknown): node is DtcgToken =>
  node !== null && typeof node === "object" && "$value" in node;

const isDtcgGroup = (node: unknown): node is DtcgGroup =>
  node !== null && typeof node === "object" && !("$value" in node);

const isAlias = (value: unknown): value is string =>
  typeof value === "string" && value.startsWith("{") && value.endsWith("}");

const walk = (
  node: DtcgDocument | DtcgGroup,
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

    if (isDtcgToken(child)) {
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

      const rawModes = child.$extensions?.mode;
      if (rawModes && typeof rawModes === "object") {
        const modes: ModeValues = {};
        for (const [mode, modeValue] of Object.entries(rawModes)) {
          modes[mode] = isAlias(modeValue)
            ? (modeValue as TokenValue)
            : (dtcgValueToTeikn(modeValue as any, dtcgType) as TokenValue | CompositeValue);
        }
        token.modes = modes;
      }

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

    if (isDtcgGroup(child)) {
      const groupType = (child as DtcgGroup).$type ?? inheritedType;
      walk(child as DtcgGroup, childPath, groupType, separator, mapTypes, tokens);
    }
  }
};

export const parseDtcg = (document: DtcgDocument, options?: ParseOptions): Token[] => {
  const separator = options?.separator ?? ".";
  const mapTypes = options?.mapTypes ?? true;
  const tokens: Token[] = [];

  walk(document, [], undefined, separator, mapTypes, tokens);

  return tokens;
};

import type { Token } from "../Token";
import { isFirstClassValue } from "../type-classifiers";
import { Dimension } from "../TokenTypes/Dimension";
import { Plugin } from "./Plugin";

type RemUnitPluginOptions = {
  base?: number;
  targetUnit?: string;
} & Record<string, unknown>;

const PX_RE = /^(-?\d+(?:\.\d+)?)px$/;

const convertValue = (value: unknown, base: number, targetUnit: string): unknown => {
  if (value instanceof Dimension) {
    return value.unit === "px" ? new Dimension(value.value / base, targetUnit as "rem") : value;
  }

  // Preserve other first-class values (Color, CubicBezier, BoxShadow, etc.)
  if (isFirstClassValue(value)) {
    return value;
  }

  if (typeof value === "string") {
    const match = value.match(PX_RE);
    if (match) {
      return `${parseFloat(match[1]!) / base}${targetUnit}`;
    }
    return value;
  }

  // Composite values — recurse into object fields
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    const entries = Object.entries(value as Record<string, unknown>);
    const converted = entries.map(([k, v]) => [k, convertValue(v, base, targetUnit)] as const);
    return Object.fromEntries(converted);
  }

  return value;
};

export class RemUnitPlugin extends Plugin<RemUnitPluginOptions> {
  tokenType: RegExp = /.*/;
  outputType: RegExp = /.*/;

  constructor(options: RemUnitPluginOptions = {}) {
    super(options);
  }

  override transform(token: Token): Token {
    const { base = 16, targetUnit = "rem" } = this.options;

    return {
      ...token,
      value: convertValue(token.value, base, targetUnit) as Token["value"],
    };
  }
}

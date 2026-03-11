import type { Token } from "../Token";
import { Plugin } from "./Plugin";

type DeprecationPluginOptions = {
  tokens: Record<string, string | true>;
} & Record<string, unknown>;

export class DeprecationPlugin extends Plugin<DeprecationPluginOptions> {
  tokenType: RegExp = /.*/;
  outputType: RegExp = /.*/;

  toJSON(token: Token): Token {
    const { tokens } = this.options;
    const entry = tokens[token.name];

    if (entry === undefined) {
      return token;
    }

    const replacement = typeof entry === "string" ? entry : undefined;
    const notice = replacement ? `DEPRECATED: use "${replacement}" instead.` : "DEPRECATED.";

    const usage = token.usage ? `${notice} ${token.usage}` : notice;

    return {
      ...token,
      deprecated: true,
      ...(replacement ? { replacement } : {}),
      usage,
    } as Token & { deprecated: boolean; replacement?: string };
  }
}

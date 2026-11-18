import { tokenKey } from '../token-keys.js';
import type { Token } from '../Token.js';
import type { AuditIssue } from './Plugin.js';
import { Plugin } from './Plugin.js';

export type DeprecationPluginOptions = { tokens: Record<string, string | true> };

// Every name a configured key may use for a token: the name as it stands, the
// authored name (type prefix removed), the qualified `group.name` key and the
// prefixed `type-name`.
const namesFor = (token: Token): string[] => {
  const prefix = `${token.type}-`;
  const authored = token.name.startsWith(prefix) ? token.name.slice(prefix.length) : token.name;

  return [token.name, authored, tokenKey({ ...token, name: authored }), `${prefix}${authored}`];
};

export class DeprecationPlugin extends Plugin<DeprecationPluginOptions> {
  tokenType: RegExp = /.*/;
  outputType: RegExp = /.*/;

  constructor(options: DeprecationPluginOptions) {
    super(options);

    const tokens = options?.tokens;

    if (tokens === null || typeof tokens !== 'object') {
      throw new Error(
        'DeprecationPlugin: `tokens` is required, e.g. ' +
          '{ tokens: { "old-name": "new-name", "legacy": true } }',
      );
    }
  }

  override transform(token: Token): Token {
    const { tokens } = this.options;
    const key = namesFor(token).find(name => Object.hasOwn(tokens, name));

    if (key === undefined) {
      return token;
    }

    const entry = tokens[key];
    const replacement = typeof entry === 'string' ? entry : undefined;
    const notice = replacement ? `DEPRECATED: use "${replacement}" instead.` : 'DEPRECATED.';

    const usage = token.usage ? `${notice} ${token.usage}` : notice;

    return { ...token, deprecated: true, ...(replacement ? { replacement } : {}), usage };
  }

  override audit(tokens: Token[]): AuditIssue[] {
    const known = new Set(tokens.flatMap(namesFor));

    return Object.keys(this.options.tokens)
      .filter(key => !known.has(key))
      .map(key => ({
        severity: 'warning' as const,
        token: key,
        message: `DeprecationPlugin: "${key}" matches no token, so nothing is marked deprecated`,
      }));
  }
}

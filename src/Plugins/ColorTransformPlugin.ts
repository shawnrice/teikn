import type { Token } from '../Token.js';
/* eslint-disable @typescript-eslint/no-useless-constructor */
import { Border } from '../TokenTypes/Border.js';
import { BoxShadow, BoxShadowList } from '../TokenTypes/BoxShadow.js';
import { Color } from '../TokenTypes/Color/index.js';
import type { ColorFormat } from '../TokenTypes/Color/types.js';
import type { GradientStop } from '../TokenTypes/Gradient.js';
import { GradientList, LinearGradient, RadialGradient } from '../TokenTypes/Gradient.js';
import { isRefString } from '../TokenTypes/ref-guard.js';
import type { AuditIssue } from './Plugin.js';
import { Plugin } from './Plugin.js';

type ColorTransformPluginOptions = { type?: ColorFormat } & Record<string, unknown>;

/**
 * Normalizes colors to a single format — including colors nested inside
 * composite tokens (box shadows, borders, gradients), not just standalone
 * `color` tokens. This keeps a shadow's color in the same space as the color
 * tokens rather than falling through to the default serialization.
 */
export class ColorTransformPlugin extends Plugin<ColorTransformPluginOptions> {
  outputType: RegExp = /.*/;

  // Match every token type: colors can live inside shadows, borders, gradients,
  // etc., so we can't gate on `type === 'color'`. `#transformValue` no-ops on
  // any value that carries no color.
  tokenType: RegExp = /.*/;

  override readonly runAfter: string[] = ['AlphaMultiplyPlugin'];

  constructor(options: ColorTransformPluginOptions) {
    super(options);
  }

  // Re-base a single color into the target space. A `{ref}` string (an
  // unresolved per-field reference) passes through untouched.
  #reColor(color: Color | string): Color | string {
    const { type } = this.options;

    if (typeof color === 'string' || !type) {
      return color;
    }

    // Round-trip through the target format so the stored color's native space
    // becomes `type` — the composite serializers then emit it in that space.
    return new Color(color.toString(type));
  }

  #reStop(stop: GradientStop): GradientStop {
    return { ...stop, color: this.#reColor(stop.color) as Color };
  }

  // Return `value` with every color it contains re-based to the target format.
  // Values that carry no color are returned unchanged (referential identity),
  // so the plugin is a no-op on dimensions, durations, etc.
  #transformValue(value: unknown, tokenType: string): unknown {
    const { type } = this.options;

    if (value instanceof Color) {
      // Standalone color token → normalized string (long-standing behavior).
      return value.toString(type);
    }

    if (value instanceof BoxShadow) {
      return value.with({ color: this.#reColor(value.color) });
    }

    if (value instanceof BoxShadowList) {
      return value.map(s => s.with({ color: this.#reColor(s.color) }));
    }

    if (value instanceof Border) {
      return value.with({ color: this.#reColor(value.color) });
    }

    if (value instanceof LinearGradient) {
      return new LinearGradient(
        value.angle,
        value.stops.map(s => this.#reStop(s)),
      );
    }

    if (value instanceof RadialGradient) {
      return new RadialGradient(
        { shape: value.shape, size: value.size, position: value.position },
        value.stops.map(s => this.#reStop(s)),
      );
    }

    if (value instanceof GradientList) {
      return value.map(g => this.#transformValue(g, tokenType) as LinearGradient | RadialGradient);
    }

    // A bare color string only appears on a color-typed token; other string
    // values (dimensions, durations, …) must be left alone.
    if (typeof value === 'string' && !isRefString(value) && tokenType === 'color') {
      return new Color(value).toString(type);
    }

    return value;
  }

  override transform(token: Token): Token {
    // Skip whole-value references — they resolve later.
    if (typeof token.value === 'string' && isRefString(token.value)) {
      return token;
    }

    const value = this.#transformValue(token.value, token.type);

    return value === token.value ? token : { ...token, value: value as Token['value'] };
  }

  // Collect every concrete color a token contains, for alpha-loss auditing.
  #collectColors(value: unknown, tokenType: string): Color[] {
    if (value instanceof Color) {
      return [value];
    }

    if (value instanceof BoxShadow || value instanceof Border) {
      return value.color instanceof Color ? [value.color] : [];
    }

    if (value instanceof BoxShadowList) {
      return value.layers.flatMap(s => (s.color instanceof Color ? [s.color] : []));
    }

    if (value instanceof LinearGradient || value instanceof RadialGradient) {
      return value.stops.flatMap(s => (s.color instanceof Color ? [s.color] : []));
    }

    if (value instanceof GradientList) {
      return value.layers.flatMap(g => this.#collectColors(g, tokenType));
    }

    if (typeof value === 'string' && !isRefString(value) && tokenType === 'color') {
      try {
        return [new Color(value)];
      } catch {
        return [];
      }
    }

    return [];
  }

  override audit(tokens: Token[]): AuditIssue[] {
    const { type } = this.options;

    if (type !== 'hex' && type !== 'hex3') {
      return [];
    }

    return tokens.flatMap(t => {
      // Skip unresolved whole-value references
      if (typeof t.value === 'string' && isRefString(t.value)) {
        return [];
      }

      return this.#collectColors(t.value, t.type)
        .filter(color => color.alpha < 1)
        .map(color => ({
          severity: 'warning' as const,
          token: t.name,
          message: `Color has alpha ${color.alpha} but output format "${type}" discards the alpha channel`,
        }));
    });
  }
}

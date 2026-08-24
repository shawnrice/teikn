/**
 * Public API-surface lock (Form B) — compile-time type invariants.
 *
 * This file contains no runtime code. It is type-checked by `tsc` (via
 * `bun run build`, which CI runs before every test job), so a violated
 * invariant fails the build with a pinpoint error naming the exact broken
 * relationship — something the Form A snapshot (see `api-surface.test.ts`)
 * can show as a diff but cannot explain as intent.
 *
 * The two forms are complementary, not redundant:
 *   - Form A (snapshot) is complete but dumb: it flags *every* surface change,
 *     including ones you meant, so it is a review gate.
 *   - Form B (this file) is partial but intentional: it pins only the handful
 *     of load-bearing relationships and documents *why* each must hold.
 *
 * It is excluded from both published packages (npm `files` negation and
 * jsr.json `exclude`); it exists purely as a build-time guard.
 */

import type {
  Border,
  BoxShadow,
  BoxShadowList,
  Color,
  CubicBezier,
  Dimension,
  Duration,
  GradientList,
  LinearGradient,
  RadialGradient,
  Transition,
  TransitionList,
  Typography,
} from '../index.js';
import type {
  AlphaMultiplyPlugin,
  ClampPlugin,
  ColorBlindnessPlugin,
  ColorTransformPlugin,
  ContrastValidatorPlugin,
  CssVars,
  DeprecationPlugin,
  Dtcg,
  Generator,
  Html,
  JavaScript,
  Json,
  MinFontSizePlugin,
  NameConventionPlugin,
  PalettePlugin,
  PerceptualDistancePlugin,
  Plugin,
  PrefixTypePlugin,
  ReducedMotionPlugin,
  RemUnitPlugin,
  Scss,
  ScssQuoteValuePlugin,
  ScssVars,
  Storybook,
  StripTypePrefixPlugin,
  TouchTargetPlugin,
  TypeScript,
  TypeScriptDeclarations,
} from '../index.js';
import type { TokenValue } from './Token.js';

// `[A] extends [B]` (tuple-wrapped to defeat distribution over unions) is true
// iff A is assignable to B. `Expect<T extends true>` turns a false result into
// a compile error at the assertion site.
type Expect<T extends true> = T;
type Extends<A, B> = [A] extends [B] ? true : false;

/**
 * Every first-class value type stays a member of the `TokenValue` union.
 * Per the project's own notes, this union is the single most-often-touched
 * type when adding value types, so a member silently dropping out — which
 * would break any consumer that constructs that value into a token — is the
 * highest-value thing to pin.
 */
export type _FirstClassValuesAreTokenValues = [
  Expect<Extends<Color, TokenValue>>,
  Expect<Extends<CubicBezier, TokenValue>>,
  Expect<Extends<BoxShadow, TokenValue>>,
  Expect<Extends<BoxShadowList, TokenValue>>,
  Expect<Extends<LinearGradient, TokenValue>>,
  Expect<Extends<RadialGradient, TokenValue>>,
  Expect<Extends<GradientList, TokenValue>>,
  Expect<Extends<Transition, TokenValue>>,
  Expect<Extends<TransitionList, TokenValue>>,
  Expect<Extends<Typography, TokenValue>>,
  Expect<Extends<Border, TokenValue>>,
  Expect<Extends<Dimension, TokenValue>>,
  Expect<Extends<Duration, TokenValue>>,
  // `string` and `number` primitives are also members — pin them so a refactor
  // to a branded/opaque token value would be a conscious, reviewed change.
  Expect<Extends<string, TokenValue>>,
  Expect<Extends<number, TokenValue>>,
];

/**
 * Every shipped generator remains a `Generator` subtype. Consumers write
 * `generators: () => [new CssVars(...), ...]` against the `Generator` contract;
 * a subclass drifting off that base is a breaking change to that call site.
 */
export type _GeneratorsConformToBase = [
  Expect<Extends<CssVars, Generator>>,
  Expect<Extends<ScssVars, Generator>>,
  Expect<Extends<Scss, Generator>>,
  Expect<Extends<Html, Generator>>,
  Expect<Extends<Json, Generator>>,
  Expect<Extends<Dtcg, Generator>>,
  Expect<Extends<JavaScript, Generator>>,
  Expect<Extends<TypeScript, Generator>>,
  Expect<Extends<TypeScriptDeclarations, Generator>>,
  Expect<Extends<Storybook, Generator>>,
];

/**
 * Every shipped plugin remains a `Plugin` subtype, for the same reason:
 * `plugins: [new RemUnitPlugin(), ...]` is typed against the `Plugin` base.
 */
export type _PluginsConformToBase = [
  Expect<Extends<AlphaMultiplyPlugin, Plugin>>,
  Expect<Extends<ClampPlugin, Plugin>>,
  Expect<Extends<ColorBlindnessPlugin, Plugin>>,
  Expect<Extends<ColorTransformPlugin, Plugin>>,
  Expect<Extends<ContrastValidatorPlugin, Plugin>>,
  Expect<Extends<DeprecationPlugin, Plugin>>,
  Expect<Extends<MinFontSizePlugin, Plugin>>,
  Expect<Extends<NameConventionPlugin, Plugin>>,
  Expect<Extends<PalettePlugin, Plugin>>,
  Expect<Extends<PerceptualDistancePlugin, Plugin>>,
  Expect<Extends<PrefixTypePlugin, Plugin>>,
  Expect<Extends<ReducedMotionPlugin, Plugin>>,
  Expect<Extends<RemUnitPlugin, Plugin>>,
  Expect<Extends<ScssQuoteValuePlugin, Plugin>>,
  Expect<Extends<StripTypePrefixPlugin, Plugin>>,
  Expect<Extends<TouchTargetPlugin, Plugin>>,
];

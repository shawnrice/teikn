# Changelog

## 2.0.0-alpha.9

### Fixed

- **`modeSelectors` no longer produces invalid CSS for at-rules** (#29). Passing
  a `@media` or `@supports` query as a `modeSelectors` value now automatically
  wraps variables in `:root` inside the at-rule block. Previously, variables were
  placed directly inside the at-rule with no selector, producing CSS that browsers
  silently ignored.

### Added

- **`ModeSelector` object form** for `modeSelectors` values. Use
  `{ atRule: "@media ...", selector: ".app" }` to control both the at-rule wrapper
  and the inner selector. The `selector` field defaults to `:root`.

## 2.0.0-alpha.8

### Breaking Changes

- **`Plugin.toJSON()` renamed to `Plugin.transform()`.** Custom plugins must
  rename their `toJSON` method to `transform`. The `toJSON` name was misleading —
  it transforms tokens, not JSON.
- **`Generator.convertColorToString()` renamed to `stringifyValues()`.** Custom
  generators overriding this method must update the name.
- **`Dimension.value` and `Duration.value` renamed to `.amount`.** These getters
  collided with the token config `{ value: ... }` shape, causing silent
  destructuring bugs. Use `.amount` to access the numeric value.
- **`isFirstClassValue()` now uses a brand check instead of `instanceof`.**
  Custom first-class value types must add `readonly __teikn_fcv__: true = true`
  to opt in. The old `instanceof` chain is removed.
- **`Token.value` type tightened from `any` to `TokenValue | CompositeValue`.**
  Code passing arbitrary values may need type assertions.
- **`Plugin.transform()` is no longer abstract.** The base class provides a
  default no-op. Audit-only plugins no longer need to override it.
- **`PerceptualDistancePlugin` now auto-groups by `token.group`** instead of
  comparing all color tokens globally. Pass `groups` option for manual control.
- **`TouchTargetPlugin` no longer checks `"icon"` type by default.** Opt in
  with `types: ["size", "touch-target", "icon"]`.

### Added

- **`Color.saturate(amount)`** — increase saturation by percentage points.
- **`Color.desaturate(amount)`** — decrease saturation.
- **`Color.grayscale()`** — fully desaturate.
- **`Color.isLight()`** / **`Color.isDark()`** — luminance-based light/dark check.
- **`TokenNames` compound type** in TypeScript generator output. Provides
  per-group token name unions (`TokenNames['Color']`, `TokenNames['Spacing']`)
  and a combined `TokenNames['All']` for type-safe CSS variable helpers.
- **Builder input validation** — `dp()`, `dim()`, `dur()` reject `NaN`/`Infinity`.
  `dim()`/`dur()` validate units against known CSS unit sets. `group()`/`scale()`
  validate input types. `composite()` detects nested objects. `ref()` rejects
  empty strings.
- **`Teikn` constructor detects duplicate generator filenames** and throws
  with a helpful message.
- **Automatic validation** — `transform()` and `generateToStrings()` run
  `validate()` by default. Opt out with `validate: false`.
- **`ColorTransformPlugin` audit** warns when hex output drops alpha channel.

### Changed

- **`onColor()` uses WCAG contrast ratio** instead of a luminance > 0.5
  threshold. Picks whichever of dark/light text gives better contrast,
  fixing incorrect text color for mid-lightness backgrounds (teal, yellow,
  orange).
- **`ColorTransformPlugin` skips ref() strings** instead of crashing with
  `"Invalid color constructor arguments"`.

### Fixed

- **`isTokenInputObject` unwrapping Dimension/Duration** — `Dimension` has a
  `.value` getter, so `'value' in dimension` was `true`, causing builders to
  destructure `dp(16)` into the bare number `1` instead of preserving the
  Dimension object. Root cause of unitless spacing output.
- **CssVars mode values bypassing `cssValue()`** — mode values used template
  literal `${val}` directly instead of the serializer function.
- **`RemUnitPlugin` replacing Color/CubicBezier/BoxShadow with `{}`** in
  composite tokens — `Object.values()` on private-field objects returns `[]`.
- **DTCG generator bypassing plugin topological sort and mode plugin
  application** — `prepareTokens` override was a simplified copy that skipped
  `sortPlugins()` and `applyPlugin()`.
- **`applyPlugin` building synthetic mode tokens from original** instead of
  transformed token — plugins that rename tokens now see consistent names
  in mode processing.
- **`maybeQuote` not escaping** single quotes, backslashes, and newlines in
  generated JS/MJS output.
- **TypeScript generator emitting `object`** for composite token types —
  now produces proper inline shape types.
- **DTCG `describe()` using "Dtcg"** instead of "DTCG" for the acronym.
- **Double validation** in `transform()` — removed redundant `validate()` call.
- **README API mismatches** — `lighten`/`darken` use 0–1 range (not 0–100),
  `rotate` → `rotateHue`, `contrast` → `contrastRatio`.
- **CLI help text recommending deprecated `PrefixTypePlugin`.**

### Internal

- Value serializers (`cssValue`, `maybeQuote`, `quoteKey`) extracted to shared
  `value-serializers.ts` — was duplicated across 5 generator files.
- `commentHeader()` and `buildModeMap()` extracted to Generator base class —
  was duplicated across 5 generators.
- Shared `testOpts` fixture replaces 40+ inline `{ dateFn, version }` objects.
- Removed stale files: `__mocks__/fs.ts`, `.husky/`, `prettier.config.js`.
- npm package trimmed from 293 → 148 files (excluded sourcemaps and tsbuildinfo).
- Test coverage: 1137 → 1513 tests (+376) across 14 new test files covering
  generators, builders, plugins, CLI, integration, round-trip, misuse patterns,
  error experience, and output validation.

## 2.0.0-alpha.7

### Breaking Changes

- **`transform()` now returns `TransformResult` instead of `void`.** Callers
  that awaited `transform()` for side effects only are unaffected, but the
  method no longer logs to stdout/stderr. Use the returned `auditIssues`,
  `files`, and `errors` arrays for programmatic access.
- **`CSSVars({ groups: true })` now throws** instead of silently ignoring
  the option. CSS has no function syntax — use Scss or ScssVars instead.
- **`PrefixTypePlugin` in Teikn plugins now throws** instead of being
  silently filtered. Remove it from your plugins array; type prefixing is
  built in.
- **Public API names were normalized for casing consistency.** Acronym-heavy
  names were converted to mixed-case forms across generators, plugins, and
  Dtcg helpers. Examples: `CSSVars` → `CssVars`, `ESModule` → `EsModule`,
  `HTML` → `Html`, `DTCGGenerator` → `DtcgGenerator`,
  `SCSSQuoteValuePlugin` → `ScssQuoteValuePlugin`, `parseDTCG` → `parseDtcg`,
  and `serializeDTCG` → `serializeDtcg`. Related exports, registry keys,
  file names, and `DTCG*` helper types/constants were updated to match.
- **Storybook generator supports JSX output.** Pass `ext: "stories.jsx"` for
  JavaScript projects. Default remains `stories.tsx`.

### Added

- **`teikn/storybook` subpath export** — ships themed React components
  (`Swatch`, `SpacingBar`, `ShadowBox`, `ModeTable`, etc.) for Storybook
  token visualization. Components use CSS custom properties and respond
  to Storybook dark mode automatically.
- **`TransformResult` type** — returned by `transform()`, contains
  `auditIssues`, `files` (paths + sizes), and `errors`.

### Changed

- **Storybook generator refactored** — generated stories import from
  `teikn/storybook` instead of inlining ~400 lines of component code.
  Generated files are ~60% smaller. All stories wrapped in `TokenStory`
  for theme support.
- **Breakpoint bar visualization** — uses DOM measurement for accurate
  widths across all CSS units. Dynamic values (max, calc, clamp) show a
  live "(Npx at current viewport)" annotation that updates on resize.

### Fixed

- **Empty gradient stops** now throw instead of producing invalid CSS.
- **Watch mode file handle leak** — watcher is now closed on SIGINT.
- **Storybook string injection** — `storyTitle` and `importPath` are
  properly escaped with `JSON.stringify`.
- **CLI `extractTokens`** gives a clear error when the module doesn't
  export tokens, instead of a cryptic TypeError downstream.
- **Empty string values** trigger a validation warning.

## 2.0.0-alpha.5

### Breaking Changes

- **`NameConventionPlugin` now transforms mode keys.** Mode keys like
  `high-contrast` are renamed to match the convention (e.g. `highContrast`
  with camelCase). Previously only the token name was transformed.

### Added

- **Plugin ordering via `runAfter` declarations.** Plugins can declare
  dependencies on other plugins by class name. The pipeline topologically
  sorts plugins before applying them, so input order no longer matters.
  Official plugins declare their ordering constraints automatically.
- **Injectable `version` on generators.** Pass `version: "test"` to any
  generator to stabilize snapshot output across version bumps.

### Fixed

- **Mode values now go through the full plugin pipeline.** Previously,
  plugins like `ColorTransformPlugin` and `RemUnitPlugin` only transformed
  `token.value`, silently skipping mode values. All plugins now transform
  mode values identically to base values.
- **First-class values in modes are now stringified.** `convertColorToString()`
  now processes mode values, preventing object instances from reaching
  generator output.
- **Circular references in modes are now detected by `validate()`.** A token
  with `modes: { dark: '{self}' }` previously passed validation but threw
  at resolve time. Now caught during validation.
- **`applyPlugin` respects plugin-renamed mode keys.** Plugins that rename
  mode keys (like `NameConventionPlugin`) no longer have their changes
  overwritten by the pipeline.

## 2.0.0-alpha.4

### Breaking Changes

- **Token names are now prefixed with their type by default.** Previously, a token
  defined as `group('color', { primary: '#0066cc' })` produced the name `primary`.
  It now produces `color-primary` (formatted by each generator's name convention:
  `colorPrimary` in JS/JSON, `color-primary` in CSS/SCSS, etc.).

  This prevents silent collisions when multiple groups share keys like `sm`, `md`, `lg`.

  To opt out, add `StripTypePrefixPlugin` to your plugins:

  ```ts
  new Teikn({
    plugins: [new Teikn.plugins.StripTypePrefixPlugin()],
  });
  ```

- **`PrefixTypePlugin` is no longer needed when using `Teikn`.** Type prefixing is
  now built into the core pipeline. If you had `PrefixTypePlugin` in your plugins
  array, remove it — it will be filtered out with a warning to prevent double-prefixed
  names. `PrefixTypePlugin` still exists for direct generator usage outside of `Teikn`.

### Added

- `StripTypePrefixPlugin` — opt-out plugin that removes the type prefix from token
  names for users whose names are already globally unique.

### Fixed

- `deriveShortName` no longer false-positives on names that happen to extend the
  type string (e.g. a token named `colors` with type `color` was incorrectly
  shortened to `s`).

## 2.0.0-alpha.3

### Fixed

- Fix JSR publishing: add explicit exports map and publish.include/exclude to `jsr.json`.
- Fix GitHub Packages publishing: rewrite package name to `@shawnrice/teikn` in CI.
- Add `import type` for generator option types to satisfy JSR's slow-type checker.

## 2.0.0-alpha.2

### Fixed

- Fix publish workflow: add OIDC permissions, JSR provenance, and dist tag derivation.
- Add `src/version.ts` so generated output embeds the correct version string.

## 2.0.0-alpha.1

This is a ground-up rewrite of teikn for v2.

### Breaking Changes

- **`Color.mix()`** now uses premultiplied alpha interpolation per the CSS `color-mix`
  spec. Alpha channels are no longer rounded to 0 or 1.
- **`BoxShadow`**: replaced individual `setX()` methods with `.with({ offsetX, ... })`
  immutable update API.
- **`Color.toString()`** respects the requested format literally — `'rgb'` always
  returns `rgb()`, `'rgba'` always returns `rgba()`, regardless of opacity.
- **All default exports removed.** Use named exports throughout.

### Added

- **Generators**: SCSS map, SCSS variables, CSS custom properties, ES module,
  CommonJS, TypeScript declarations, JSON, DTCG, HTML documentation, Storybook.
- **Token builders**: `group()`, `scale()`, `composite()`, `theme()`, `onColors()`,
  `ref()` for cross-references, `dp()` for density-independent pixels.
- **First-class value types**: `Color`, `BoxShadow`, `CubicBezier`, `LinearGradient`,
  `RadialGradient`, `Transition`.
- **Color science**: CIEDE2000 `deltaE()`, color blindness simulation (protanopia,
  deuteranopia, tritanopia + anomaly variants), recursive octree spatial index.
- **12 plugins**:
  - Transform: `ColorTransformPlugin`, `RemUnitPlugin`, `AlphaMultiplyPlugin`,
    `NameConventionPlugin`, `DeprecationPlugin`, `PrefixTypePlugin`,
    `SCSSQuoteValuePlugin`.
  - Expand: `PalettePlugin`, `ReducedMotionPlugin`, `ClampPlugin`,
    `ColorBlindnessPlugin`.
  - Audit: `ContrastValidatorPlugin`, `MinFontSizePlugin`, `TouchTargetPlugin`,
    `PerceptualDistancePlugin`.
- **`Teikn` orchestrator**: `expand()` and `audit()` run automatically in the
  pipeline. Themes are applied via `theme()` builder and `themes` option.
- **`validate()`** function for token validation.
- **CLI** for generating tokens from the command line.
- **Tooling**: replaced eslint + prettier with oxlint (153 rules) + oxfmt.
  CI tests on Bun + Node 20/22/24. Vitest aliases `bun:test` for Node compat.

### Fixed

- `BoxShadow` duplicate identifier (method + getter conflict on `offsetX`).
- Hex regex now rejects 5/7-char strings, accepts 4/8-char (CSS4 hex alpha).
- HSL hue now wraps (`361 → 1`, `-90 → 270`) instead of rejecting out-of-range.
- XYZ validator epsilon widened to handle float drift from conversions.

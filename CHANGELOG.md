# Changelog

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

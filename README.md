# Teikn

A design token library for defining, validating, and generating design tokens across multiple output
formats. Supports first-class color spaces (RGB, HSL, LAB, LCH, XYZ), rich value types, theme modes,
token references, and the W3C Design Token Community Group (DTCG) standard.

## Install

```bash
npm install teikn
```

## Quick Start

```typescript
import { Teikn, Color, group, scale, dp, tokens, validate } from 'teikn';

const base = new Color('#0066cc');

const colors = group('color', {
  primary: [base, 'Primary brand color'],
  primaryLight: base.tint(0.3),
  primaryDark: base.shade(0.3),
});

const spacing = scale('spacing', {
  sm: dp(8), // 0.5rem
  md: dp(16), // 1rem
  lg: dp(24), // 1.5rem
});

const allTokens = tokens(colors, spacing);
validate(allTokens);

await new Teikn({
  outDir: './dist',
  generators: [new Teikn.generators.CssVars(), new Teikn.generators.TypeScript()],
}).transform(allTokens);
```

For a step-by-step walkthrough that builds a production token set — colors, spacing, typography,
themes, and TypeScript output — see [Getting Started](docs/getting-started.md).

## How it works

Define your tokens once, then generate them into as many output formats as you need — CSS, SCSS,
JSON, TypeScript, DTCG, and more — from a single source of truth. That source can carry its own
variants: **themes** (override layers like dark, dense, or a brand skin) and per-token **modes**,
which generators emit as scoped overrides (`[data-theme="dark"]`, `@media`, DTCG `$extensions`) in
whatever form each format expects.

A token's value can be a plain string (`'#0066cc'`, `'16px'`, `'0.2s ease'`) or one of Teikn's
**typed value objects** (`Color`, `Dimension`, `Duration`, `BoxShadow`, `Transition`, …). Reach for
a value object when you want to lighten a color, convert px to rem, or scale a duration with a
method call. **Builder functions** (`group`, `scale`, `composite`, `theme`) assemble values into a
`Token[]`. **Generators** turn that array into output files, and **plugins** transform, expand, or
audit the tokens along the way.

When one token's value is composed from another (a `Transition` built from a shared `Duration`),
reference-aware generators emit `var()` / `$variable` / `{alias}` automatically — no special syntax.
See [Concepts](docs/concepts.md) for the full model.

## Generators

Each generator targets a different output format:

| Generator                  | Extension        | Description                                                                                   |
| -------------------------- | ---------------- | --------------------------------------------------------------------------------------------- |
| **CssVars**                | `.css`           | CSS custom properties (`--token-name`) with optional media query mode support                 |
| **Scss**                   | `.scss`          | SCSS map with `get-token()` function and optional typed group accessors                       |
| **ScssVars**               | `.scss`          | SCSS variables (`$token-name`) with mode support                                              |
| **Json**                   | `.json`          | Plain JSON object                                                                             |
| **JavaScript**             | `.mjs` / `.cjs`  | ES module (default) or CommonJS via `module: 'cjs'`; optional typed group accessors           |
| **TypeScript**             | `.mjs` + `.d.ts` | Meta generator: emits both runtime (`JavaScript`) and declarations (`TypeScriptDeclarations`) |
| **TypeScriptDeclarations** | `.d.ts`          | TypeScript type declarations only (use directly to skip runtime emission)                     |
| **Html**                   | `.html`          | Visual documentation page with color swatches, font samples, spacing bars, and more           |
| **Storybook**              | `.stories.tsx`   | React Storybook stories with interactive visual components                                    |
| **Dtcg**                   | `.tokens.json`   | W3C Design Token Community Group format for tool interoperability                             |

Options and the reference-emission rules are in the [Generators reference](docs/api/generators.md).

## Plugins

Plugins transform, expand, and validate tokens before generation.

**Transform** (run in the pipeline):

| Plugin                    | Description                                                                                           |
| ------------------------- | ----------------------------------------------------------------------------------------------------- |
| **ColorTransformPlugin**  | Normalizes colors to a specific format (`hex`, `rgb`, `hsl`, `lab`, `lch`, `oklab`, `oklch`, `xyz`)   |
| **StripTypePrefixPlugin** | Opt out of the built-in type prefixing (keep `primary` instead of `color-primary`)                    |
| **ScssQuoteValuePlugin**  | Wraps font and font-family values in `unquote()` for SCSS compatibility                               |
| **RemUnitPlugin**         | Converts px Dimensions to rem (or a configurable unit)                                                |
| **AlphaMultiplyPlugin**   | Flattens semi-transparent colors against a background via alpha blending                              |
| **NameConventionPlugin**  | Transforms token names to `camelCase`, `kebab-case`, `snake_case`, `PascalCase`, or `SCREAMING_SNAKE` |
| **DeprecationPlugin**     | Marks tokens as deprecated with optional replacement references                                       |

**Expand** (generate new tokens via `expand(tokens)`):

| Plugin                   | Description                                                                              |
| ------------------------ | ---------------------------------------------------------------------------------------- |
| **PalettePlugin**        | Generates shade scales (50–950) from base color tokens, optionally in a perceptual space |
| **ReducedMotionPlugin**  | Generates `prefers-reduced-motion` companion tokens: zeroed durations, linear easing     |
| **ClampPlugin**          | Generates CSS `clamp()` fluid values from min/max token pairs                            |
| **ColorBlindnessPlugin** | Generates companion tokens simulating color vision deficiencies                          |

**Audit** (report accessibility issues via `audit(tokens)`, without modifying tokens):

| Plugin                       | Description                                                                              |
| ---------------------------- | ---------------------------------------------------------------------------------------- |
| **ContrastValidatorPlugin**  | Validates WCAG contrast ratios (AA: 4.5:1, AAA: 7:1) between foreground/background pairs |
| **MinFontSizePlugin**        | Warns when font-size tokens fall below an accessibility minimum (default 12px)           |
| **TouchTargetPlugin**        | Warns when size/icon tokens are below minimum touch target size (default 44px)           |
| **PerceptualDistancePlugin** | Warns when colors meant to be told apart are too perceptually similar (CIEDE2000 ΔE)     |

Usage, options, and the ΔE threshold table are in the [Plugins reference](docs/api/plugins.md).

## CLI

```bash
teikn                              # run with a config file (teikn.config.ts / .teiknrc.js)
teikn path/to/tokens.ts --outDir=./dist --generators="Scss,Json,CssVars"
teikn --watch                      # rebuild on change
teikn validate path/to/tokens.ts   # validate without generating
```

Full flags in the [CLI guide](docs/guides/cli.md).

## Documentation

- [Getting Started](docs/getting-started.md) — install and generate your first token set
- [Concepts](docs/concepts.md) — how values, tokens, groups, generators, and plugins fit together
- **Reference**
  - [Builders](docs/api/builders.md) — `group`, `scale`, `composite`, `theme`, `ref`, helpers
  - [Value Types](docs/api/values.md) — `Color`, `Dimension`, `Duration`, `BoxShadow`, `Transition`,
    gradients
  - [Generators](docs/api/generators.md) — output formats and options
  - [Plugins](docs/api/plugins.md) — transform, expand, and audit plugins
- **Guides**
  - [DTCG interoperability](docs/guides/dtcg.md) — import/export the W3C token format
  - [Validation](docs/guides/validation.md) — catch issues before generation
  - [CLI](docs/guides/cli.md) — command-line usage
- **Recipes**
  - [Composing tokens](docs/recipes/composition.md) — references, elevation scales, stagger patterns

## License

MIT © Shawn Patrick Rice. See [LICENSE](LICENSE).

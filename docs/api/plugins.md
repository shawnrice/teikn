# Plugins

Plugins transform, expand, and validate tokens before generation. All plugins implement
`toJSON(token)` for per-token transforms. Some also provide `expand(tokens)` for generating new
tokens or `audit(tokens)` for validation.

Transform plugins run inside the pipeline (pass them to `Teikn`). Expand and audit plugins are
called explicitly on your token array before (or alongside) generation.

## Transform Plugins

Pass transform plugins to `Teikn`; they run in a defined order (topologically sorted by their
`runAfter` declarations) between stringification and generation.

```typescript
const writer = new Teikn({
  plugins: [
    new Teikn.plugins.ColorTransformPlugin({ type: 'hsl' }),
    new Teikn.plugins.ScssQuoteValuePlugin(),
    new Teikn.plugins.RemUnitPlugin({ base: 16, targetUnit: 'rem' }),
    new Teikn.plugins.AlphaMultiplyPlugin({ background: '#ffffff' }),
    // List DeprecationPlugin before NameConventionPlugin so it sees un-renamed names.
    new Teikn.plugins.DeprecationPlugin({ tokens: { oldPrimary: 'primary', legacySpacing: true } }),
    new Teikn.plugins.NameConventionPlugin({ convention: 'camelCase' }),
  ],
});
```

`DeprecationPlugin` keys match a token by its authored name (`oldPrimary`), its qualified key
(`color.oldPrimary`) or its prefixed output name (`color-oldPrimary`). A bare name marks every token
with that name; qualify it to target one group. A key that matches no token is reported as an
`warning` audit issue (see `Teikn.transform()`'s `auditIssues`, or call `writer.audit(tokens)`).

`ColorTransformPlugin` leaves the keywords `currentColor`, `inherit`, `initial`, `unset`, `revert`
and `revert-layer` untouched. Any other color string that cannot be parsed fails generation with an
error naming the token.

| Plugin                    | Description                                                                                                                                               |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ColorTransformPlugin**  | Normalizes colors to a specific format (`hex`, `rgb`, `hsl`, `lab`, `lch`, `oklab`, `oklch`, `xyz`), including colors nested in shadows/borders/gradients |
| **StripTypePrefixPlugin** | Opt out of the built-in type prefixing (e.g., keep `primary` as `primary` instead of `color-primary`)                                                     |
| **ScssQuoteValuePlugin**  | Wraps font and font-family values in `unquote()` for SCSS compatibility                                                                                   |
| **RemUnitPlugin**         | Converts px Dimensions to rem (or configurable unit). Options: `base` (default 16), `targetUnit` (default `'rem'`)                                        |
| **AlphaMultiplyPlugin**   | Flattens semi-transparent colors against a background via alpha blending. Options: `background` (default `'#ffffff'`)                                     |
| **NameConventionPlugin**  | Transforms token names to `camelCase`, `kebab-case`, `snake_case`, `PascalCase`, or `SCREAMING_SNAKE`                                                     |
| **DeprecationPlugin**     | Marks tokens as deprecated with optional replacement references                                                                                           |

Plugins see tokens _after_ stringification, so they work with string values. The reference map is
built _before_ plugins run, so references are unaffected by name transformations.

## Expand Plugins

These generate additional tokens from existing ones. Call `expand(tokens)` before passing tokens to
`Teikn.transform()`.

```typescript
const palette = new PalettePlugin({ steps: [100, 300, 500, 700, 900] });
// Keep the ramp in a perceptual space. `space` defaults to 'auto' (the base
// color's authored space — an oklch base yields an oklch ramp; a hex/rgb base
// stays RGB). Pass a space to force it: 'oklch' | 'lch' | 'hsl' | 'rgb' | …
const perceptualPalette = new PalettePlugin({ space: 'oklch' });
const motion = new ReducedMotionPlugin({ prefix: 'reduced-' });
// `min`/`max` take a bare name ('100'), a qualified key ('fontSize.100') or the
// prefixed output name ('fontSize-100'). `output` is a bare name: it inherits
// the min token's type, so this emits `--font-size-fluid`.
const clamp = new ClampPlugin({
  pairs: [{ min: 'fontSize.100', max: 'fontSize.700', output: 'fluid' }],
});
const cbSim = new ColorBlindnessPlugin({ types: ['protanopia', 'deuteranopia'] });

let allTokens = tokens(colors, spacing, fontSizes);
allTokens = palette.expand(allTokens);
allTokens = motion.expand(allTokens);
allTokens = clamp.expand(allTokens);
allTokens = cbSim.expand(allTokens);
```

| Plugin                   | Description                                                                                                                                                                                                                                                                          |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **PalettePlugin**        | Generates shade scales (50–950) from base color tokens. In a lightness space (`oklch`/`lch`/`hsl`) it holds hue+chroma and interpolates lightness; otherwise it tints/shades in RGB. Options: `space` (default `'auto'` — the base's authored space), `steps`, `lightEnd`, `darkEnd` |
| **ReducedMotionPlugin**  | Generates `prefers-reduced-motion` companion tokens: zeroed durations, linear easing. Options: `prefix`                                                                                                                                                                              |
| **ClampPlugin**          | Generates CSS `clamp()` fluid values from min/max token pairs. Options: `viewportMin`, `viewportMax` (must be greater than `viewportMin`), `pairs`                                                                                                                                   |
| **ColorBlindnessPlugin** | Generates companion tokens simulating color vision deficiencies (protanopia, deuteranopia, tritanopia)                                                                                                                                                                               |

`ClampPlugin` throws when a pair's `min` or `max` matches no token, matches more than one (a bare
name shared by two groups — qualify it), is not a length, or uses a unit that cannot be converted to
rem (`em`, `%`, viewport units). A `min`/`max` token that references another token is followed to
its value.

## Audit Plugins (Accessibility)

These validate tokens and report issues without modifying them. Call `audit(tokens)` to get a list
of issues. `Teikn.transform()` and `writer.audit(tokens)` resolve references first, so an alias
token is audited by the value it points at; calling a plugin's `audit()` yourself checks the tokens
exactly as given, so pass `Teikn.resolveReferences(tokens)` if they contain references.

```typescript
const contrastCheck = new ContrastValidatorPlugin({
  pairs: [
    { foreground: 'textPrimary', background: 'surface', level: 'AA' },
    // Qualify a name shared by several groups; a bare name prefers `color` tokens.
    { foreground: 'color.onPrimary', background: 'color.primary', level: 'AAA' },
  ],
});

const fontCheck = new MinFontSizePlugin({ minPx: 12 });
const touchCheck = new TouchTargetPlugin({ minPx: 44 });
// Declare which colors are meant to be told apart; the plugin measures within
// each set (ramps, aliases, and unrelated families are never compared).
const distanceCheck = new PerceptualDistancePlugin({
  sets: [['danger', 'success', 'warning', 'accent']],
  minDeltaE: 5.0,
});

const resolved = Teikn.resolveReferences(allTokens);
const issues = [
  ...contrastCheck.audit(resolved),
  ...fontCheck.audit(resolved),
  ...touchCheck.audit(resolved),
  ...distanceCheck.audit(resolved),
];

issues.forEach(i => console.warn(`[${i.severity}] ${i.token}: ${i.message}`));
```

| Plugin                       | Description                                                                                                                                                                                                                                                                                                                                                          |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ContrastValidatorPlugin**  | Validates WCAG contrast ratios (AA: 4.5:1, AAA: 7:1) between foreground/background color pairs. A pair name that is missing or matches several color tokens is reported as a warning                                                                                                                                                                                 |
| **MinFontSizePlugin**        | Warns when font-size tokens (type `fontSize`, `font-size` or `font_size`) fall below an accessibility minimum (default 12px)                                                                                                                                                                                                                                         |
| **TouchTargetPlugin**        | Warns when size/icon tokens are below minimum touch target size (default 44px per WCAG/Apple HIG)                                                                                                                                                                                                                                                                    |
| **PerceptualDistancePlugin** | Warns when colors in a declared peer `set` are too perceptually similar, using [CIEDE2000](https://en.wikipedia.org/wiki/Color_difference#CIEDE2000) (Delta E 2000). Takes intent explicitly (like `ContrastValidator`'s `pairs`): pass `sets` to gate, `all: true` to compare every pair, or `report: true` for a non-gating ΔE report. Default threshold: ΔE < 5.0 |

### Delta E 2000 Thresholds

| ΔE₀₀      | Meaning                                        |
| --------- | ---------------------------------------------- |
| < 1.0     | Imperceptible — no human can tell them apart   |
| 1.0 – 2.0 | Barely perceptible — trained eye only          |
| 2.0 – 3.5 | Noticeable — commercial acceptability limit    |
| 3.5 – 5.0 | Clearly different — but confusable from memory |
| > 5.0     | Safely distinct in any context                 |

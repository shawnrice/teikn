# Teikn

A design token library for defining, validating, and generating design tokens across multiple output formats. Supports first-class color spaces (RGB, HSL, LAB, LCH, XYZ), rich value types, theme modes, token references, and the W3C Design Token Community Group (DTCG) standard.

## Install

```bash
npm install teikn
```

## Quick Start

```typescript
import { Teikn, Color, group, scale, dp, tokens, validate } from 'teikn';

const colors = group('color', {
  primary: [new Color('steelblue'), 'Primary branding color'],
  secondary: new Color('crimson'),
  error: 'red',
});

const spacing = scale('spacing', {
  sm: dp(8),
  md: [dp(16), 'Standard spacing'],
  lg: dp(24),
});

const allTokens = tokens(colors, spacing);

// Validate
const result = validate(allTokens);
if (!result.valid) {
  result.issues.forEach(i => console.error(`[${i.severity}] ${i.token}: ${i.message}`));
  process.exit(1);
}

// Generate
const writer = new Teikn({
  outDir: './dist',
  generators: [
    new Teikn.generators.CssVars(),
    new Teikn.generators.Json(),
    new Teikn.generators.TypeScript(),
  ],
});

writer.transform(allTokens);
```

## Defining Tokens

Tokens are created with builder functions that produce `Token[]` arrays. Each token has a `name`, `value`, `type`, and optional `usage` description.

### `group(type, entries)`

Create tokens sharing a type. Values can be bare values, `[value, usage]` tuples, or references.

```typescript
import { group, ref } from 'teikn';

const colors = group('color', {
  primary: [new Color('steelblue'), 'Primary branding color'],
  secondary: new Color('crimson'),
  link: ref('primary'),       // references another token by name
  textPrimary: 'rgba(0, 0, 0, .95)',
});
```

### `scale(type, values, options?)`

Create a set of scaled tokens from an array or object.

```typescript
import { scale, dp } from 'teikn';

// From an array with custom names
const fontSizes = scale('font-size', [10, 12, 14, 16, 20, 24, 36], {
  names: ['100', '200', '300', '400', '500', '600', '700'],
  transform: n => dp(n),
});

// From an object
const spacing = scale('spacing', {
  xs: dp(4),
  sm: dp(8),
  md: [dp(16), 'Standard spacing'],
  lg: dp(24),
});
```

### `composite(type, entries)`

Create tokens with structured values (typography, borders, etc.).

```typescript
import { composite, dp } from 'teikn';

const typography = composite('typography', {
  body: {
    fontFamily: '"Roboto Condensed", sans-serif',
    fontSize: dp(16),
    fontWeight: 400,
    lineHeight: 1.5,
    letterSpacing: 'normal',
  },
  heading: {
    fontFamily: 'Arial, Helvetica, sans-serif',
    fontSize: dp(36),
    fontWeight: 700,
    lineHeight: 1.2,
  },
});
```

### `tokens(...groups)`

Merge multiple token arrays into one.

```typescript
import { tokens } from 'teikn';

export const allTokens = tokens(colors, fontSizes, spacing, typography, shadows);
```

### `theme(name, source, overrides)`

Create a named theme layer — a partial override of a token set. Themes are applied as a stack: base tokens → layer A → layer B. Each layer only overrides the tokens it cares about, and keys are validated against the source.

```typescript
import { theme, group } from 'teikn';

const colors = group('color', {
  surface: '#ffffff',
  background: '#fafafa',
  onSurface: 'rgba(0, 0, 0, .87)',
  primary: '#0066cc',
});

// Override only what changes — primary stays the same
const dark = theme('dark', colors, {
  surface: '#1a1a1a',
  background: '#121212',
  onSurface: 'rgba(255, 255, 255, .87)',
});

// Derive from another theme — inherits dark's overrides + adds more
const colorblindDark = theme('colorblind-dark', dark, {
  primary: '#0077bb',
});
```

Multiple theme dimensions (color scheme, density, brand) are independent layers:

```typescript
const spacing = group('spacing', { gap: '8px', padding: '16px' });

const dense = theme('dense', spacing, { gap: '4px', padding: '8px' });

// Pass all layers to Teikn — generators output them as scoped overrides
const writer = new Teikn({
  themes: [dark, dense, colorblindDark],
  generators: [new CssVars()],
});
await writer.transform(tokens(colors, spacing));
```

### `ref(tokenName, usage?)`

Reference another token by name. References are resolved before generation.

```typescript
const colors = group('color', {
  primary: new Color('steelblue'),
  link: ref('primary'),                       // resolved to steelblue
  linkHover: ref('primary', 'Hover state'),   // with usage description
});
```

### `onColors(type, colors)`

Auto-generate contrasting text colors (black or white) for a set of background colors.

```typescript
import { onColors } from 'teikn';

const contrast = onColors('color', {
  primary: new Color('steelblue'),
  secondary: new Color('crimson'),
  error: 'red',
});
// Produces: onPrimary: white, onSecondary: white, onError: white
```

### Helpers

```typescript
import { dp, dim, dur } from 'teikn';

dp(16)            // Dimension: 1rem (16px base)
dim(2, 'em')      // Dimension: 2em
dur(200, 'ms')    // Duration: 200ms
```

## Value Types

Teikn provides first-class value types that carry semantic meaning and enable rich output generation.

### Color

Supports RGB, HSL, LAB, LCH, and XYZ color spaces with lazy conversion and caching.

```typescript
import { Color } from 'teikn';

// Construction
const c1 = new Color('steelblue');
const c2 = new Color('#ff6b35');
const c3 = new Color('rgb(70, 130, 180)');
const c4 = new Color('hsl(207, 44%, 49%)');
const c5 = new Color('lab(54.3, -5.6, -32.1)');
const c6 = new Color(70, 130, 180);         // r, g, b
const c7 = new Color(70, 130, 180, 0.5);    // r, g, b, a

// Color operations
c1.lighten(20)       // lighten by 20%
c1.darken(10)        // darken by 10%
c1.saturate(15)      // increase saturation
c1.desaturate(15)    // decrease saturation
c1.rotate(180)       // rotate hue
c1.complement()      // complementary color

// Mixing (premultiplied alpha, CSS color-mix spec)
c1.mix(c2, 0.5)     // 50/50 mix
c1.tint(0.3)         // mix with white
c1.shade(0.3)        // mix with black

// Analysis
c1.luminance()       // relative luminance (0-1)
c1.contrast(c2)      // WCAG contrast ratio
c1.deltaE(c2)        // CIEDE2000 perceptual difference (0 = identical, ~100 = max)
c1.isLight()         // luminance > 0.5
c1.isDark()

// Color blindness simulation
c1.simulateColorBlindness('protanopia')    // red-blind
c1.simulateColorBlindness('deuteranopia')  // green-blind
c1.simulateColorBlindness('tritanopia')    // blue-blind
c1.simulateColorBlindness('protanomaly')   // partial red-blind
c1.simulateColorBlindness('deuteranomaly') // partial green-blind
c1.simulateColorBlindness('tritanomaly')   // partial blue-blind

// Output formats
c1.toString('hex')   // '#4682b4'
c1.toString('rgb')   // 'rgb(70, 130, 180)'
c1.toString('rgba')  // 'rgba(70, 130, 180, 1)'
c1.toString('hsl')   // 'hsl(207, 44%, 49%)'
c1.toString('lab')   // 'lab(54.3, -5.6, -32.1)'
c1.toString('lch')   // 'lch(54.3, 32.6, 260)'
c1.toString('xkcd')  // nearest XKCD color name

// Access raw values
c1.asRGB()           // [70, 130, 180]
c1.asHSL()           // [207, 44, 49]
c1.asLAB()           // [54.3, -5.6, -32.1]
c1.asLCH()           // [54.3, 32.6, 260]
c1.asXYZ()           // [0.189, 0.200, 0.448]
```

Hex strings support 3, 4, 6, and 8-character formats (CSS4 hex-with-alpha):

```typescript
new Color('#F00')        // #FF0000
new Color('#F00A')       // #FF0000 with alpha ~0.67
new Color('#FF0000AA')   // #FF0000 with alpha ~0.67
```

### BoxShadow

```typescript
import { BoxShadow } from 'teikn';

const shadow = new BoxShadow(0, 2, 8, 0, 'rgba(0,0,0,.12)');
const inset = new BoxShadow(0, 1, 4, 0, 'rgba(0,0,0,.1)', true);

// From CSS string
const parsed = new BoxShadow('0 4px 16px rgba(0,0,0,.15)');

// Immutable updates
shadow.with({ blur: 16, spread: 4 })
shadow.with({ color: new Color('steelblue'), inset: true })

// Properties
shadow.offsetX    // 0
shadow.offsetY    // 2
shadow.blur       // 8
shadow.spread     // 0
shadow.color      // Color
shadow.inset      // false

shadow.scale(2)   // scale all numeric values
shadow.toString() // '0 2px 8px rgba(0,0,0,0.12)'
```

### CubicBezier

```typescript
import { CubicBezier } from 'teikn';

const ease = new CubicBezier(0.25, 0.1, 0.25, 1);

// From CSS string
const parsed = new CubicBezier('cubic-bezier(0.4, 0, 0.2, 1)');

// Built-in presets
CubicBezier.ease
CubicBezier.easeIn
CubicBezier.easeOut
CubicBezier.easeInOut
CubicBezier.linear
CubicBezier.standard    // Material Design standard
CubicBezier.accelerate  // Material Design accelerate
CubicBezier.decelerate  // Material Design decelerate

ease.evaluate(0.5)   // y-value at x=0.5
ease.toString()      // 'cubic-bezier(0.25, 0.1, 0.25, 1)'
```

### Dimension

```typescript
import { Dimension, dp, dim } from 'teikn';

const d = new Dimension(16, 'px');
const fromString = new Dimension('2.5rem');

// Helpers
dp(16)           // 1rem (converts px to rem, 16px base)
dim(2, 'em')     // 2em

// Conversion
d.to('rem')      // Dimension(1, 'rem')
d.toRem()        // Dimension(1, 'rem')
d.toPx()         // Dimension(16, 'px')

// Arithmetic
d.scale(2)       // 32px
d.add(new Dimension(8, 'px'))    // 24px
d.subtract(new Dimension(4, 'px'))
d.negate()       // -16px

// Properties
d.value          // 16
d.unit           // 'px'
d.isAbsolute     // true
d.isRelative     // false
```

Supported units: `px`, `rem`, `em`, `ch`, `ex`, `vw`, `vh`, `vmin`, `vmax`, `cm`, `mm`, `in`, `pt`, `pc`, `%`, `cqi`, `cqb`, `svw`, `svh`, `lvw`, `lvh`, `dvw`, `dvh`, `fr`, `lh`, `rlh`

### Duration

```typescript
import { Duration, dur } from 'teikn';

const d = new Duration(200, 'ms');
const fromString = new Duration('0.3s');

dur(200, 'ms')   // helper

d.to('s')        // Duration(0.2, 's')
d.toMs()         // Duration(200, 'ms')
d.toS()          // Duration(0.2, 's')
d.ms()           // 200 (raw number)
d.toString()     // '200ms'
```

### Gradient

```typescript
import { LinearGradient, RadialGradient } from 'teikn';

const linear = new LinearGradient(135, [
  [new Color('steelblue'), '0%'],
  [new Color('crimson'), '100%'],
]);

const radial = new RadialGradient({ shape: 'circle' }, [
  ['#0077b6', '0%'],
  ['#00b4d8', '50%'],
  ['#90e0ef', '100%'],
]);

linear.toString() // 'linear-gradient(135deg, #4682b4 0%, #dc143c 100%)'
```

### Transition

```typescript
import { Transition, CubicBezier } from 'teikn';

// From values
const t = new Transition('0.4s', CubicBezier.standard, '0s', 'opacity');

// Built-in presets
Transition.fade    // opacity transition
Transition.slide   // transform transition
Transition.quick   // fast all-properties transition

t.toString()       // 'opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1) 0s'
```

## Generators

Generators produce output files from your tokens. Each targets a different format.

```typescript
const writer = new Teikn({
  outDir: './dist',
  generators: [
    new Teikn.generators.CssVars(),
    new Teikn.generators.Scss({ groups: true }),
    new Teikn.generators.ScssVars(),
    new Teikn.generators.Json(),
    new Teikn.generators.EsModule({ ext: 'js', groups: true }),
    new Teikn.generators.JavaScript({ groups: true }),
    new Teikn.generators.TypeScript({ groups: true }),
    new Teikn.generators.Html(),
    new Teikn.generators.Storybook(),
    new Teikn.generators.DtcgGenerator(),
  ],
});
```

| Generator | Extension | Description |
|-----------|-----------|-------------|
| **CssVars** | `.css` | CSS custom properties (`--token-name`) with optional media query mode support |
| **Scss** | `.scss` | SCSS map with `get-token()` function and optional typed group accessors |
| **ScssVars** | `.scss` | SCSS variables (`$token-name`) with mode support |
| **Json** | `.json` | Plain JSON object |
| **EsModule** | `.mjs` | ES module export with optional typed group accessors |
| **JavaScript** | `.js` | CommonJS module with optional typed group accessors |
| **TypeScript** | `.d.ts` | TypeScript type declarations |
| **Html** | `.html` | Visual documentation page with color swatches, font samples, spacing bars, and more |
| **Storybook** | `.stories.tsx` | React Storybook stories with interactive visual components |
| **DtcgGenerator** | `.tokens.json` | W3C Design Token Community Group format for tool interoperability |

### Common Options

All generators accept:

| Option | Default | Description |
|--------|---------|-------------|
| `ext` | varies | Output file extension |
| `filename` | `'tokens'` | Output filename (without extension) |
| `groups` | `false` | Generate typed group accessor functions |

### Generator-Specific Options

**CssVars**: `useMediaQuery?: boolean`, `modeSelectors?: Record<string, string>`
**Storybook**: `importPath?: string`, `storyTitle?: string`
**DtcgGenerator**: `hierarchical?: boolean` (default: true), `separator?: string` (default: '.')

## Plugins

Plugins transform, expand, and validate tokens before generation. All plugins implement `toJSON(token)` for per-token transforms. Some also provide `expand(tokens)` for generating new tokens or `audit(tokens)` for validation.

### Transform Plugins

```typescript
const writer = new Teikn({
  plugins: [
    new Teikn.plugins.ColorTransformPlugin({ type: 'hsl' }),
    new Teikn.plugins.PrefixTypePlugin(),
    new Teikn.plugins.ScssQuoteValuePlugin(),
    new Teikn.plugins.RemUnitPlugin({ base: 16, targetUnit: 'rem' }),
    new Teikn.plugins.AlphaMultiplyPlugin({ background: '#ffffff' }),
    new Teikn.plugins.NameConventionPlugin({ convention: 'camelCase' }),
    new Teikn.plugins.DeprecationPlugin({
      tokens: { oldPrimary: 'primary', legacySpacing: true },
    }),
  ],
});
```

| Plugin | Description |
|--------|-------------|
| **ColorTransformPlugin** | Normalizes color tokens to a specific format (`hex`, `rgb`, `hsl`, `lab`, `lch`, `xyz`) |
| **PrefixTypePlugin** | Prefixes token type to token name (e.g., `primary` becomes `colorPrimary`) |
| **ScssQuoteValuePlugin** | Wraps font and font-family values in `unquote()` for SCSS compatibility |
| **RemUnitPlugin** | Converts px Dimensions to rem (or configurable unit). Options: `base` (default 16), `targetUnit` (default `'rem'`) |
| **AlphaMultiplyPlugin** | Flattens semi-transparent colors against a background via alpha blending. Options: `background` (default `'#ffffff'`) |
| **NameConventionPlugin** | Transforms token names to `camelCase`, `kebab-case`, `snake_case`, `PascalCase`, or `SCREAMING_SNAKE` |
| **DeprecationPlugin** | Marks tokens as deprecated with optional replacement references |

### Expand Plugins

These generate additional tokens from existing ones. Call `expand(tokens)` before passing tokens to `Teikn.transform()`.

```typescript
const palette = new PalettePlugin({ steps: [100, 300, 500, 700, 900] });
const motion = new ReducedMotionPlugin({ prefix: 'reduced-' });
const clamp = new ClampPlugin({
  pairs: [{ min: 'fontSize-100', max: 'fontSize-700', output: 'fontSize-fluid' }],
});
const cbSim = new ColorBlindnessPlugin({ types: ['protanopia', 'deuteranopia'] });

let allTokens = tokens(colors, spacing, fontSizes);
allTokens = palette.expand(allTokens);
allTokens = motion.expand(allTokens);
allTokens = clamp.expand(allTokens);
allTokens = cbSim.expand(allTokens);
```

| Plugin | Description |
|--------|-------------|
| **PalettePlugin** | Generates shade scales (50–950) from base color tokens using tint/shade. Options: `steps`, `lightEnd`, `darkEnd` |
| **ReducedMotionPlugin** | Generates `prefers-reduced-motion` companion tokens: zeroed durations, linear easing. Options: `prefix` |
| **ClampPlugin** | Generates CSS `clamp()` fluid values from min/max token pairs. Options: `viewportMin`, `viewportMax`, `pairs` |
| **ColorBlindnessPlugin** | Generates companion tokens simulating color vision deficiencies (protanopia, deuteranopia, tritanopia) |

### Audit Plugins (Accessibility)

These validate tokens and report issues without modifying them. Call `audit(tokens)` to get a list of issues.

```typescript
const contrastCheck = new ContrastValidatorPlugin({
  pairs: [
    { foreground: 'textPrimary', background: 'surface', level: 'AA' },
    { foreground: 'onPrimary', background: 'primary', level: 'AAA' },
  ],
});

const fontCheck = new MinFontSizePlugin({ minPx: 12 });
const touchCheck = new TouchTargetPlugin({ minPx: 44 });
const distanceCheck = new PerceptualDistancePlugin({ minDeltaE: 5.0 });

const issues = [
  ...contrastCheck.audit(allTokens),
  ...fontCheck.audit(allTokens),
  ...touchCheck.audit(allTokens),
  ...distanceCheck.audit(allTokens),
];

issues.forEach(i => console.warn(`[${i.severity}] ${i.token}: ${i.message}`));
```

| Plugin | Description |
|--------|-------------|
| **ContrastValidatorPlugin** | Validates WCAG contrast ratios (AA: 4.5:1, AAA: 7:1) between foreground/background color pairs |
| **MinFontSizePlugin** | Warns when font-size tokens fall below an accessibility minimum (default 12px) |
| **TouchTargetPlugin** | Warns when size/icon tokens are below minimum touch target size (default 44px per WCAG/Apple HIG) |
| **PerceptualDistancePlugin** | Warns when color tokens are too perceptually similar using [CIEDE2000](https://en.wikipedia.org/wiki/Color_difference#CIEDE2000) (Delta E 2000). Default threshold: ΔE < 5.0 |

#### Delta E 2000 Thresholds

| ΔE₀₀ | Meaning |
|---|---|
| < 1.0 | Imperceptible — no human can tell them apart |
| 1.0 – 2.0 | Barely perceptible — trained eye only |
| 2.0 – 3.5 | Noticeable — commercial acceptability limit |
| 3.5 – 5.0 | Clearly different — but confusable from memory |
| > 5.0 | Safely distinct in any context |

## Dtcg Interoperability

Import and export tokens in the W3C Design Token Community Group format for use with tools like Style Dictionary and Tokens Studio.

```typescript
import { parseDtcg, serializeDtcg } from 'teikn';

// Import from Dtcg
const tokens = parseDtcg(dtcgDocument, { separator: '.' });

// Export to Dtcg
const dtcg = serializeDtcg(tokens, { hierarchical: true });
```

## Validation

Validate tokens before generation to catch common issues.

```typescript
import { validate } from 'teikn';

const result = validate(allTokens);
// result.valid: boolean
// result.issues: { severity: 'error' | 'warning', token: string, message: string }[]
```

Checks for: missing required fields, duplicate names, unparseable colors, invalid references, circular references, and composite token shape validation.

## CLI

```bash
# Run with a config file (teikn.config.ts, teikn.config.js, or .teiknrc.js)
teikn

# Run with a token file and flags
teikn path/to/tokens.ts \
  --outDir=./dist \
  --generators="Scss,Json,EsModule,CssVars,Html" \
  --plugins="ColorTransformPlugin,PrefixTypePlugin,ScssQuoteValuePlugin"

# Watch mode
teikn --watch

# Dry run (show output without writing)
teikn --dry-run

# Validate tokens
teikn validate path/to/tokens.ts

# List available generators or plugins
teikn list generators
teikn list plugins
```

## Color Space References

- [W3C CSS Color 4 spec conversions](https://github.com/w3c/csswg-drafts/blob/main/css-color-4/conversions.js)
- [Bruce Lindbloom's color math reference](http://www.brucelindbloom.com/index.html?Math.html)
- [CSS Color spec on LAB colors](https://drafts.csswg.org/css-color/#lab-colors)
- [sRGB / LAB / LCH conversion article](https://mina86.com/2021/srgb-lab-lchab-conversions/)
- [CIE XYZ color space](https://www.image-engineering.de/library/technotes/958-how-to-convert-between-srgb-and-ciexyz)
- [Illuminant D65](https://en.wikipedia.org/wiki/Illuminant_D65)

## License

MIT

Copyright 2019 Shawn Patrick Rice

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

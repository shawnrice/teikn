# Quick Start

A guided tutorial that builds a real design token set from scratch, showing how to derive tokens
rather than hand-pick values.

## 1. Start with a base palette

Define your raw colors once, then derive everything else from them. Using `Color` objects rather
than hex strings gives you access to color manipulation, contrast checking, and color space
conversions.

```typescript
import { Color, group } from 'teikn';

// The base palette: every other color is derived from these
const base = {
  blue: new Color('#0066cc'),
  orange: new Color('#e85d04'),
  green: new Color('#2d6a4f'),
  red: new Color('#d00000'),
  neutral: new Color('#1a1a2e'),
};
```

## 2. Derive color tokens

Instead of hand-picking hex values for every shade, derive them from the base palette. `.shade()`
darkens by mixing with black, `.tint()` lightens by mixing with white, and `.mix()` blends two
colors together.

```typescript
const colors = group('color', {
  primary: [base.blue, 'Primary brand color'],
  primaryLight: base.blue.tint(0.3),
  primaryDark: base.blue.shade(0.3),

  secondary: base.orange,
  secondaryLight: base.orange.tint(0.3),

  success: base.green,
  error: base.red,

  surface: new Color('#ffffff'),
  background: new Color('#fafafa'),
});
```

### Opaque text vs. transparent overlays

Use `.mix()` for text colors and `.setAlpha()` for overlays and borders. Text rendered with
transparency looks washed out on colored backgrounds because the background bleeds through. Mixing
against white or black produces a solid color that looks consistent everywhere.

```typescript
const textColors = group('color', {
  // .mix() produces opaque colors -- good for text
  textPrimary: base.neutral.mix(new Color('#ffffff'), 0.05),
  textSecondary: base.neutral.mix(new Color('#ffffff'), 0.4),

  // .setAlpha() produces transparent colors -- good for overlays
  overlay: base.neutral.setAlpha(0.5),
  border: base.neutral.setAlpha(0.12),
});
```

> **Tip:** If you need to flatten transparent colors to opaque for a specific background (e.g. for
> email where transparency is unreliable), wire in `AlphaMultiplyPlugin` to alpha-composite against
> a background color at generation time.

## 3. Generate accessible text colors

`onColors()` picks the best contrasting text color (dark or light) for each background
automatically. Pair it with your color group so every branded surface gets a readable text color
from day one.

```typescript
import { onColors } from 'teikn';

const contrast = onColors('color', {
  primary: base.blue,
  secondary: base.orange,
  success: base.green,
  error: base.red,
});
// Produces: onPrimary, onSecondary, onSuccess, onError
```

## 4. Spacing and sizing

Use `dp()` to define spacing in design pixels that serialize as `rem`. This keeps your tokens
resolution-independent while letting designers think in familiar pixel values.

> **Note:** `dp` stands for *density-independent pixel*, a term from Android's display system.
> In web terms, it converts a pixel value from your design spec to its `rem` equivalent
> (assuming a 16px base). `dp(16)` returns `1rem`, `dp(8)` returns `0.5rem`.

```typescript
import { scale, dp, dim } from 'teikn';

const spacing = scale('spacing', {
  xs: dp(4),    // 0.25rem
  sm: dp(8),    // 0.5rem
  md: dp(16),   // 1rem
  lg: dp(24),   // 1.5rem
  xl: dp(32),   // 2rem
  xxl: dp(48),  // 3rem
});
```

`dim()` creates a `Dimension` with any unit:

```typescript
const borderWidths = group('border-width', {
  thin: dim(1, 'px'),
  thick: dim(2, 'px'),
});
```

## 5. Typography

Use `composite()` to group related properties into a single token. Font sizes use `dp()` so they
serialize as `rem`.

```typescript
import { composite } from 'teikn';

const typography = composite('typography', {
  body: {
    fontFamily: '"Inter", sans-serif',
    fontSize: dp(16),
    fontWeight: 400,
    lineHeight: 1.5,
    letterSpacing: 'normal',
  },
  heading: {
    fontFamily: '"Inter", sans-serif',
    fontSize: dp(32),
    fontWeight: 700,
    lineHeight: 1.2,
    letterSpacing: '-0.02em',
  },
  caption: {
    fontFamily: '"Inter", sans-serif',
    fontSize: dp(12),
    fontWeight: 400,
    lineHeight: 1.4,
    letterSpacing: '0.03em',
  },
});
```

## 6. Shadows

Define shadows with `BoxShadow` objects for type-safe manipulation. Derive shadow variants from a
single shadow color to keep them consistent.

```typescript
import { BoxShadow } from 'teikn';

const shadowColor = new Color(0, 0, 0, 0.12);

const shadows = group('shadow', {
  sm: new BoxShadow(0, 1, 2, 0, shadowColor),
  md: new BoxShadow(0, 2, 8, 0, shadowColor),
  lg: new BoxShadow(0, 4, 16, 0, shadowColor),
  xl: new BoxShadow(0, 8, 32, 0, shadowColor),
});
```

`BoxShadow` supports immutable updates with `.with()` and numeric scaling with `.scale()`:

```typescript
const insetShadow = shadows[1].value.with({ inset: true });
const doubleShadow = shadows[1].value.scale(2);
```

## 7. Motion

Use `CubicBezier` presets for easing curves and `Transition` presets for common transitions.

```typescript
import { CubicBezier, Transition } from 'teikn';

const easings = group('timing', {
  standard: CubicBezier.standard,     // Material Design standard
  accelerate: CubicBezier.accelerate,
  decelerate: CubicBezier.decelerate,
  easeInOut: CubicBezier.easeInOut,   // CSS ease-in-out
});

const transitions = group('transition', {
  fade: [Transition.fade, 'Fade in/out elements'],
  slide: [Transition.slide, 'Slide animations'],
  quick: Transition.quick,
  custom: new Transition('0.4s', CubicBezier.standard, '0s', 'opacity'),
});
```

Transitions support immutable updates:

```typescript
const slowFade = Transition.fade.setDuration('0.5s');
const colorTransition = Transition.fade.setProperty('color');
```

## 8. Compose and validate

Merge all token groups with `tokens()` and run `validate()` to catch issues before generation.

```typescript
import { tokens, validate } from 'teikn';

const allTokens = tokens(
  colors,
  textColors,
  contrast,
  spacing,
  typography,
  shadows,
  easings,
  transitions,
);

const result = validate(allTokens);
if (!result.valid) {
  for (const issue of result.issues) {
    console.error(`[${issue.severity}] ${issue.token}: ${issue.message}`);
  }
  process.exit(1);
}
```

Validation checks for: missing required fields, duplicate names, unparseable colors, unresolved
references, circular references, and composite token shape.

## 9. Accessibility audits

Wire in audit plugins from day one. `ContrastValidatorPlugin` checks WCAG contrast ratios between
foreground/background pairs. `MinFontSizePlugin` flags font sizes below an accessibility minimum.

```typescript
import { Teikn } from 'teikn';

const contrastCheck = new Teikn.plugins.ContrastValidatorPlugin({
  pairs: [
    { foreground: 'textPrimary', background: 'surface', level: 'AA' },
    { foreground: 'onPrimary', background: 'primary', level: 'AA' },
    { foreground: 'onError', background: 'error', level: 'AA' },
  ],
});

const fontCheck = new Teikn.plugins.MinFontSizePlugin({ minPx: 12 });

const writer = new Teikn({
  plugins: [contrastCheck, fontCheck],
  generators: [new Teikn.generators.CssVars()],
});

const { auditIssues } = await writer.transform(allTokens);
for (const issue of auditIssues) {
  console.warn(`[${issue.severity}] ${issue.token}: ${issue.message}`);
}
```

## 10. Themes with derivation

Define theme overrides by deriving from the base surface color, not by hand-picking hex values.
This way your dark theme stays in harmony with your palette.

```typescript
import { theme } from 'teikn';

const darkSurface = new Color('#1a1a1a');

const dark = theme('dark', colors, {
  surface: darkSurface,
  background: darkSurface.shade(0.3),
  primaryLight: base.blue.tint(0.5),     // brighter in dark mode
  primaryDark: base.blue.shade(0.15),    // less contrast needed
});
```

`theme()` accepts any `Token[]`, so you can pass the merged output of `tokens()` to theme across
groups in a single call:

```typescript
const allTokens = tokens(colors, textColors, spacing);

// Override tokens from any group — no need for separate theme() calls per group
const dark = theme('dark', allTokens, {
  surface: darkSurface,
  background: darkSurface.shade(0.3),
  textPrimary: new Color('#e0e0e0'),
});
```

Themes stack: derive a high-contrast variant from your dark theme, only overriding what changes.

```typescript
const highContrastDark = theme('high-contrast-dark', dark, {
  textPrimary: new Color('#ffffff'),
});
```

## 11. Generate output

Bring it all together with the `Teikn` class. Generators produce output files; plugins transform
tokens before generation.

```typescript
import { Teikn } from 'teikn';

const writer = new Teikn({
  outDir: './dist/tokens',
  themes: [dark, highContrastDark],
  generators: [
    new Teikn.generators.CssVars(),
    new Teikn.generators.Scss({ groups: true }),
    new Teikn.generators.TypeScript({ groups: true }),
    new Teikn.generators.Json(),
    new Teikn.generators.Html(),
  ],
  plugins: [
    contrastCheck,
    fontCheck,
    new Teikn.plugins.NameConventionPlugin({ convention: 'kebab-case' }),
  ],
});

await writer.transform(allTokens);
```

This generates CSS custom properties, SCSS maps, TypeScript declarations, a JSON file, and an HTML
documentation page -- all from the same token definitions.

## Complete example

See [`example/raw-tokens.ts`](../example/raw-tokens.ts) for a full working token set that
exercises every value type and builder function.

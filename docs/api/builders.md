# Builder Functions

Functions that create tokens from values. All builders return `Token[]`.

## group()

The primary way to create tokens. Accepts values in three forms: raw, tuple (with description),
or object (with description and modes).

```typescript
import { group, Color } from 'teikn';

const colors = group('color', {
  // Raw value
  primary: new Color('#0066cc'),

  // Tuple: [value, description]
  secondary: [new Color('#cc6600'), 'Secondary brand color'],

  // Object: { value, usage?, modes? }
  surface: {
    value: new Color('#ffffff'),
    usage: 'Background surface',
    modes: { dark: new Color('#1a1a1a') },
  },
});
```

### Named value access

The returned `Token[]` also exposes values as named properties:

```typescript
colors.primary;     // the Color('#0066cc') instance
colors.secondary;   // the Color('#cc6600') instance
colors.surface;     // the Color('#ffffff') instance (the base value, not modes)
```

These properties are non-enumerable --- they don't appear in `for...in`, `Object.keys()`,
`JSON.stringify()`, or spread. This prevents them from interfering with array operations.

Token names that conflict with `Array.prototype` properties (like `length`, `push`, `map`) will
throw an error.

### Type inference

TypeScript infers the value types from what you pass in:

```typescript
const durations = group('duration', {
  fast: new Duration(100, 'ms'),  // durations.fast is Duration
  normal: '200ms',                // durations.normal is string
});
```

## scale()

Creates a sequence of tokens. Works in two modes:

**Named object** (delegates to `group()`):

```typescript
import { scale, dp } from 'teikn';

const spacing = scale('spacing', {
  xs: dp(4),
  sm: dp(8),
  md: [dp(16), 'Standard spacing'],
  lg: dp(24),
  xl: dp(32),
});
```

**Numeric array** with optional transform and names:

```typescript
const fontSizes = scale('font-size', [10, 12, 14, 16, 18, 20, 24, 36], {
  names: ['100', '200', '300', '400', '500', '600', '700', '800'],
  transform: (n) => dp(n),
});
```

When using the numeric array form, indices are used as names if `names` is not provided.

## composite()

Creates tokens with structured values (typography, borders, etc.):

```typescript
import { composite, dp } from 'teikn';

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
});
```

Composite fields can contain value objects (`Dimension`, `Duration`, etc.) or strings. Nested
objects are not supported --- flatten your composite or split into separate tokens.

Composite fields can reference other tokens using `{tokenName}` syntax:

```typescript
const typography = composite('typography', {
  body: { fontFamily: '{bodyFont}', fontSize: dp(16) },
});
```

## tokens()

Merges multiple token arrays into one:

```typescript
import { tokens } from 'teikn';

const allTokens = tokens(colors, spacing, typography, shadows, transitions);
```

This is simply `groups.flat()` --- no transformation. Pass the result to `validate()` or
`Teikn.transform()`.

## theme()

Creates a named override layer:

```typescript
import { theme } from 'teikn';

const dark = theme('dark', colors, {
  surface: new Color('#1a1a1a'),
  background: new Color('#121212'),
  textPrimary: new Color('#e0e0e0'),
});
```

Themes validate that override keys match token names in the source. Unknown keys throw an error.

Themes stack:

```typescript
const highContrast = theme('high-contrast', dark, {
  textPrimary: new Color('#ffffff'),
});
```

You can theme across groups by passing the merged `tokens()` output:

```typescript
const allTokens = tokens(colors, spacing);
const dark = theme('dark', allTokens, {
  surface: new Color('#1a1a1a'),
  textPrimary: new Color('#e0e0e0'),
});
```

## ref()

Creates a token reference that resolves before generation:

```typescript
import { ref } from 'teikn';

const colors = group('color', {
  primary: '#0066cc',
  link: ref('primary'),
  linkHover: ref('primary', 'Hover state uses primary color'),
});
```

References use `{tokenName}` syntax and are resolved by `resolveReferences()` (called
automatically during generation). This is different from the object-identity-based references
used in composed values (Transition, BoxShadow) --- `ref()` is string-based and works across
any token type.

## dp()

Converts a pixel value from a design spec to its `rem` equivalent (assuming 16px base):

```typescript
import { dp } from 'teikn';

dp(16);   // Dimension(1, 'rem')
dp(8);    // Dimension(0.5, 'rem')
dp(4);    // Dimension(0.25, 'rem')
```

The name stands for *density-independent pixel*, borrowed from Android's display system.

## dim()

Creates a `Dimension` with any unit:

```typescript
import { dim } from 'teikn';

dim(16, 'px');    // Dimension(16, 'px')
dim(1, 'rem');    // Dimension(1, 'rem')
dim(100, 'vw');   // Dimension(100, 'vw')
```

## dur()

Creates a `Duration`:

```typescript
import { dur } from 'teikn';

dur(200, 'ms');   // Duration(200, 'ms')
dur(0.3, 's');    // Duration(0.3, 's')
```

## onColor() / onColors()

Pick the best contrasting text color (dark or light) for a given background:

```typescript
import { onColor, onColors } from 'teikn';

// Single color
onColor(new Color('#0066cc'));  // returns white (dark background)
onColor(new Color('#ffe335'));  // returns dark (light background)

// Batch --- generates 'onPrimary', 'onSecondary', etc.
const contrast = onColors('color', {
  primary: new Color('#0066cc'),
  secondary: new Color('#cc6600'),
  error: new Color('#d00000'),
});
```

## validate()

Checks a token set for issues:

```typescript
import { validate } from 'teikn';

const result = validate(allTokens);
if (!result.valid) {
  for (const issue of result.issues) {
    console.error(`[${issue.severity}] ${issue.token}: ${issue.message}`);
  }
}
```

Checks for: missing fields, duplicate names, invalid colors, unresolved references, circular
references, and composite token shape.

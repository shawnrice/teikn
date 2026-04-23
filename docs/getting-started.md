# Getting Started

Install teikn and generate your first set of design tokens in five steps.

```bash
npm install teikn
```

## 1. Define your colors

Use `Color` objects to get access to manipulation, contrast checking, and color space conversions.
`group()` creates a typed collection of tokens.

```typescript
import { Color, group } from 'teikn';

const palette = {
  blue: new Color('#0066cc'),
  orange: new Color('#e85d04'),
  neutral: new Color('#1a1a2e'),
};

const colors = group('color', {
  primary: [palette.blue, 'Primary brand color'],
  primaryLight: palette.blue.tint(0.3),
  primaryDark: palette.blue.shade(0.3),
  secondary: palette.orange,
  surface: new Color('#ffffff'),
  background: new Color('#fafafa'),
  textPrimary: palette.neutral.mix(new Color('#fff'), 0.05),
});
```

## 2. Add spacing and typography

`dp()` converts a pixel-based design spec value to `rem`. Designers think in pixels; the output
is resolution-independent.

```typescript
import { scale, dp, composite } from 'teikn';

const spacing = scale('spacing', {
  xs: dp(4),   // 0.25rem
  sm: dp(8),   // 0.5rem
  md: dp(16),  // 1rem
  lg: dp(24),  // 1.5rem
  xl: dp(32),  // 2rem
});

const typography = composite('typography', {
  body: {
    fontFamily: '"Inter", sans-serif',
    fontSize: dp(16),
    fontWeight: 400,
    lineHeight: 1.5,
  },
  heading: {
    fontFamily: '"Inter", sans-serif',
    fontSize: dp(32),
    fontWeight: 700,
    lineHeight: 1.2,
  },
});
```

## 3. Define a dark theme

`theme()` creates a named override layer. Derive values from your palette instead of
hand-picking hex codes.

```typescript
import { theme, tokens } from 'teikn';

const darkSurface = new Color('#1a1a1a');

const dark = theme('dark', colors, {
  surface: darkSurface,
  background: darkSurface.shade(0.3),
  primaryLight: palette.blue.tint(0.5),
  textPrimary: new Color('#e0e0e0'),
});
```

## 4. Merge and validate

```typescript
import { validate } from 'teikn';

const allTokens = tokens(colors, spacing, typography);

const result = validate(allTokens);
if (!result.valid) {
  for (const issue of result.issues) {
    console.error(`[${issue.severity}] ${issue.token}: ${issue.message}`);
  }
  process.exit(1);
}
```

## 5. Generate output

```typescript
import { Teikn } from 'teikn';

const writer = new Teikn({
  outDir: './dist/tokens',
  themes: [dark],
  generators: [
    new Teikn.generators.CssVars(),
    new Teikn.generators.Json(),
  ],
});

await writer.transform(allTokens);
```

This produces `tokens.css` with CSS custom properties and `tokens.json` with a flat JSON file,
both in `./dist/tokens/`. The dark theme generates `[data-theme="dark"]` overrides automatically.

```css
:root {
  --primary: rgb(0, 102, 204);
  --primary-light: rgb(77, 156, 219);
  --surface: rgb(255, 255, 255);
  --spacing-xs: 0.25rem;
  --spacing-md: 1rem;
  /* ... */
}

[data-theme="dark"] {
  --surface: rgb(26, 26, 26);
  --primary-light: rgb(128, 179, 230);
  /* ... */
}
```

### TypeScript / JavaScript output

For consumers that import tokens in code, add the `TypeScript` meta generator — it emits a
runtime `.mjs` and a companion `.d.ts` from a single construction:

```typescript
generators: [
  new Teikn.generators.CssVars(),
  new Teikn.generators.Json(),
  new Teikn.generators.TypeScript(),                    // → tokens.mjs + tokens.d.ts
  // new Teikn.generators.TypeScript({ module: 'cjs' }), // → tokens.cjs + tokens.d.ts
  // new Teikn.generators.JavaScript(),                  // runtime only, no types
  // new Teikn.generators.TypeScriptDeclarations(),      // types only, no runtime
],
```

The generated declarations use literal types by default — `tokens.primary` is typed as the
literal `"#0066cc"`, not `string`. This enables exhaustive unions like
`type TokenColor = typeof tokens[keyof typeof tokens]`. Pass `loose: true` if you need
widened primitive types.

## Next steps

- [Concepts](./concepts.md) --- how values, tokens, groups, and generators fit together
- [Values API](./api/values.md) --- Color, Duration, Dimension, BoxShadow, Transition, and more
- [Recipes](./recipes/composition.md) --- compose tokens, stagger animations, build elevation scales

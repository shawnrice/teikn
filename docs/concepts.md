# Concepts

How teikn's pieces fit together.

## Values are objects, not strings

Design tokens usually start as strings --- `"#0066cc"`, `"16px"`, `"0.2s ease"`. Teikn replaces
these with typed objects: `Color`, `Dimension`, `Duration`, `BoxShadow`, `Transition`, and others.

Why? Because strings are opaque. You can't lighten a hex code, convert pixels to rem, or scale a
duration without parsing first. Value objects carry their data in structured form, so manipulation
is a method call away:

```typescript
const blue = new Color('#0066cc');
blue.tint(0.3);          // lighten by mixing with white
blue.shade(0.3);         // darken by mixing with black
blue.setAlpha(0.5);      // transparent variant

const spacing = dp(16);  // Dimension(1, 'rem')
spacing.scale(2);        // Dimension(2, 'rem')
spacing.toPx();          // Dimension(32, 'px')
```

Every value type is **immutable** --- methods return new instances. Every value type serializes
to its CSS representation via `.toString()`, so they work seamlessly in template literals,
`JSON.stringify`, and generator output.

### Construction patterns

Every value type supports the same set of construction patterns:

```typescript
// Positional arguments
new Duration(200, 'ms');
new BoxShadow(0, 2, 8, 0, shadowColor);

// Object with named properties
new Duration({ value: 200, unit: 'ms' });
new BoxShadow({ offsetY: 2, blur: 8, color: shadowColor });

// CSS string
new Duration('200ms');
new BoxShadow('0 2px 8px rgba(0,0,0,.12)');

// Copy from existing instance
new Duration(existingDuration);

// Static factory (accepts any of the above)
Duration.from('200ms');
BoxShadow.from({ offsetY: 2, blur: 8 });
```

## Tokens are named values

A **token** is a value with a name and a type:

```typescript
{ name: 'primary', type: 'color', value: new Color('#0066cc') }
```

You don't create tokens directly. Builder functions like `group()`, `scale()`, and `composite()`
create them for you and handle metadata like descriptions and modes.

## Groups create and expose tokens

`group()` is the primary way to create tokens. It returns a `Token[]` that also exposes the raw
values as named properties:

```typescript
const durations = group('duration', {
  fast: new Duration(100, 'ms'),
  normal: new Duration(200, 'ms'),
  slow: new Duration(300, 'ms'),
});

// Array of tokens --- pass to tokens(), theme(), validate(), generators
durations.length;      // 3
durations[0].name;     // 'fast'
durations[0].type;     // 'duration'

// Named value access --- use in other value constructors
durations.fast;        // the Duration(100, 'ms') instance
durations.slow;        // the Duration(300, 'ms') instance
```

This dual nature is the key to composability. The array form feeds the generation pipeline. The
named form feeds other value constructors:

```typescript
const easings = group('timing', {
  standard: CubicBezier.standard,
});

const transitions = group('transition', {
  fade: new Transition(durations.fast, easings.standard),
});
```

The named properties are **non-enumerable**, so they don't appear in `for...in`, `Object.keys()`,
`JSON.stringify()`, or spread. Only direct property access (`durations.fast`) reaches them.

## Compose values, not strings

When you pass `durations.fast` into `new Transition(...)`, two things happen:

1. The Transition stores the actual `Duration` object (not a copy, not a string).
2. Generators that support references detect this shared identity and emit references
   instead of inlining the value.

In CSS, this means the generated output uses `var()`:

```css
:root {
  --duration-fast: 100ms;
  --timing-standard: cubic-bezier(0.4, 0, 0.2, 1);
  --transition-fade: var(--duration-fast) var(--timing-standard);
}
```

In SCSS, `$variable` references:

```scss
$duration-fast: 100ms;
$timing-standard: cubic-bezier(0.4, 0, 0.2, 1);
$transition-fade: $duration-fast $timing-standard;
```

In DTCG, aliases:

```json
{
  "transition-fade": {
    "$value": {
      "duration": "{duration-fast}",
      "timingFunction": "{timing-standard}"
    }
  }
}
```

No special syntax or `ref()` calls needed. The relationship is discovered automatically from
JavaScript object identity --- if two tokens share the same value object, generators know about it.

When a value is *not* registered as a token (e.g., you created a `Duration` inline rather than
pulling it from a group), generators inline the value as they always have. References are
opt-in by construction, not by configuration.

## Themes are override layers

A **theme** overrides specific token values without replacing the full set:

```typescript
const dark = theme('dark', colors, {
  surface: darkSurface,
  background: darkSurface.shade(0.3),
  textPrimary: new Color('#e0e0e0'),
});
```

Themes stack --- derive a high-contrast variant from your dark theme:

```typescript
const highContrast = theme('high-contrast', dark, {
  textPrimary: new Color('#ffffff'),
});
```

Generators emit theme overrides in the format that makes sense for each output:
- CSS: `[data-theme="dark"] { ... }` or `@media (prefers-color-scheme: dark) { ... }`
- SCSS: `$token--dark: value;`
- DTCG: `$extensions.mode`

## Generators produce output

A **generator** transforms a `Token[]` into a file. Teikn ships with:

| Generator | Output | Use case |
|-----------|--------|----------|
| `CssVars` | `tokens.css` | CSS custom properties |
| `ScssVars` | `tokens.scss` | SCSS variables |
| `Scss` | `tokens.scss` | SCSS with maps and group functions |
| `Json` | `tokens.json` | Flat JSON |
| `Dtcg` | `tokens.tokens.json` | W3C Design Token Community Group format |
| `JavaScript` | `tokens.mjs` (default) / `tokens.cjs` | JS runtime; ESM by default, CJS via `module: "cjs"` |
| `TypeScriptDeclarations` | `tokens.d.ts` | Ambient TS declarations, literal types by default |
| `TypeScript` | `tokens.mjs` + `tokens.d.ts` | Meta generator — emits runtime + declarations as a pair |
| `Html` | `tokens.html` | Visual documentation page |
| `Storybook` | `*.stories.tsx` | Storybook stories |

Generators that support references (CssVars, ScssVars, DTCG) automatically emit `var()`,
`$variable`, or `{alias}` when they detect composed values. Other generators inline values.

## Plugins transform tokens

**Plugins** transform tokens between creation and generation. They run in a defined order and
can rename tokens, convert units, validate accessibility, and more.

```typescript
const writer = new Teikn({
  generators: [new Teikn.generators.CssVars()],
  plugins: [
    new Teikn.plugins.NameConventionPlugin({ convention: 'kebab-case' }),
    new Teikn.plugins.ContrastValidatorPlugin({
      pairs: [
        { foreground: 'textPrimary', background: 'surface', level: 'AA' },
      ],
    }),
  ],
});
```

Plugins see tokens *after* stringification, so they work with string values. The reference map
is built *before* plugins run, so references are unaffected by name transformations.

## The pipeline

The full flow from definition to output:

```
Values (Color, Duration, ...)
  ↓ group(), scale(), composite()
Tokens (Token[])
  ↓ validate()
Validated tokens
  ↓ Teikn.transform()
    ↓ Build reference map (object identity → token name)
    ↓ Stringify values (call .toString(), or emit references)
    ↓ Run plugins (name transforms, unit conversions, audits)
    ↓ Generate output (CSS, SCSS, JSON, etc.)
Output files
```

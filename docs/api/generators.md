# Generators

Generators produce output files from your tokens. Each targets a different format. Pass them to
`Teikn`:

```typescript
const writer = new Teikn({
  outDir: './dist',
  generators: [
    new Teikn.generators.CssVars(),
    new Teikn.generators.Scss({ groups: true }),
    new Teikn.generators.ScssVars(),
    new Teikn.generators.Json(),
    new Teikn.generators.JavaScript({ groups: true }),
    new Teikn.generators.TypeScript({ groups: true }),
    new Teikn.generators.Html(),
    new Teikn.generators.Storybook(),
    new Teikn.generators.Dtcg(),
  ],
});
```

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

## Common Options

All generators accept:

| Option     | Default    | Description                             |
| ---------- | ---------- | --------------------------------------- |
| `ext`      | varies     | Output file extension                   |
| `filename` | `'tokens'` | Output filename (without extension)     |
| `groups`   | `false`    | Generate typed group accessor functions |

## Generator-Specific Options

**CssVars**: `useMediaQuery?: boolean`, `modeSelectors?: Record<string, string>`

**Storybook**: `importPath?: string`, `storyTitle?: string`

**Dtcg**: `hierarchical?: boolean` (default: true), `separator?: string` (default: `'.'`)

## TypeScript / JavaScript output

The `TypeScript` meta generator emits a runtime `.mjs` and a companion `.d.ts` from a single
construction:

```typescript
generators: [
  new Teikn.generators.TypeScript(),                    // → tokens.mjs + tokens.d.ts
  // new Teikn.generators.TypeScript({ module: 'cjs' }), // → tokens.cjs + tokens.d.ts
  // new Teikn.generators.JavaScript(),                  // runtime only, no types
  // new Teikn.generators.TypeScriptDeclarations(),      // types only, no runtime
],
```

The generated declarations use literal types by default — `tokens.primary` is typed as the literal
`"#0066cc"`, not `string`. This enables exhaustive unions like
`type TokenColor = typeof tokens[keyof typeof tokens]`. Pass `loose: true` if you need widened
primitive types.

## Which generators emit references?

Generators that support references automatically emit `var()`, `$variable`, or `{alias}` when they
detect composed values (see [Composition recipes](../recipes/composition.md)). Other generators
inline values.

| Generator            | Reference format | Ordering                                               |
| -------------------- | ---------------- | ------------------------------------------------------ |
| CssVars              | `var(--name)`    | Declaration order doesn't matter (CSS resolves lazily) |
| ScssVars             | `$name`          | Topologically sorted (SCSS resolves at compile time)   |
| Dtcg                 | `"{name}"`       | Aliases are a DTCG-native concept                      |
| JS, JSON, Html, etc. | Inline values    | No reference mechanism in these formats                |

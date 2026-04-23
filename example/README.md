# Teikn API Example

A minimal end-to-end example of using Teikn as a JS library.

## Files

- `raw-tokens.js` / `raw-tokens.ts` — define tokens using teikn's builders (`group`, `theme`, `Color`, etc.)
- `example-usage.js` / `example-usage.ts` — wire up generators, plugins, and themes, then call `transform()`

## Defining tokens

Tokens are organized into groups. Each group entry can be a value, a `[value, usage]` tuple, a value class (`Color`, `Dimension`, etc.), or a `ref()` to another token:

```js
import { Color, group, ref, theme, tokens } from 'teikn';

const colors = group('color', {
  primary: [new Color('steelblue'), 'Primary branding color'],
  link: ref('primary'),
  surface: '#ffffff',
});

const darkColors = theme('dark', colors, {
  surface: '#1a1a1a',
});

export const allTokens = tokens(colors);
export const themes = [darkColors];
```

## Generating output

```js
import { Teikn } from 'teikn';
import { allTokens, themes } from './raw-tokens.js';

const writer = new Teikn({
  generators: [
    new Teikn.generators.Json(),
    new Teikn.generators.TypeScript(),  // emits tokens.mjs + tokens.d.ts
    new Teikn.generators.Scss(),
    new Teikn.generators.CssVars(),
  ],
  themes,
  outDir: './dist',
});

await writer.transform(allTokens);
```

## Running

```bash
bun example-usage.ts   # canonical
bun example-usage.js   # ESM JS variant
```

Both write to `./dist/` (`.ts`) and `./dist-js/` (`.js`) respectively, so they don't clobber each other.

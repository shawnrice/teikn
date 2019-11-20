# Teikn

Generates design tokens

## Tokens

```typescript
interface Token {
  /**
   * The full name of the token
   */
  name: string;
  /**
   * General type information
   *
   */
  type: string;
  /**
   * The value of the token
   */
  value: string | number;
  /**
   * Supplied as a comment or a indicator of how something should be used
   */
  usage?: string;
}
```

## Supported Target Formats

- SCSS (with a map)
- SCSS (as variables)
- JSON
- Commonjs Javascript
- ESModule Javascript
- TypeScript definitions

## Use as a CLI

```bash
teikn path/to/tokens --outdir="./lib" --generators="json,scss" --plugins="ColorTransformPlugin,SCSSQuoteValuePlugin"
```

## Use as a library

```javascript
const { resolve } = require('path');
const { Teikn } = require('teikn');

const tokens = [{...}, {...}]; // import these from somewhere
// Configure the writer
const writer = new Teikn({
  outDir: resolve(__dirname, 'out'),
  generators: [
    // Generates the tokens in JSON
    new Teikn.generators.Json(),
    // Generates an scss map of the tokens with a getter
    new Teikn.generators.Scss({ filename: '_tokens' }),
    // Generates an esmodule of the tokens (default extension is `.mjs`)
    new Teikn.generators.ESModule({ ext: 'js' }),
    // Generates a .d.ts file for the tokens
    new Teikn.generators.TypeScript(),
  ],
  plugins: [
    // Normalizes all your color tokens
    new Teikn.plugins.ColorTransformPlugin({ type: 'hsl' }),
    // Quotes font and font-family tokens
    new Teikn.plugins.SCSSQuoteValuePlugin(),
  ],
});

// Run the writer with the tokens
writer.transform(tokens);
```

## TypeScript

Typings are included, so you should be good to go.

## License

MIT

Copyright 2019 Shawn Patrick Rice

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

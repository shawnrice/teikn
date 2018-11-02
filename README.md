# Design Token Tool

WIP

## Tokens

```typescript
interface token {
  /**
   * The full name of the token
   */
  name: string;
  /**
   * General type information
   *
   * @todo expand these
   */
  type: 'color' | 'size';
  /**
   * The value of the token
   */
  value: string | number;
  /**
   * Supplied as a comment or a indicator of how something should be used
   */
  usage: string;
}
```

## Supported Target Formats

- scss
- json

# Use as a library

@todo update when published somewhere

```javascript
const { resolve } = require('path');
const { TokenWriter } = require('<dir>/src/token-writer');

const tokens = [{...}, {...}]; // import these from somewhere
// Configure the writer
const writer = new TokenWriter({
  outDir: resolve(__dirname, 'out'),
  generators: ['json', 'scss'],
});
// Run the writer with the tokens
writer.run(tokens);
```

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
   *
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

## Supported Formats

- scss
- json

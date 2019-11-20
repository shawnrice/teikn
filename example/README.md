# Teikn API Example

Here's a quick example of how to use Teikn as a JS library.

In this example, we define the tokens in `./raw-tokens.js`. It's good to note that it's just a regular JavaScript file.
All that's needed is that we can import an array of tokens from it.

A token looks like:

```typescript
type Token = {
  name: string;
  type: string;
  usage?: string;
  value: any;
};
```

Or, for example:

```javascript
const PrimaryColorToken = {
  name: 'colorPrimary',
  type: 'color',
  usage: 'This is just a usage note that comes as a comment.',
  value: 'aliceblue',
};
```

Then, in `example-usage.js`, we just need to create a new instance of `Teikn` and tell it which generators and plugins
to use as well as where to output the files. After that, we call `transform`, and you have some files.

If you want to re-use the tokens (which is probably the reason why you're making them to begin with), then you can
publish them on GitHub or NPM.

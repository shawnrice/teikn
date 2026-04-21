// Import Teikn. This should be obvious
const Teikn = require('../lib').default;
// We defined our tokens elsewhere, so import the JS object that we want to transform
const { tokens } = require('./raw-tokens');

// Create an instance of the writer
const Writer = new Teikn({
  // Generators are the things that translate the original JS values into clean, annotated tokens in different formats
  generators: [
    // Create the tokens.scss with the SCSS maps and the getter
    new Teikn.generators.Scss(),
    // Emit a TypeScript runtime (.mjs) + ambient declarations (.d.ts)
    // from one construction. Add `module: "cjs"` for CommonJS instead.
    new Teikn.generators.TypeScript(),
    // Create a JSON version of the tokens
    new Teikn.generators.Json(),
  ],
  // Plugins can alter the tokens before they get piped into the generators
  plugins: [
    // We'll prefer using rgba for the colors, regardless of how we define them
    new Teikn.plugins.ColorTransformPlugin({ type: 'rgba' }),
    // We'll rename all of our tokens so that they're prefixed by the type. E.g. a color token with the name `primary`
    // will become `colorPrimary` (or `color-primary`)
    new Teikn.plugins.PrefixTypePlugin(),
    // This one is necessary if you're using font families
    new Teikn.plugins.ScssQuoteValuePlugin(),
  ],
  // Output all the tokens to ./lib
  outDir: `${__dirname}/lib/tokens`,
});

// Transform the tokens. This actually does the work.
Writer.transform(tokens);

// That's it.

const { Teikn } = require('..');
const { tokens } = require('./raw-tokens');

const Writer = new Teikn({
  generators: [
    // Create the tokens.scss with the SCSS maps and the getter
    new Teikn.generators.Scss(),
    // Create a version of the tokens in SCSS just as variables (but name it differently)
    new Teikn.generators.ScssVars({ filename: 'tokens-vars' }),
    // Teikn.generators.SCSSCSSVars(),
    // Teikn.generators.ESM(),
    new Teikn.generators.JavaScript(),
    // Create the TypeScript types
    new Teikn.generators.TypeScript(),
    new Teikn.generators.Json(),
  ],
  plugins: [
    new Teikn.plugins.ColorTransformPlugin({ type: 'rgb' }),
    new Teikn.plugins.PrefixTypePlugin(),
    new Teikn.plugins.SCSSQuoteValuePlugin(),
  ],
  outDir: `${__dirname}/lib`,
});

Writer.transform(tokens);

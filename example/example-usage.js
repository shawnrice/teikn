const { Teikn } = require('..');
console.log(Teikn);
console.log(Teikn.generators);
console.log(Teikn.plugins);
console.log(Teikn.generators.SCSS);
const tokens = [{ name: 'test', value: 'red', type: 'color', usage: 'TODO' }];

const Writer = new Teikn({
  generators: [
    new Teikn.generators.SCSS(),
    new Teikn.generators.SCSSVars(),
    // Teikn.generators.SCSSCSSVars(),
    // Teikn.generators.ESM(),
    new Teikn.generators.TypeScript(),
    new Teikn.generators.Json(),
  ],
  plugins: [
    new Teikn.plugins.ColorTransformPlugin({ type: 'rgb' }),
    new Teikn.plugins.PrefixTypePlugin(),
    new Teikn.plugins.SCSSQuoteValuePlugin(),
  ],
  outDir: './tokens',
});

Writer.transform(tokens);

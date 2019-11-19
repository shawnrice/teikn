const Teikn = require('..');

const tokens = [{ name: 'test', value: 'red', type: 'color', usage: 'TODO' }];

const Writer = new Teikn({
  generators: [
    Teikn.generators.SCSS,
    Teikn.generators.SCSSVars,
    Teikn.generators.SCSSCSSVars,
    Teikn.generators.ESM,
    Teikn.generators.TypeScript,
    Teikn.generators.JSON,
  ],
  plugins: [...Teikn.defaultPlugins, MyOtherPlugin],
  outDir: './tokens',
});

Writer.transform(tokens);

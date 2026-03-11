import * as path from 'node:path';

import { Teikn, validate } from '../index';

import { allTokens } from './raw-tokens';

// ─── Validate first ─────────────────────────────────────────

const result = validate(allTokens);
if (!result.valid) {
  console.error('Token validation failed:');
  result.issues.forEach(i => console.error(`  [${i.severity}] ${i.token}: ${i.message}`));
  process.exit(1);
}

// ─── Generate ────────────────────────────────────────────────

const writer = new Teikn({
  generators: [
    // Code outputs
    new Teikn.generators.Json(),
    new Teikn.generators.ESModule({ ext: 'js', groups: true }),
    new Teikn.generators.TypeScript({ groups: true }),

    // Stylesheets
    new Teikn.generators.Scss({ groups: true }),
    new Teikn.generators.CSSVars(),

    // Documentation
    new Teikn.generators.HTML(),
    new Teikn.generators.Storybook(),

    // Interchange
    new Teikn.generators.DTCG(),
  ],
  plugins: [
    new Teikn.plugins.ColorTransformPlugin({ type: 'rgba' }),
    new Teikn.plugins.PrefixTypePlugin(),
    new Teikn.plugins.SCSSQuoteValuePlugin(),
  ],
  outDir: path.resolve(import.meta.dirname!, 'dist'),
});

writer.transform(allTokens);

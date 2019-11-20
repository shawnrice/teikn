import fs from 'fs';
import path from 'path';

import { ensureDirectory } from './ensure-directory';
import { Generator, JavaScript, Json, Scss, ScssVars, TypeScript } from './Generators';
import { ColorTransformPlugin, Plugin, PrefixTypePlugin, SCSSQuoteValuePlugin } from './Plugins';
import { Token } from './Token';

const plugins = [ColorTransformPlugin, PrefixTypePlugin, SCSSQuoteValuePlugin];
const generators = [JavaScript, Json, Scss, ScssVars, TypeScript];

export interface TeiknOptions {
  generators: Generator[];
  plugins: Plugin[];
  outDir: string;
}

export class Teikn {
  generators: Generator[];

  plugins: Plugin[];

  outDir: string;

  static generators = generators;

  static plugins = plugins;

  static Plugin = Plugin;

  static Generator = Generator;

  constructor(options: TeiknOptions) {
    const { generators = [], outDir = './', plugins = [] } = options;
    this.generators = generators;
    this.plugins = plugins;
    this.outDir = outDir;
  }

  transform(tokens: Token[]) {
    const map = new Map<Generator, string>();

    // Go ahead and generate the file contents before trying to write anything
    this.generators.forEach(generator => {
      map.set(generator, generator.generate(tokens, this.plugins));
    });

    ensureDirectory(this.outDir)
      .then(() => {
        this.generators.forEach(generator => {
          const filename = path.resolve(this.outDir, generator.file);
          fs.writeFile(filename, map.get(generator), err => {
            if (err) {
              console.error(err);
            } else {
              console.log(`Wrote ${filename}`);
            }
          });
        });
      })
      .catch(err => {
        console.error(err);
      });
  }
}

export default Teikn;

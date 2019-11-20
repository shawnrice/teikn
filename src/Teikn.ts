import fs from 'fs';
import path from 'path';

import { ensureDirectory } from './ensure-directory';
import { Generator, generators } from './Generators';
import * as plugins from './Plugins';
import { Token } from './Token';

export interface TeiknOptions {
  generators: Generator[];
  plugins: plugins.Plugin[];
  outDir: string;
}

export class Teikn {
  generators: Generator[];

  plugins: plugins.Plugin[];

  outDir: string;

  static generators = generators;

  static plugins = plugins;

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

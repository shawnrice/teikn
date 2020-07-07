import fs from 'fs';
import path from 'path';

import { ensureDirectory } from './ensure-directory';
import { ESModule, Generator, JavaScript, Json, Scss, ScssVars, TypeScript } from './Generators';
import { ColorTransformPlugin, Plugin, PrefixTypePlugin, SCSSQuoteValuePlugin } from './Plugins';
import { Token } from './Token';

const plugins = { ColorTransformPlugin, PrefixTypePlugin, SCSSQuoteValuePlugin };
const generators = { ESModule, JavaScript, Json, Scss, ScssVars, TypeScript };

export interface TeiknOptions {
  /**
   * The generators that you want to use
   *
   * default: `[new Teikn.generators.Json()]`
   */
  generators?: Generator[];
  /**
   * The plugins that you want to use
   *
   * default: `[]`
   */
  plugins?: Plugin[];
  /**
   * The directory to output the files
   *
   * defaults to `process.cwd()`
   */
  outDir?: string;
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
    const { generators, outDir, plugins } = options;
    this.generators = generators || [new Teikn.generators.Json()];
    this.plugins = plugins || [];
    this.outDir = outDir || process.cwd();
  }

  async transform(tokens: Token[]): Promise<void> {
    const map = new Map<Generator, string>();

    // Go ahead and generate the file contents before trying to write anything
    this.generators.forEach(generator => {
      map.set(generator, generator.generate(tokens, this.plugins));
    });

    // TODO clean this up, remove sync but still ensure the process runs until the file is written
    ensureDirectory(this.outDir)
      .then(() => {
        this.generators.forEach(generator => {
          const filename = path.resolve(this.outDir, generator.file);
          try {
            fs.writeFileSync(filename, map.get(generator));
            console.log(`Wrote ${filename}`);
          } catch (err) {
            console.error(`Error writing ${filename}`);
          }
        });
      })
      .catch(err => {
        console.error(err);
      });
  }
}

export default Teikn;

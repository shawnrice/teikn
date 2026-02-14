import fs from 'node:fs';
import path from 'node:path';

import { ensureDirectory } from './ensure-directory';
import { ESModule, Generator, JavaScript, Json, Scss, ScssVars, TypeScript } from './Generators';
import { ColorTransformPlugin, Plugin, PrefixTypePlugin, SCSSQuoteValuePlugin } from './Plugins';
import type { Token } from './Token';

const plugins: {
  ColorTransformPlugin: typeof ColorTransformPlugin;
  PrefixTypePlugin: typeof PrefixTypePlugin;
  SCSSQuoteValuePlugin: typeof SCSSQuoteValuePlugin;
} = { ColorTransformPlugin, PrefixTypePlugin, SCSSQuoteValuePlugin };

const generators: {
  ESModule: typeof ESModule;
  JavaScript: typeof JavaScript;
  Json: typeof Json;
  Scss: typeof Scss;
  ScssVars: typeof ScssVars;
  TypeScript: typeof TypeScript;
} = { ESModule, JavaScript, Json, Scss, ScssVars, TypeScript };

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

  static generators: typeof generators = generators;

  static plugins: typeof plugins = plugins;

  static Plugin: typeof Plugin = Plugin;

  static Generator: typeof Generator = Generator;

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

    try {
      await ensureDirectory(this.outDir);
      this.generators.forEach(async generator => {
        const filename = path.resolve(this.outDir, generator.file);
        try {
          await fs.promises.writeFile(filename, map.get(generator)!);
          console.log(`Wrote ${filename}`);
        } catch (_) {
          console.error(`Error writing ${filename}`);
        }
      });
    } catch (error) {
      console.error(error);
    }
  }
}

export default Teikn;

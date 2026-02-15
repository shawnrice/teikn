import fs from 'node:fs';
import path from 'node:path';

import { ensureDirectory } from './ensure-directory';
import { CSSVars, DTCGGenerator, ESModule, Generator, HTML, JavaScript, Json, Scss, ScssVars, Storybook, TypeScript } from './Generators';
import { ColorTransformPlugin, Plugin, PrefixTypePlugin, SCSSQuoteValuePlugin } from './Plugins';
import { resolveReferences } from './resolve';
import type { Token } from './Token';
import { validate } from './validate';
import type { ValidationResult } from './validate';

const plugins: {
  ColorTransformPlugin: typeof ColorTransformPlugin;
  PrefixTypePlugin: typeof PrefixTypePlugin;
  SCSSQuoteValuePlugin: typeof SCSSQuoteValuePlugin;
} = { ColorTransformPlugin, PrefixTypePlugin, SCSSQuoteValuePlugin };

const generators: {
  CSSVars: typeof CSSVars;
  DTCG: typeof DTCGGenerator;
  ESModule: typeof ESModule;
  HTML: typeof HTML;
  JavaScript: typeof JavaScript;
  Json: typeof Json;
  Scss: typeof Scss;
  ScssVars: typeof ScssVars;
  Storybook: typeof Storybook;
  TypeScript: typeof TypeScript;
} = { CSSVars, DTCG: DTCGGenerator, ESModule, HTML, JavaScript, Json, Scss, ScssVars, Storybook, TypeScript };

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

  static validate: typeof validate = validate;

  static resolveReferences: typeof resolveReferences = resolveReferences;

  constructor(options: TeiknOptions) {
    const { generators, outDir, plugins } = options;
    this.generators = generators || [new Teikn.generators.Json()];
    this.plugins = plugins || [];
    this.outDir = outDir || process.cwd();
  }

  validate(tokens: Token[]): ValidationResult {
    return validate(tokens);
  }

  async transform(tokens: Token[]): Promise<void> {
    // Phase 1: Resolve references
    const resolved = resolveReferences(tokens);

    const map = new Map<Generator, string>();

    // Phase 2: Share sibling references, then generate file contents
    this.generators.forEach(g => { g.siblings = this.generators; });
    this.generators.forEach(generator => {
      map.set(generator, generator.generate(resolved, this.plugins));
    });

    // Phase 3: Write files
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

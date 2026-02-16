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

export type TeiknOptions = {
  generators?: Generator[];
  plugins?: Plugin[];
  outDir?: string;
};

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

  generateToStrings(tokens: Token[]): Map<string, string> {
    const resolved = resolveReferences(tokens);

    this.generators.forEach(g => { g.siblings = this.generators; });

    const results = new Map<string, string>();
    for (const generator of this.generators) {
      results.set(generator.file, generator.generate(resolved, this.plugins));
    }
    return results;
  }

  async transform(tokens: Token[]): Promise<void> {
    const files = this.generateToStrings(tokens);

    try {
      await ensureDirectory(this.outDir);
      await Promise.all(
        [...files.entries()].map(async ([file, content]) => {
          const filename = path.resolve(this.outDir, file);
          try {
            await fs.promises.writeFile(filename, content);
            console.log(`Wrote ${filename}`);
          } catch (_) {
            console.error(`Error writing ${filename}`);
          }
        }),
      );
    } catch (error) {
      console.error(error);
    }
  }
}

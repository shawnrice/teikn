import { Generator, generators } from './Generators';
import * as plugins from './Plugins';
import { Token } from './Token';

export class Teikn {
  generators: Generator[];

  plugins: plugins.Plugin[];

  static generators = generators;

  static plugins = plugins;

  constructor(options: { generators: Generator[]; plugins: plugins.Plugin[] }) {
    this.generators = options.generators;
    this.plugins = options.plugins;
  }

  transform(tokens: Token[]) {
    const map = new Map<Generator, string>();
    this.generators.forEach(generator => {
      map.set(generator, generator.generate(tokens, this.plugins));
    });
    console.log(map);
  }
}

export default Teikn;

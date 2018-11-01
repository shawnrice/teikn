import fs from 'fs';
import path from 'path';
import ensureDirectory from './ensure-directory';
import possibleGenerators from './generators';

export class TokenWriter {
  constructor(outDir, generators) {
    this.outDir = outDir;
    this.generators = new Map();

    if (typeof generators === 'string') {
      this.enqueueByString(generators);
    } else if (Array.isArray(generators)) {
      for (let gen of generators) {
        if (typeof gen === 'string') {
          this.enqueueByString(gen);
        } else {
          console.warn(`Generators must be enqueue by string. Received ${JSON.stringify(gen)}`);
        }
      }
    } else {
      console.warn(`Generators must be enqueue by string. Received ${JSON.stringify(generators)}`);
    }
  }

  enqueueByString(gen) {
    if (gen in possibleGenerators) {
      this.enqueue({ name: gen, extension: gen, generator: possibleGenerators[gen] });
    } else {
      console.warn(`Warning: "${gen}" is not a known generator. Skipping.`);
    }
  }

  enqueue({ name, extension, generator }) {
    this.generators.set(name, { extension, generator });
  }

  async run(tokens) {
    await ensureDirectory(this.outDir);

    const iterator = this.generators[Symbol.iterator]();

    const tasks = [];
    let result = iterator.next();
    while (!result.done) {
      const [name, { extension, generator }] = result.value;
      console.log(`Working on ${name}.`);
      tasks.push(this.write(extension, generator(tokens)));
      result = iterator.next();
    }
    await Promise.all(tasks);
  }

  async write(extension, data) {
    return new Promise((res, rej) => {
      fs.writeFile(
        path.resolve(this.outDir, `tokens.${extension}`),
        data,
        err => (err ? rej(err) : res())
      );
    });
  }
}

export default TokenWriter;

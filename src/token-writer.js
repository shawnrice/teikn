const fs = require('fs');
const path = require('path');
const { isPlainObject, isFunction } = require('lodash');
const { ensureDirectory } = require('./ensure-directory');
const possibleGenerators = require('./generators');

class TokenWriter {
  constructor(options = {}) {
    const { outDir, generators, ...rest } = options;

    if (!outDir) {
      throw new Error(`An outDir must be provided to the initialization object.`);
    }

    if (!generators) {
      throw new Error(`No generators were provided to the initialization object.`);
    }

    this.outDir = outDir;
    this.generators = new Map();
    this.options = rest;

    if (typeof generators === 'string') {
      this.enqueueByString(generators);
    } else if (Array.isArray(generators)) {
      for (let gen of generators) {
        if (typeof gen === 'string') {
          this.enqueueByString(gen);
        } else if (isPlainObject(gen)) {
          this.enqueueByObject(gen);
        } else {
          console.warn(
            `Generators must be enqueue by string or object. Received ${JSON.stringify(gen)}`,
          );
        }
      }
    } else if (isPlainObject(generators)) {
      this.enqueueByObject(generators);
    } else {
      console.warn(`Generators must be enqueue by string. Received ${JSON.stringify(generators)}`);
    }
  }

  enqueueByString(gen) {
    if (gen in possibleGenerators) {
      this.enqueue({
        name: gen,
        extension: possibleGenerators[gen].extension,
        generator: possibleGenerators[gen].generator,
      });
    } else {
      throw new Error(`Warning: "${gen}" is not a known generator.`);
    }
  }

  enqueueByObject(gen) {
    const { name, generator, filename = 'tokens', extension, options } = gen;
    if (typeof extension !== 'string') {
      throw new Error(`Warning: supplied generator "${name}" needs to have a string extension.`);
    }

    if (typeof name !== 'string') {
      throw new Error(`Warning: supplied generator without a string name.`);
    }

    if (typeof generator !== 'undefined' && isFunction(generator)) {
      this.enqueue({ name, extension, filename, generator, options });
    } else if (name in possibleGenerators) {
      this.enqueue({ name, extension, generator: possibleGenerators[generator], options });
    } else {
      throw new Error(
        `Warning: a supplied generator needs to be either a function or one of ${Object.keys(
          possibleGenerators,
        )}`,
      );
    }
  }

  enqueue({ name, filename = 'tokens', extension, generator, options = {} }) {
    const opts = Object.assign({}, this.options, options);
    this.generators.set(name, { extension, filename, generator, options: opts });
  }

  async run(tokens) {
    await ensureDirectory(this.outDir);

    const iterator = this.generators[Symbol.iterator]();

    const tasks = [];
    let result = iterator.next();
    while (!result.done) {
      const [name, { extension, generator, options, filename = 'tokens' }] = result.value;

      console.log(`Working on ${name}.`);

      tasks.push(this.write({ extension, filename, data: generator(tokens, options) }));

      console.log(`Wrote: ${path.resolve(this.outDir, [filename, extension].join('.'))}`);

      result = iterator.next();
    }
    await Promise.all(tasks);
  }

  async write({ extension, filename, data }) {
    return new Promise((res, rej) => {
      fs.writeFile(path.resolve(this.outDir, [filename, extension].join('.')), data, err =>
        err ? rej(err) : res(),
      );
    });
  }
}

module.exports = {
  default: TokenWriter,
  TokenWriter,
};

const camelCase = require('lodash/camelCase');
const Generator = require('./Generator');

const defaultOptions = {
  ext: 'json',
  nameTransformer: camelCase,
};

class JSONGenerator extends Generator {
  constructor(options = {}) {
    const opts = Object.assign({}, defaultOptions, options);
    super(opts);
  }

  generateToken(token) {
    const { nameTransformer } = this.options;
    const { name, ...values } = token;
    const key = nameTransformer(name);

    return { [key]: values };
  }

  combinator(tokens) {
    const combined = tokens.reduce(
      (acc, token) => Object.assign(acc, this.generateToken(token)),
      {},
    );

    return JSON.stringify(combined, null, 2);
  }
}

module.exports = JSONGenerator;

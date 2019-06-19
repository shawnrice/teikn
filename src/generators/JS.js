const { EOL } = require('os');
const camelCase = require('lodash/camelCase');
const startCase = require('lodash/startCase');
const Generator = require('./Generator');
const { getDate } = require('../utils');
const pkg = require('../../package.json');

const defaultOptions = {
  ext: 'js',
  nameTransformer: camelCase,
  dateFn: getDate,
};

const maybeQuote = val => (typeof val === 'string' ? `'${val}'` : val);

class JS extends Generator {
  constructor(options = {}) {
    const opts = Object.assign({}, defaultOptions, options);
    super(opts);
  }

  header() {
    const { dateFn } = this.options;
    return [
      `/**`,
      ` * ${startCase(pkg.name)} v${pkg.version}`,
      ` * Generated ${dateFn()}`,
      ` *`,
      ` * This file is generated and should be commited to source control`,
      ` *`,
      ` */`,
    ].join(EOL);
  }

  generateToken(token) {
    const { nameTransformer } = this.options;

    return [
      `  /**`,
      token.usage && `   *  ${token.usage}`,
      `   *  Type: ${token.type}`,
      `   */`,
      `  ${nameTransformer(token.name)}: ${maybeQuote(token.value)},`,
    ]
      .filter(Boolean)
      .map((token, index, arr) => (index === arr.length - 1 ? token.slice(0, -1) : token))
      .join(EOL);
  }

  combinator(tokens) {
    const values = tokens.map(t => this.generateToken(t));
    return ['module.exports = {', values.join(EOL), '}'].join(EOL);
  }
}

module.exports = JS;

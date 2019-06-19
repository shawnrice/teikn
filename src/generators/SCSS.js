const { EOL } = require('os');
const kebabCase = require('lodash/kebabCase');
const startCase = require('lodash/startCase');
const Generator = require('./Generator');
const { transformValue } = require('./value-transforms');
const { getDate } = require('../utils');
const pkg = require('../../package.json');

const maybeWrap = (val, type) => {
  if (type === 'font' || type === 'font-family') {
    return `unquote('#{${val}}')`;
  }
  return val;
};

const defaultOptions = {
  ext: 'scss',
  nameTransformer: kebabCase,
  dateFn: getDate,
};

class SCSSGenerator extends Generator {
  constructor(options = {}) {
    const opts = Object.assign({}, defaultOptions, options);
    super(opts);
  }

  prepareToken(token) {
    const { nameTransformer } = this.options;
    const { name, type, value, usage } = token;
    const key = nameTransformer(name);
    const val = maybeWrap(transformValue(value, type, this.options), type);

    return { usage, key, val };
  }

  generateToken(token) {
    const { usage, key, val } = this.prepareToken(token);

    // prettier-ignore
    return [
      usage && `  /// ${usage}`,
      `  ${key}: ${val},`,
    ]
      .filter(Boolean)
      .join(EOL);
  }

  combinator(tokens) {
    const values = tokens.map(t => this.generateToken(t));
    return [`// prettier-ignore`, `$token-values: (`, values.join(EOL), `);`, EOL].join(EOL);
  }

  header() {
    const { dateFn } = this.options;

    return [
      `///`,
      `/// ${startCase(pkg.name)} v${pkg.version}`,
      `/// Generated ${dateFn()}`,
      `///`,
      `/// This file is generated and should be commited to source control`,
      `///`,
      EOL,
    ].join(EOL);
  }

  footer() {
    return [
      `/// Use "get-token" to access tokens by name`,
      `@function get-token($name) {`,
      `  @if (not map-has-key($token-values, $name)) {`,
      `    @error "Token '#{$name}' does not exist.";`,
      `  }`,
      `  @return map-get($token-values, $name);`,
      `}`,
    ].join(EOL);
  }
}

module.exports = SCSSGenerator;

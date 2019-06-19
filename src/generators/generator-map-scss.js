const { EOL } = require('os');
const kebabCase = require('lodash/kebabCase');
const startCase = require('lodash/startCase');
const { transformValue } = require('./value-transforms');
const { getDate } = require('../utils');
const pkg = require('../../package.json');

/**
 * Generate Header
 */
const generateHeader = dateFn => {
  return [
    `///`,
    `/// ${startCase(pkg.name)} v${pkg.version}`,
    `/// Generated ${dateFn()}`,
    `///`,
    `/// This file is generated and should be commited to source control`,
    `///`,
    EOL,
  ].join(EOL);
};

const maybeWrap = (val, type) => {
  if (type === 'font' || type === 'font-family') {
    return `unquote('#{${val}}')`;
  }
  return val;
};

/**
 * Prints a token to an annotated SCSS variable
 */
const generateToken = (token, options = {}) => {
  const { name, type, value, usage } = token;
  const { nameTransformer = kebabCase } = options;
  return [
    usage && `  /// ${usage}`,
    `  ${nameTransformer(name)}: ${maybeWrap(transformValue(value, type, options), type)},`,
    EOL,
  ]
    .filter(Boolean)
    .join(EOL);
};

const getter = () => {
  return `
@function get-token($name) {
  @if (not map-has-key($token-values, $name)) {
    @error "Token '#{$name}' does not exist.";
  }
  @return map-get($token-values, $name);
}  
`;
};

/**
 * Combines the tokens to a single string
 */
const combinator = tokens => {
  return [`// prettier-ignore`, `$token-values: (`, tokens.join(''), `);`, EOL].join(EOL);
};

/**
 * Main export that ties together all the functions
 */
const generator = (tokens, options = {}) => {
  const { dateFn = getDate, ...opts } = options;
  return [
    generateHeader(dateFn),
    combinator(tokens.map(token => generateToken(token, opts))),
    getter(),
  ]
    .join(EOL)
    .trim();
};

const extension = 'scss';

module.exports = {
  generator,
  combinator,
  generateToken,
  generateHeader,
  getDate,
  extension,
};

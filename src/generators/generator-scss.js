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
  const now = dateFn();

  return [
    `///`,
    `/// ${startCase(pkg.name)} v${pkg.version}`,
    `/// Generated ${now}`,
    `///`,
    `/// This file is generated and should be commited to source control`,
    `///`,
    EOL,
  ].join(EOL);
};

/**
 * Prints a token to an annotated SCSS variable
 */
const generateToken = (token, options = {}) => {
  const { name, type, value, usage } = token;
  const { nameTransformer = kebabCase } = options;
  return [
    usage && `/// ${usage}`,
    `$${nameTransformer(name)}: ${transformValue(value, type, options)};`,
  ]
    .filter(Boolean)
    .join(EOL);
};

/**
 * Combines the tokens to a single string
 */
const combinator = tokens => tokens.join(`${EOL}${EOL}`);

/**
 * Main export that ties together all the functions
 */
const generator = (tokens, options = {}) => {
  const { dateFn = getDate, ...opts } = options;

  return [generateHeader(dateFn), combinator(tokens.map(token => generateToken(token, opts)))].join(
    EOL,
  );
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

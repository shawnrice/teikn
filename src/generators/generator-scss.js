const { kebabCase, startCase } = require('lodash');
const { EOL } = require('os');
const { transformValue } = require('./value-transforms');
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

/**
 * Default date function that is used if another one is not passed
 */
const getDate = () => {
  const now = new Date();
  const date = now.toDateString();
  const time = [now.getHours(), now.getMinutes(), now.getSeconds()].join(':');
  return `${date} ${time}`;
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

module.exports = {
  generator,
  combinator,
  generateToken,
  generateHeader,
  getDate,
};

const camelCase = require('lodash/camelCase');
const { EOL } = require('os');

const generateToken = (token, nameTransformer = camelCase) =>
  [
    `  /**`,
    token.usage && `   *  ${token.usage}`,
    `   *  Type: ${token.type}`,
    `   */`,
    `  ${nameTransformer(token.name)}: ${maybeQuote(token.value)},`,
  ]
    .filter(Boolean)
    .map((token, index, arr) => (index === arr.length - 1 ? token.slice(0, -1) : token))
    .join(EOL);

const maybeQuote = val => (typeof val === 'string' ? `'${val}'` : val);

const combinator = tokens => ['module.exports = {', tokens.join(EOL), '}'].join(EOL);

const generator = (tokens, options = {}) => {
  const { nameTransformer = camelCase } = options;
  return combinator(tokens.map(token => generateToken(token, nameTransformer)));
};

const extension = 'js';

module.exports = {
  generateToken,
  combinator,
  generator,
  extension,
};

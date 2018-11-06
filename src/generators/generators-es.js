const { camelCase } = require('lodash');
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
    .join(EOL);

const maybeQuote = val => {
  if (typeof val === 'string') {
    return `'${val}'`;
  }
  return val;
};

const combinator = tokens => {
  const combined = tokens.join(EOL);

  return [`export const tokens = {`, combined, `};`, ``, `export default tokens;`].join(EOL);
};

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

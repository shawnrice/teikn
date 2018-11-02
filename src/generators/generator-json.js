const { camelCase } = require('lodash');

const generateToken = (token, nameTransformer) => {
  const { name, ...values } = token;
  return { [nameTransformer(name)]: values };
};

const combinator = tokens => {
  const combined = tokens.reduce((acc, token) => Object.assign(acc, token), {});
  return JSON.stringify(combined, null, 2);
};

const generator = (tokens, options = {}) => {
  const { nameTransformer = camelCase } = options;
  return combinator(tokens.map(token => generateToken(token, nameTransformer)));
};

module.exports = {
  generateToken,
  combinator,
  generator,
};

const { camelCase } = require('lodash');
const { EOL } = require('os');

const generateToken = (token, nameTransformer) => {
  const { name, ...values } = token;
  return { [nameTransformer(name)]: values };
};

const combinator = tokens => {
  const combined = tokens
    .map(token =>
      // prettier-ignore
      [
        token.usage && `/** ${token.usage} */`, 
        `${camelCase(token.name)}: ${token.value},`
      ].join(EOL)
    )
    .join(EOL);

  return `
    module.exports = {
      ${combined}
    }
  `;
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

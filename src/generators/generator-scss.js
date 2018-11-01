import { kebabCase } from 'lodash';
import { EOL } from 'os';

/**
 * Prints a token to an annotated SCSS variable
 */
export const generateToken = token => {
  const { name, value, usage } = token;
  return [usage && `/// ${usage}`, `$${kebabCase(name)}: ${value};`].filter(Boolean).join(EOL);
};

export const combinator = tokens => tokens.join(`${EOL}${EOL}`);

export const generator = tokens => combinator(tokens.map(generateToken));

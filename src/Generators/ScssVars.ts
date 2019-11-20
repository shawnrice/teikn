import { EOL } from 'os';

import { Token } from '../Token';
import ScssGenerator from './Scss';

export class ScssVarsGenerator extends ScssGenerator {
  generateToken(token: Token) {
    const { usage, name, value } = token;
    return [usage && `/// ${usage}`, `$${name}: ${value};`]
      .filter(Boolean)
      .join(EOL);
  }

  combinator(tokens: Token[]) {
    const values = tokens.map(token => this.generateToken(token));

    return values.join(EOL);
  }

  footer() {
    return null;
  }
}

export default SCSSVarsGenerator;

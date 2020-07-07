import { EOL } from 'os';

import { Token } from '../Token';
import Scss from './Scss';

export class ScssVars extends Scss {
  generateToken(token: Token): string {
    const { usage, name, value } = token;
    return [usage && `/// ${usage}`, `$${name}: ${value};`].filter(Boolean).join(EOL);
  }

  combinator(tokens: Token[]): string {
    const values = tokens.map(token => this.generateToken(token));

    return values.join(EOL);
  }

  footer(): null {
    return null;
  }
}

export default ScssVars;

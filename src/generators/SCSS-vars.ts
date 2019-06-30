import { EOL } from 'os';
import SCSSGenerator from './SCSS';
import { Token } from './Generator';

class SCSSVarsGenerator extends SCSSGenerator {
  assembleToken({ usage, key, val }: { usage?: string; key: string; val: any }) {
    // prettier-ignore
    return [
      usage && `/// ${usage}`,
      `$${key}: ${val};`,
    ]
  }

  generateToken(token: Token) {
    const { usage, key, val } = this.prepareToken(token);

    return this.assembleToken({ usage, key, val })
      .filter(Boolean)
      .join(EOL);
  }

  combinator(tokens: Token[]) {
    const values = tokens.map(t => this.generateToken(t));

    return values.join(EOL);
  }

  footer() {
    return null;
  }
}

module.exports = SCSSVarsGenerator;

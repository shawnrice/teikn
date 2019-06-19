const { EOL } = require('os');
const SCSSGenerator = require('./SCSS');
const pkg = require('../../package.json');

class SCSSVarsGenerator extends SCSSGenerator {
  assembleToken({ usage, key, val }) {
    // prettier-ignore
    return [
      usage && `/// ${usage}`,
      `$${key}: ${val};`,
    ]
  }

  generateToken(token) {
    const { usage, key, val } = this.prepareToken(token);

    return this.assembleToken({ usage, key, val })
      .filter(Boolean)
      .join(EOL);
  }

  combinator(tokens) {
    const values = tokens.map(t => this.generateToken(t));

    return values.join(EOL);
  }

  footer() {
    return null;
  }
}

module.exports = SCSSVarsGenerator;

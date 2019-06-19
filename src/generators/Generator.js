const { EOL } = require('os');

class Generator {
  constructor(opts) {
    this.options = opts;
    this.validateOptions();
  }

  validateOptions() {
    const required = { ext: 'string' };

    const errors = [];

    Object.keys(required).forEach(name => {
      const type = typeof this.options[name];
      const expected = required[name];

      if (type !== expected) {
        errors.push(`Error: received option ${name} of type ${type}; expected ${expected}.`);
      }
    });

    if (errors.length) {
      throw new Error(errors.join(EOL));
    }
  }

  get file() {
    const { ext, filename = 'tokens' } = this.options;

    return [filename, ext].join('.');
  }

  header() {
    return null;
  }

  footer() {
    return null;
  }

  generateToken(token) {
    throw new Error('You need to extend the Generator class');
  }

  combinator() {
    throw new Error('You need to extend the Generator class');
  }

  generate(tokens) {
    return [this.header(), this.combinator(tokens), this.footer()]
      .filter(Boolean)
      .join(EOL)
      .trim();
  }
}

module.exports = Generator;

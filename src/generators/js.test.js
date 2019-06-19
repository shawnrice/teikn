const startCase = require('lodash/startCase');
const { generator } = require('./generator-js');
const Generator = require('./JS');
const pkg = require('../../package.json');

describe('es5 generator tests', () => {
  const tokens = [{ name: 'test', type: 'color', value: '#CCCCCC' }];

  test('it generates things', () => {
    const output = `module.exports = {
  /**
   *  Type: color
   */
  test: '#CCCCCC'
}`;
    expect(generator(tokens)).toBe(output);
  });
});

describe('es5 tests', () => {
  const tokens = [{ name: 'test', type: 'color', value: '#CCCCCC' }];

  test('it generates things', () => {
    const output = `/**
 * ${startCase(pkg.name)} v${pkg.version}
 * Generated null
 *
 * This file is generated and should be commited to source control
 *
 */
module.exports = {
  /**
   *  Type: color
   */
  test: '#CCCCCC'
}`;
    expect(new Generator({ dateFn: () => 'null' }).generate(tokens)).toBe(output);
  });
});

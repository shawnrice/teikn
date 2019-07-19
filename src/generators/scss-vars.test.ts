import Generator from './SCSS-vars';
import { Token } from './Token';
const startCase = require('lodash/startCase');
const pkg = require('../../package.json');

describe('SCSS Vars Generator tests', () => {
  test('It has the correct filename', () => {
    expect(new Generator().file).toBe('tokens.scss');
  });

  test('It generates the token set', () => {
    const tokens: Token[] = [
      { name: 'test', type: 'font-family', usage: 'standard font', value: 'Helvetica' },
      { name: 'test2', type: 'color', value: '#CCC' },
    ];
    const value = `///
/// ${startCase(pkg.name)} v${pkg.version}
/// Generated null
///
/// This file is generated and should be commited to source control
///


/// standard font
$test: unquote('#{Helvetica}');
$test-2: rgba(204, 204, 204, 1);`;
    const generator = new Generator({ dateFn: () => 'null', color: 'RGBA' });
    const input = generator.generate(tokens);
    expect(input).toBe(value);
  });
});

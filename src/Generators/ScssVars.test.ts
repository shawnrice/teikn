import { default as tokenSet1 } from '../fixtures/tokenSet1';
import Generator from './ScssVars';

describe('SCSS Vars Generator tests', () => {
  test('It has the correct filename', () => {
    expect(new Generator().file).toBe('tokens.scss');
  });

  test('It generates the token set', () => {
    expect(new Generator({ dateFn: () => 'null' }).generate(tokenSet1)).toMatchSnapshot();
  });
});

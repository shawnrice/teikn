import { default as tokenSet1 } from '../fixtures/tokenSet1';
import Generator from './SCSS-vars';

describe('SCSS Vars Generator tests', () => {
  test('It has the correct filename', () => {
    expect(new Generator().file).toBe('tokens.scss');
  });

  test('It generates the token set', () => {
    expect(
      new Generator({ dateFn: () => 'null', color: 'RGBA' }).generate(
        tokenSet1,
      ),
    ).toMatchSnapshot();
    // expect(input).toBe(value);
  });
});
import { default as tokenSet1 } from '../fixtures/tokenSet1';
import Generator from './JavaScript';

describe('es5 tests', () => {
  test('it generates things', () => {
    expect(new Generator({ dateFn: () => 'null' }).generate(tokenSet1)).toMatchSnapshot();
  });
});

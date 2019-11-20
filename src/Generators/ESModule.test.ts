import { default as tokenSet1 } from '../fixtures/tokenSet1';
import Generator from './ESModule';

describe('ESModule tests', () => {
  test('it generates tokens as an esmodule', () => {
    expect(new Generator({ dateFn: () => 'null' }).generate(tokenSet1)).toMatchSnapshot();
  });
});

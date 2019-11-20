import { default as tokenSet1 } from '../fixtures/tokenSet1';
import Generator from './TypeScript';

describe('TypeScript generator tests', () => {
  test('It matches the TypeScript snapshot', () => {
    expect(
      new Generator({ dateFn: () => 'null' }).generate(tokenSet1),
    ).toMatchSnapshot();
  });
});

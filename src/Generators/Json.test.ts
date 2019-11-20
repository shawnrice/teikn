import { default as tokenSet1 } from '../fixtures/tokenSet1';
import Generator from './Json';

describe('JSONGenerator tests', () => {
  test('It generates the token set', () => {
    expect(new Generator().generate(tokenSet1)).toMatchSnapshot();
  });
});

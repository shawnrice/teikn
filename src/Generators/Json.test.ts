import { describe, expect, test } from 'bun:test';

import tokenSet1 from '../fixtures/tokenSet1';
import Generator from './Json';

describe('JSONGenerator tests', () => {
  test('It generates the token set', () => {
    expect(new Generator().generate(tokenSet1)).toMatchSnapshot();
  });

  test('describe returns JSON format info', () => {
    const gen = new Generator();
    const info = gen.describe();
    expect(info.format).toBe('JSON');
    expect(info.usage).toContain('fetch');
  });
});

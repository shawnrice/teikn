import { describe, expect, test } from 'bun:test';

import tokenSet1 from '../fixtures/tokenSet1';
import type { Token } from '../Token';
import Generator from './ESModule';

describe('ESModule tests', () => {
  test('it generates tokens as an esmodule', () => {
    expect(new Generator({ dateFn: () => 'null' }).generate(tokenSet1)).toMatchSnapshot();
  });

  test('it generates group accessors when groups: true', () => {
    const tokens: Token[] = [
      { name: 'colorPrimary', type: 'color', value: 'aliceblue' },
      { name: 'colorSecondary', type: 'color', value: 'rgb(102, 205, 170)' },
      { name: 'spacingSm', type: 'spacing', value: '4px' },
    ];
    expect(
      new Generator({ dateFn: () => 'null', groups: true }).generate(tokens),
    ).toMatchSnapshot();
  });
});

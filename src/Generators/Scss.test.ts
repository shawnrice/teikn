import { describe, expect, test } from 'bun:test';

import tokenSet1 from '../fixtures/tokenSet1';
import { ColorTransformPlugin } from '../Plugins/ColorTransformPlugin';
import { PrefixTypePlugin } from '../Plugins/PrefixTypePlugin';
import { SCSSQuoteValuePlugin } from '../Plugins/SCSSQuoteValuePlugin';
import type { Token } from '../Token';
import Generator from './Scss';

describe('SCSSGenerator tests', () => {
  test('It has the correct filename', () => {
    expect(new Generator().file).toBe('tokens.scss');
  });

  test('It generates the token set', () => {
    expect(
      new Generator({ dateFn: () => 'null' }).generate(tokenSet1, [
        new ColorTransformPlugin({ type: 'rgba' }),
        new SCSSQuoteValuePlugin(),
        new PrefixTypePlugin(),
      ]),
    ).toMatchSnapshot();
  });

  test('it generates group maps and functions when groups: true', () => {
    const tokens: Token[] = [
      { name: 'colorPrimary', type: 'color', value: 'aliceblue' },
      { name: 'colorSecondary', type: 'color', value: 'rgb(102, 205, 170)' },
      { name: 'spacingSm', type: 'spacing', value: '4px' },
    ];
    expect(
      new Generator({ dateFn: () => 'null', groups: true }).generate(tokens),
    ).toMatchSnapshot();
  });

  test('it generates groups with PrefixTypePlugin', () => {
    expect(
      new Generator({ dateFn: () => 'null', groups: true }).generate(tokenSet1, [
        new ColorTransformPlugin({ type: 'rgba' }),
        new SCSSQuoteValuePlugin(),
        new PrefixTypePlugin(),
      ]),
    ).toMatchSnapshot();
  });
});

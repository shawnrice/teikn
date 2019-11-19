import { default as tokenSet1 } from '../fixtures/tokenSet1';
import { ColorTransformPlugin } from '../Plugins/ColorTransformPlugin';
import { PrefixTypePlugin } from '../Plugins/PrefixTypePlugin';
import { SCSSQuoteValuePlugin } from '../Plugins/SCSSQuoteValuePlugin';
import Generator from './SCSS';

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
});

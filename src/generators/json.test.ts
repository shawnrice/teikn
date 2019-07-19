import Generator from './JSON';
import { Token } from './Token';

describe('JSONGenerator tests', () => {
  test('It generates the token set', () => {
    const tokens: Token[] = [{ name: 'test', type: 'font', value: true }, { name: 'test2', type: 'color', value: '#CCC' }];
    const value = `{
  "test": {
    "type": "font",
    "value": true
  },
  "test2": {
    "type": "color",
    "value": "#CCC"
  }
}`;
    const generator = new Generator();
    const input = generator.generate(tokens);
    expect(input).toBe(value);
  });
});

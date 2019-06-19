const { generateToken, generator } = require('./generator-map-scss');

describe('mapScss generator tests', () => {
  test('It generates a token correctly', () => {
    const output = `test: #CCCCCC,`;
    const input = generateToken({ name: 'test', value: '#CCCCCC' }).trim();
    expect(input).toBe(output);
  });

  test('It responds to type annotation a token correctly', () => {
    const output = `test: #cccccc,`;
    const input = generateToken({ name: 'test', type: 'color', value: '#CCCCCC' }).trim();
    expect(input).toBe(output);
  });

  test('It generates output correctly', () => {
    const output = `///
/// Teikn v0.1.5
/// Generated null
///
/// This file is generated and should be commited to source control
///


// prettier-ignore
$token-values: (
  test: #cccccc,


);



@function get-token($name) {
  @if (not map-has-key($token-values, $name)) {
    @error \"Token '#{$name}' does not exist.\";
  }
  @return map-get($token-values, $name);
}`;
    const input = generator([{ name: 'test', type: 'color', value: '#CCCCCC' }], {
      dateFn: () => 'null',
    });
    expect(input).toBe(output);
  });
});

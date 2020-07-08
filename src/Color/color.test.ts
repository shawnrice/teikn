import { Color, round, roundHSL } from './Color';
import { hexToRGB } from './hexToRGB';
import { HSLToHex } from './HSLToHex';
import { HSLToRGB } from './HSLToRGB';
import { RGBToHex } from './RGBToHex';
import { RGBToHSL } from './RGBToHSL';
import { stringToRGBA } from './stringToRGBA';

describe('Color tests', () => {
  test('hexToRGB translates #ffffff', () => {
    expect(hexToRGB('#ffffff')).toEqual([255, 255, 255]);
  });

  test('hexToRGB translates #fff', () => {
    expect(hexToRGB('#fff')).toEqual([255, 255, 255]);
  });

  test('rgbToHex translates 255, 255, 255 to #ffffff', () => {
    expect(RGBToHex(255, 255, 255)).toBe('ffffff');
  });

  test('You can construct a color from a color', () => {
    expect(new Color(new Color('blue')).toString('named')).toBe('blue');
  });

  test('You can use Color.from', () => {
    expect(Color.from(new Color('blue')).toString('named')).toBe('blue');
  });

  test('inverting a color works', () => {
    expect(new Color('blue').invert().asRGB()).toEqual([255, 255, 0]);
  });

  test('rotating the hue works', () => {
    expect(new Color('red').rotateHue(120).toString('hex')).toBe('#00ff00');
  });

  test('stringToRGBA translates "transparent" to [0, 0, 0, 0]', () => {
    expect(stringToRGBA('transparent')).toEqual([0, 0, 0, 0]);
  });

  test('stringToRGBA translates "aliceblue" to [240, 248, 255, 1]', () => {
    expect(stringToRGBA('aliceblue')).toEqual([240, 248, 255, 1]);
  });

  test('RGBToHSL converts rgb(240, 155, 233) to hsl(305, 74%, 77%)', () => {
    expect(roundHSL([...RGBToHSL(240, 155, 233)])).toEqual([305, 0.74, 0.77]);
  });

  test('Color("aliceblue") can convert to HSLA', () => {
    expect(new Color('aliceblue').toString('hsla')).toBe('hsla(208, 100%, 97%, 1)');
  });

  test('RGBToHSL -> HSLToRGB is non-destructive', () => {
    expect(HSLToRGB(...RGBToHSL(33, 55, 99))).toEqual([33, 55, 99]);
  });

  test('Can set red channel', () => {
    expect(new Color(0, 0, 0, 1).setRed(255).toString('named')).toBe('red');
  });

  test('Can set blue channel', () => {
    expect(new Color(0, 0, 0, 1).setBlue(255).toString('named')).toBe('blue');
  });

  test('Can set green channel', () => {
    expect(new Color(0, 0, 0, 1).setGreen(128).toString('named')).toBe('green');
  });

  test('Can set alpha channel', () => {
    expect(new Color(0, 0, 0, 0).setAlpha(0.5).toString()).toBe('rgba(0, 0, 0, 0.5)');
  });

  test('HSLToHex works', () => {
    expect(HSLToHex(0, 0, 0)).toBe('000000');
  });

  test('stringToRGBA works with an rgb string', () => {
    expect(stringToRGBA('rgb(55, 95, 155)')).toEqual([55, 95, 155, 1]);
  });

  test('rgb(black) conversion works', () => {
    expect(new Color('black').toString('hex3')).toEqual('#000');
  });

  test('Setting Hue works', () => {
    expect(new Color('green').setHue(200).toString()).toEqual('rgb(0, 85, 128)');
  });

  test('Setting Saturation works', () => {
    expect(new Color('green').setSaturation(0.5).toString()).toEqual('rgb(32, 96, 32)');
  });

  test('Setting lightness works', () => {
    expect(new Color('white').setLightness(0).toString('named')).toBe('black');
  });

  test('manually lightening works', () => {
    expect(
      (() => {
        const [h, s] = RGBToHSL(0, 0, 0);
        return HSLToRGB(h, s, 1);
      })(),
    ).toEqual([255, 255, 255]);
  });

  test('HSL colors white works', () => {
    expect(new Color('white').toString('hsl')).toBe('hsl(0, 0%, 100%)');
  });

  test('HSL colors black works', () => {
    expect(new Color('black').toString('hsl')).toBe('hsl(0, 0%, 0%)');
  });

  test('an alternative constructor works', () => {
    expect(new Color(0xff, 0xff, 0xff).toString('named')).toBe('white');
  });

  test('yet another alternative constructor works', () => {
    expect(new Color(255, 0, 0).toString('named')).toBe('red');
  });

  test('not enough args throws an error', () => {
    // @ts-ignore: this is supposed to be a failing test
    expect(() => new Color(255)).toThrow();
  });

  test('rgb black to hsl works', () => {
    expect(RGBToHSL(0, 0, 0)).toEqual([0, 0, 0]);
  });

  test('rgb white to hsl works', () => {
    expect(RGBToHSL(255, 255, 255)).toEqual([0, 0, 1]);
  });

  test('Darkening colors works', () => {
    expect(new Color('#036').darken(0.3).toString('hex')).toEqual('#002447');
  });

  test('Darken colors 2', () => {
    expect(new Color('#b37399').darken(0.2).toString('hex')).toBe('#98537c');
  });

  test('Darken colors 3', () => {
    expect(new Color('#f2ece4').darken(0.4).toString('hex')).toBe('#b59365');
  });

  test('Lightening colors works', () => {
    expect(new Color('black').lighten(1).toString('hex')).toEqual('#000000');
  });

  test('Darkening white works', () => {
    expect(new Color('white').darken(1).toString('hex')).toEqual('#000000');
  });

  test('Adding colors works', () => {
    expect(new Color('white').mix('black').toString('hex')).toEqual('#808080');
  });

  test('complementing a color works', () => {
    expect(new Color('#6b717f').complement().toString('hex')).toBe('#7f796b');
  });

  test('complementing a color works 2', () => {
    expect(new Color('#d2e1dd').complement().toString('hex')).toBe('#e1d2d6');
  });

  test('complementing a color works 3', () => {
    expect(new Color('#036').complement().toString('hex')).toBe('#663300');
  });

  test('Getting hue works', () => {
    expect(round(0, new Color('#abcabc').hue)).toEqual(153);
  });

  test('Getting saturation works', () => {
    expect(round(2, new Color('#abcabc').saturation)).toEqual(0.23);
  });

  test('Getting lightness works', () => {
    expect(round(2, new Color('#abcabc').lightness)).toEqual(0.73);
  });

  test('Getting named colors works', () => {
    expect(new Color('#ffffff').toString('named')).toBe('white');
  });

  test('Getting named black color works', () => {
    expect(new Color('#000000').toString('named')).toBe('black');
  });

  test('Getting named transparent works', () => {
    expect(new Color('transparent').toString('named')).toBe('transparent');
  });

  test('test lightening green', () => {
    expect(new Color('green').lighten(0.5).toString()).toBe('rgb(0, 192, 0)');
  });

  test('hsl with lightness 0 is black', () => {
    expect(HSLToRGB(300, 0.5, 0)).toEqual([0, 0, 0]);
  });

  test('rgb as a string works', () => {
    expect(new Color('blue').toString('rgb')).toBe('rgb(0, 0, 255)');
  });

  test('color luminance works', () => {
    expect(round(4, new Color('aliceblue').luminance())).toBe(round(4, 0.9288));
  });

  test('color luminance works 2', () => {
    expect(round(4, new Color('#5342af').luminance())).toBe(round(4, 0.0883));
  });

  test('calling it with not a color throws', () => {
    expect(() => new Color('i am not a color')).toThrow();
  });

  test('calling it with a bad rgb value throws', () => {
    expect(() => new Color('rgb(256, 268, 399)')).toThrow();
  });

  test('tinting black with white 1 produces white', () => {
    expect(new Color('black').tint(1).toString('hex')).toBe('#ffffff');
  });

  test('tinting black 10% works', () => {
    expect(new Color('black').tint(0.1).toString('hex')).toBe('#1a1a1a');
  });

  test('tinting black 90% works', () => {
    expect(new Color('black').tint(0.9).toString('hex')).toBe('#e6e6e6');
  });

  test('tinting black with white .5 produces gray', () => {
    expect(new Color('black').tint(0.5).toString('hex')).toBe('#808080');
  });

  test('shading a color works', () => {
    expect(new Color('white').shade(0.5).toString('hex')).toBe('#808080');
  });

  test('shading white 10% works', () => {
    expect(new Color('white').shade(0.1).toString('hex')).toBe('#e6e6e6');
  });

  test('shading white 90% works', () => {
    expect(new Color('white').shade(0.9).toString('hex')).toBe('#1a1a1a');
  });

  test('contrast ratio works', () => {
    expect(new Color('white').contrastRatio(new Color('black'))).toBe(21);
  });

  test('contrast ratio works 2', () => {
    expect(round(2, new Color('aliceblue').contrastRatio(new Color('steelblue')))).toBe(3.83);
  });

  test('checks for wcag2 compliance failure', () => {
    expect(new Color('aliceblue').isTextWCAG2CompliantWith(new Color('steelblue'), false)).toBe(
      false,
    );
  });

  test('checks for wcag2 compliance pass', () => {
    expect(new Color('aliceblue').isTextWCAG2CompliantWith(new Color('steelblue'), true)).toBe(
      true,
    );
  });

  test('checks for wgac3 compliance failure', () => {
    expect(new Color('aliceblue').isTextWCAG3CompliantWith(new Color('steelblue'), true)).toBe(
      false,
    );
  });

  test('checks for wcagUI compliance pass', () => {
    expect(new Color('aliceblue').isUIWCAGCompliantWith(new Color('steelblue'))).toBe(true);
  });
});

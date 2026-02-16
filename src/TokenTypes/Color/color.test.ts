import { describe, expect, test } from 'bun:test';

import { Color } from './Color';
import {
  hexToRGB,
  HSLToHex,
  HSLToRGB,
  LABToLCH,
  LABToXYZ,
  LCHToLAB,
  RGBToHex,
  RGBToHSL,
  RGBToXYZ,
  XYZToLAB,
  XYZToRGB,
} from './conversions';
import { stringToRGBA } from './stringToRGBA';
import { round, roundHSL } from './util';

describe('Color tests', () => {
  // ─── Conversion function tests ───────────────────────────

  test('RGBToXYZ correctly converts', () => {
    const result = RGBToXYZ([55, 192, 122]);
    expect(result[0]).toBeCloseTo(0.23935776325367514, 12);
    expect(result[1]).toBeCloseTo(0.3991391182137695, 12);
    expect(result[2]).toBeCloseTo(0.24851266776484887, 12);
  });

  test('Symmetrical conversion from RGB -> XYZ -> RGB', () => {
    expect(XYZToRGB(RGBToXYZ([55, 192, 122]))).toEqual([55, 192, 122]);
  });

  test('Symmetrical conversion from XYZ -> RGB -> XYZ', () => {
    const result = RGBToXYZ(XYZToRGB([0.5, 0.5, 0.5]));
    // RGB rounds to integers, so some precision is lost in the round-trip
    result.forEach(val => {
      expect(val).toBeCloseTo(0.5, 1);
    });
  });

  test('hexToRGB translates #ffffff', () => {
    expect(hexToRGB('#ffffff')).toEqual([255, 255, 255]);
  });

  test('hexToRGB translates #fff', () => {
    expect(hexToRGB('#fff')).toEqual([255, 255, 255]);
  });

  test('RGBToHex translates [255, 255, 255] to ffffff', () => {
    expect(RGBToHex([255, 255, 255])).toBe('ffffff');
  });

  test('RGBToHSL converts [240, 155, 233] to hsl(305, 74%, 77%)', () => {
    expect(roundHSL([...RGBToHSL([240, 155, 233])])).toEqual([305, 0.74, 0.77]);
  });

  test('RGBToHSL -> HSLToRGB is non-destructive', () => {
    expect(HSLToRGB(RGBToHSL([33, 55, 99]))).toEqual([33, 55, 99]);
  });

  test('HSLToHex works', () => {
    expect(HSLToHex([0, 0, 0])).toBe('000000');
  });

  test('rgb black to hsl works', () => {
    expect(RGBToHSL([0, 0, 0])).toEqual([0, 0, 0]);
  });

  test('rgb white to hsl works', () => {
    expect(RGBToHSL([255, 255, 255])).toEqual([0, 0, 1]);
  });

  test('manually lightening works', () => {
    expect(
      (() => {
        const [h, s] = RGBToHSL([0, 0, 0]);
        return HSLToRGB([h, s, 1]);
      })(),
    ).toEqual([255, 255, 255]);
  });

  test('hsl with lightness 0 is black', () => {
    expect(HSLToRGB([300, 0.5, 0])).toEqual([0, 0, 0]);
  });

  // ─── stringToRGBA tests ──────────────────────────────────

  test('stringToRGBA translates "transparent" to [0, 0, 0, 0]', () => {
    expect(stringToRGBA('transparent')).toEqual([0, 0, 0, 0]);
  });

  test('stringToRGBA translates "aliceblue" to [240, 248, 255, 1]', () => {
    expect(stringToRGBA('aliceblue')).toEqual([240, 248, 255, 1]);
  });

  test('stringToRGBA works with an rgb string', () => {
    expect(stringToRGBA('rgb(55, 95, 155)')).toEqual([55, 95, 155, 1]);
  });

  // ─── Constructor tests ───────────────────────────────────

  test('You can construct a color from a color', () => {
    expect(new Color(new Color('blue')).toString('named')).toBe('blue');
  });

  test('You can use Color.from', () => {
    expect(Color.from(new Color('blue')).toString('named')).toBe('blue');
  });

  test('an alternative constructor works', () => {
    expect(new Color(0xff, 0xff, 0xff).toString('named')).toBe('white');
  });

  test('yet another alternative constructor works', () => {
    expect(new Color(255, 0, 0).toString('named')).toBe('red');
  });

  test('not enough args throws an error', () => {
    // @ts-expect-error: this is supposed to be a failing test
    expect(() => new Color(255)).toThrow();
  });

  test('calling it with not a color throws', () => {
    expect(() => new Color('i am not a color')).toThrow();
  });

  test('calling it with a bad rgb value throws', () => {
    expect(() => new Color('rgb(256, 268, 399)')).toThrow();
  });

  // ─── Property getter tests ──────────────────────────────

  test('Getting hue works', () => {
    expect(round(0, new Color('#abcabc').hue)).toEqual(153);
  });

  test('Getting saturation works', () => {
    expect(round(2, new Color('#abcabc').saturation)).toEqual(0.23);
  });

  test('Getting lightness works', () => {
    expect(round(2, new Color('#abcabc').lightness)).toEqual(0.73);
  });

  test('backward-compatible red/green/blue getters work', () => {
    const c = new Color('aliceblue');
    expect(c.red).toBe(240);
    expect(c.green).toBe(248);
    expect(c.blue).toBe(255);
    expect(c.alpha).toBe(1);
  });

  // ─── Format conversion tests ─────────────────────────────

  test('Color("aliceblue") can convert to HSLA', () => {
    expect(new Color('aliceblue').toString('hsla')).toBe('hsla(208, 100%, 97%, 1)');
  });

  test('HSL colors white works', () => {
    expect(new Color('white').toString('hsl')).toBe('hsl(0, 0%, 100%)');
  });

  test('HSL colors black works', () => {
    expect(new Color('black').toString('hsl')).toBe('hsl(0, 0%, 0%)');
  });

  test('rgb(black) conversion works', () => {
    expect(new Color('black').toString('hex3')).toEqual('#000');
  });

  test('rgb as a string works', () => {
    expect(new Color('blue').toString('rgb')).toBe('rgb(0, 0, 255)');
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

  // ─── xkcd named colors ─────────────────────────────────

  test('Parsing xkcd: prefix constructs the correct color', () => {
    const c = new Color('xkcd:cerulean');
    expect(c.toString('hex')).toBe('#0485d1');
  });

  test('Parsing xkcd: prefix is case-insensitive', () => {
    const c = new Color('XKCD:Cerulean');
    expect(c.toString('hex')).toBe('#0485d1');
  });

  test('Unknown xkcd color throws', () => {
    expect(() => new Color('xkcd:notacolor')).toThrow('Unknown xkcd color');
  });

  test('toString("xkcd") returns closest xkcd color name', () => {
    // xkcd "red" is #e50000, so pure #ff0000 is closest to "fire engine red" (#fe0002)
    const c = new Color('#ff0000');
    expect(c.toString('xkcd')).toBe('fire engine red');
  });

  test('toString("xkcd") round-trips with xkcd: prefix', () => {
    const name = new Color('xkcd:dusty rose').toString('xkcd');
    expect(name).toBe('dusty rose');
  });

  test('toJSON works as expected', () => {
    expect(new Color('white').toJSON()).toBe('rgb(255, 255, 255)');
  });

  // ─── RGB mutation tests ──────────────────────────────────

  test('inverting a color works', () => {
    expect(new Color('blue').invert().asRGB()).toEqual([255, 255, 0]);
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

  // ─── HSL mutation tests ──────────────────────────────────

  test('Setting Hue works', () => {
    expect(new Color('green').setHue(200).toString()).toEqual('rgb(0, 85, 128)');
  });

  test('Setting Saturation works', () => {
    expect(new Color('green').setSaturation(0.5).toString()).toEqual('rgb(32, 96, 32)');
  });

  test('Setting lightness works', () => {
    expect(new Color('white').setLightness(0).toString('named')).toBe('black');
  });

  test('rotating the hue works', () => {
    expect(new Color('red').rotateHue(120).toString('hex')).toBe('#00ff00');
  });

  test('rotateHue handles negative values', () => {
    const c = new Color('red');
    expect(c.rotateHue(-10).hue).toBeGreaterThanOrEqual(0);
    expect(c.rotateHue(-10).hue).toBeLessThan(360);
  });

  test('test lightening green', () => {
    expect(new Color('green').lighten(0.5).toString()).toBe('rgb(0, 192, 0)');
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

  test('complementing a color works', () => {
    expect(new Color('#6b717f').complement().toString('hex')).toBe('#7f796b');
  });

  test('complementing a color works 2', () => {
    expect(new Color('#d2e1dd').complement().toString('hex')).toBe('#e1d2d6');
  });

  test('complementing a color works 3', () => {
    expect(new Color('#036').complement().toString('hex')).toBe('#663300');
  });

  // ─── Mix / tint / shade tests ────────────────────────────

  test('Adding colors works', () => {
    expect(new Color('white').mix('black').toString('hex')).toEqual('#808080');
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

  // ─── Luminance & contrast tests ──────────────────────────

  test('color luminance works', () => {
    expect(round(4, new Color('aliceblue').luminance())).toBe(round(4, 0.9288));
  });

  test('color luminance works 2', () => {
    expect(round(4, new Color('#5342af').luminance())).toBe(round(4, 0.0883));
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

// ─── Factory method tests ──────────────────────────────────

describe('Factory methods', () => {
  test('Color.fromRGB with separate args', () => {
    const c = Color.fromRGB(255, 0, 0);
    expect(c.red).toBe(255);
    expect(c.green).toBe(0);
    expect(c.blue).toBe(0);
  });

  test('Color.fromRGB with tuple', () => {
    const c = Color.fromRGB([240, 248, 255]);
    expect(c.toString('named')).toBe('aliceblue');
  });

  test('Color.fromHSL with separate args', () => {
    const c = Color.fromHSL(0, 1, 0.5);
    expect(c.toString('named')).toBe('red');
  });

  test('Color.fromHSL with tuple', () => {
    const c = Color.fromHSL([120, 1, 0.25098039215686274]);
    expect(c.toString('named')).toBe('green');
  });

  test('Color.fromLAB with separate args', () => {
    const c = Color.fromLAB(50, 20, -30);
    expect(c.asLAB()).toEqual([50, 20, -30]);
  });

  test('Color.fromLAB with tuple', () => {
    const c = Color.fromLAB([50, 20, -30]);
    expect(c.asLAB()).toEqual([50, 20, -30]);
  });

  test('Color.fromLCH with separate args', () => {
    const c = Color.fromLCH(50, 30, 200);
    expect(c.asLCH()).toEqual([50, 30, 200]);
  });

  test('Color.fromLCH with tuple', () => {
    const c = Color.fromLCH([50, 30, 200]);
    expect(c.asLCH()).toEqual([50, 30, 200]);
  });

  test('Color.fromXYZ with separate args', () => {
    const c = Color.fromXYZ(0.5, 0.5, 0.5);
    expect(c.asXYZ()).toEqual([0.5, 0.5, 0.5]);
  });

  test('Color.fromXYZ with tuple', () => {
    const c = Color.fromXYZ([0.5, 0.5, 0.5]);
    expect(c.asXYZ()).toEqual([0.5, 0.5, 0.5]);
  });

  test('Color.fromRGB with alpha', () => {
    const c = Color.fromRGB(255, 0, 0, 0.5);
    expect(c.alpha).toBe(0.5);
  });
});

// ─── Round-trip precision tests ────────────────────────────

describe('Round-trip precision', () => {
  test('LAB round-trip returns exact input', () => {
    const c = Color.fromLAB(50, 20, -30);
    expect(c.asLAB()).toEqual([50, 20, -30]);
  });

  test('LCH round-trip returns exact input', () => {
    const c = Color.fromLCH(50, 30, 200);
    expect(c.asLCH()).toEqual([50, 30, 200]);
  });

  test('XYZ round-trip returns exact input', () => {
    const c = Color.fromXYZ(0.3, 0.4, 0.5);
    expect(c.asXYZ()).toEqual([0.3, 0.4, 0.5]);
  });

  test('HSL round-trip returns exact input', () => {
    const c = Color.fromHSL(200, 0.5, 0.6);
    expect(c.asHSL()).toEqual([200, 0.5, 0.6]);
  });

  test('HSL hue access does not require RGB round-trip', () => {
    const c = Color.fromHSL(200, 0.5, 0.6);
    expect(c.hue).toBe(200);
  });

  test('XYZ -> LAB -> LCH -> LAB -> XYZ round-trip is stable', () => {
    const xyz = RGBToXYZ([100, 150, 200]);
    const lab = XYZToLAB(xyz);
    const lch = LABToLCH(lab);
    const lab2 = LCHToLAB(lch);
    const xyz2 = LABToXYZ(lab2);
    // Check round-trip within floating-point tolerance
    xyz2.forEach((val, i) => {
      expect(val).toBeCloseTo(xyz[i], 10);
    });
  });
});

// ─── Output method tests ───────────────────────────────────

describe('Output methods', () => {
  test('asXYZ returns XYZ tuple', () => {
    const c = new Color('white');
    const xyz = c.asXYZ();
    expect(xyz).toHaveLength(3);
    expect(xyz[1]).toBeCloseTo(1.0, 1);
  });

  test('asXYZA includes alpha', () => {
    const c = Color.fromRGB(255, 255, 255, 0.5);
    const xyza = c.asXYZA();
    expect(xyza).toHaveLength(4);
    expect(xyza[3]).toBe(0.5);
  });

  test('asLAB returns LAB tuple', () => {
    const c = new Color('white');
    const lab = c.asLAB();
    expect(lab).toHaveLength(3);
    expect(lab[0]).toBeCloseTo(100, 0);
  });

  test('asLABA includes alpha', () => {
    const c = Color.fromRGB(255, 255, 255, 0.7);
    const laba = c.asLABA();
    expect(laba).toHaveLength(4);
    expect(laba[3]).toBe(0.7);
  });

  test('asLCH returns LCH tuple', () => {
    const c = new Color('red');
    const lch = c.asLCH();
    expect(lch).toHaveLength(3);
    expect(lch[0]).toBeGreaterThan(0);
  });

  test('asLCHA includes alpha', () => {
    const c = Color.fromRGB(255, 0, 0, 0.3);
    const lcha = c.asLCHA();
    expect(lcha).toHaveLength(4);
    expect(lcha[3]).toBe(0.3);
  });

  test('toString("lab") produces lab() string', () => {
    const c = new Color('white');
    expect(c.toString('lab')).toMatch(/^lab\(/);
  });

  test('toString("lch") produces lch() string', () => {
    const c = new Color('red');
    expect(c.toString('lch')).toMatch(/^lch\(/);
  });

  test('toString("xyz") produces xyz() string', () => {
    const c = new Color('blue');
    expect(c.toString('xyz')).toMatch(/^xyz\(/);
  });

  test('sub-API toString() works for lab', () => {
    const c = new Color('white');
    expect(c.lab.toString()).toMatch(/^lab\(/);
  });

  test('sub-API toString() works for lch', () => {
    const c = new Color('red');
    expect(c.lch.toString()).toMatch(/^lch\(/);
  });

  test('sub-API toString() works for xyz', () => {
    const c = new Color('blue');
    expect(c.xyz.toString()).toMatch(/^xyz\(/);
  });

  test('sub-API toString() works in template literals', () => {
    const c = new Color(255, 0, 0);
    expect(`${c.rgb}`).toBe('rgb(255, 0, 0)');
    expect(`${c.hsl}`).toBe('hsl(0, 100%, 50%)');
  });
});

// ─── Space-scoped sub-API tests ────────────────────────────

describe('Space-scoped sub-APIs', () => {
  test('rgb.red() getter returns value', () => {
    const c = new Color(200, 100, 50);
    expect(c.rgb.red()).toBe(200);
  });

  test('rgb.red(value) setter returns new Color', () => {
    const c = new Color(200, 100, 50);
    const c2 = c.rgb.red(100);
    expect(c2.red).toBe(100);
    expect(c.red).toBe(200); // original unchanged
  });

  test('rgb.green() getter and setter', () => {
    const c = new Color(200, 100, 50);
    expect(c.rgb.green()).toBe(100);
    expect(c.rgb.green(200).green).toBe(200);
  });

  test('rgb.blue() getter and setter', () => {
    const c = new Color(200, 100, 50);
    expect(c.rgb.blue()).toBe(50);
    expect(c.rgb.blue(150).blue).toBe(150);
  });

  test('hsl.hue() getter and setter', () => {
    const c = new Color('red');
    expect(c.hsl.hue()).toBe(0);
    const c2 = c.hsl.hue(120);
    expect(c2.hsl.hue()).toBe(120);
  });

  test('hsl.saturation() getter and setter', () => {
    const c = new Color('red');
    expect(c.hsl.saturation()).toBe(1);
    const c2 = c.hsl.saturation(0.5);
    expect(c2.hsl.saturation()).toBe(0.5);
  });

  test('hsl.lightness() getter and setter', () => {
    const c = new Color('red');
    expect(c.hsl.lightness()).toBe(0.5);
    const c2 = c.hsl.lightness(0.8);
    expect(c2.hsl.lightness()).toBe(0.8);
  });

  test('hsl.rotateHue works', () => {
    const c = new Color('red');
    expect(c.hsl.rotateHue(120).toString('hex')).toBe('#00ff00');
  });

  test('hsl.complement works', () => {
    const c = new Color('red');
    expect(c.hsl.complement().hsl.hue()).toBe(180);
  });

  test('hsl.lighten and darken work', () => {
    const c = new Color('green');
    const lightened = c.hsl.lighten(0.5);
    expect(lightened.lightness).toBeGreaterThan(c.lightness);
    const darkened = c.hsl.darken(0.5);
    expect(darkened.lightness).toBeLessThan(c.lightness);
  });

  test('lab.lightness() getter and setter', () => {
    const c = Color.fromLAB(50, 20, -30);
    expect(c.lab.lightness()).toBe(50);
    const c2 = c.lab.lightness(70);
    expect(c2.lab.lightness()).toBe(70);
  });

  test('lab.a() getter and setter', () => {
    const c = Color.fromLAB(50, 20, -30);
    expect(c.lab.a()).toBe(20);
    const c2 = c.lab.a(40);
    expect(c2.lab.a()).toBe(40);
  });

  test('lab.b() getter and setter', () => {
    const c = Color.fromLAB(50, 20, -30);
    expect(c.lab.b()).toBe(-30);
    const c2 = c.lab.b(-10);
    expect(c2.lab.b()).toBe(-10);
  });

  test('lab.mix works', () => {
    const c1 = Color.fromLAB(50, 20, -30);
    const c2 = Color.fromLAB(80, -10, 40);
    const mixed = c1.lab.mix(c2, 0.5);
    expect(mixed.asLAB()[0]).toBeCloseTo(65, 0);
  });

  test('lab.lighten and darken work', () => {
    const c = Color.fromLAB(50, 20, -30);
    const lighter = c.lab.lighten(0.2);
    expect(lighter.asLAB()[0]).toBeGreaterThan(50);
    const darker = c.lab.darken(0.2);
    expect(darker.asLAB()[0]).toBeLessThan(50);
  });

  test('lch.lightness() getter and setter', () => {
    const c = Color.fromLCH(50, 30, 200);
    expect(c.lch.lightness()).toBe(50);
    const c2 = c.lch.lightness(70);
    expect(c2.lch.lightness()).toBe(70);
  });

  test('lch.chroma() getter and setter', () => {
    const c = Color.fromLCH(50, 30, 200);
    expect(c.lch.chroma()).toBe(30);
    const c2 = c.lch.chroma(60);
    expect(c2.lch.chroma()).toBe(60);
  });

  test('lch.hue() getter and setter', () => {
    const c = Color.fromLCH(50, 30, 200);
    expect(c.lch.hue()).toBe(200);
    const c2 = c.lch.hue(300);
    expect(c2.lch.hue()).toBe(300);
  });

  test('lch.rotateHue works', () => {
    const c = Color.fromLCH(50, 30, 100);
    expect(c.lch.rotateHue(180).lch.hue()).toBe(280);
  });

  test('lch.complement works', () => {
    const c = Color.fromLCH(50, 30, 100);
    expect(c.lch.complement().lch.hue()).toBe(280);
  });

  test('xyz.x() getter and setter', () => {
    const c = Color.fromXYZ(0.3, 0.4, 0.5);
    expect(c.xyz.x()).toBe(0.3);
    const c2 = c.xyz.x(0.6);
    expect(c2.xyz.x()).toBe(0.6);
  });

  test('xyz.y() getter and setter', () => {
    const c = Color.fromXYZ(0.3, 0.4, 0.5);
    expect(c.xyz.y()).toBe(0.4);
    const c2 = c.xyz.y(0.7);
    expect(c2.xyz.y()).toBe(0.7);
  });

  test('xyz.z() getter and setter', () => {
    const c = Color.fromXYZ(0.3, 0.4, 0.5);
    expect(c.xyz.z()).toBe(0.5);
    const c2 = c.xyz.z(0.8);
    expect(c2.xyz.z()).toBe(0.8);
  });
});

// ─── HSL string construction test ──────────────────────────

describe('HSL string construction', () => {
  test('constructing from hsl() string preserves native space', () => {
    const c = new Color('hsl(200, 50%, 60%)');
    expect(c.hue).toBe(200);
    expect(c.saturation).toBe(0.5);
    expect(c.lightness).toBe(0.6);
  });

  test('constructing from hsla() string works', () => {
    const c = new Color('hsla(200, 50%, 60%, 0.5)');
    expect(c.hue).toBe(200);
    expect(c.alpha).toBe(0.5);
  });
});

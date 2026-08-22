import { describe, expect, test } from 'bun:test';

import { Color } from './index.js';

// Targeted coverage for the perceptual color-space operations exposed on
// `Color` — the getter/setter overloads and lightness/chroma nudges that the
// broader suite exercises only indirectly.

const base = new Color(70, 130, 180); // steelblue

describe('Color.oklch operations', () => {
  test('lightness() reads, lightness(v) returns a lighter/darker Color', () => {
    const L = base.oklch.lightness();
    expect(typeof L).toBe('number');

    const lighter = base.oklch.lightness(Math.min(1, L + 0.2));
    expect(lighter).toBeInstanceOf(Color);
    expect(lighter.oklch.lightness()).toBeGreaterThan(L);
  });

  test('chroma() reads, chroma(v) sets', () => {
    const c = base.oklch.chroma();
    expect(typeof c).toBe('number');

    const punchy = base.oklch.chroma(c + 0.05);
    expect(punchy).toBeInstanceOf(Color);
    expect(punchy.oklch.chroma()).toBeGreaterThan(c);
  });

  test('hue() reads, hue(v) sets', () => {
    const h = base.oklch.hue();
    expect(typeof h).toBe('number');

    const shifted = base.oklch.hue(120);
    expect(shifted).toBeInstanceOf(Color);
    expect(shifted.oklch.hue()).toBeCloseTo(120, 0);
  });

  test('saturate() raises chroma, desaturate() lowers it', () => {
    const c = base.oklch.chroma();
    expect(base.oklch.saturate(0.05).oklch.chroma()).toBeGreaterThan(c);
    expect(base.oklch.desaturate(0.05).oklch.chroma()).toBeLessThan(c);
  });

  test('desaturate() clamps chroma at zero rather than going negative', () => {
    expect(base.oklch.desaturate(10).oklch.chroma()).toBeGreaterThanOrEqual(0);
  });

  test('lighten() / darken() move lightness in opposite directions', () => {
    const L = base.oklch.lightness();
    expect(base.oklch.lighten(0.1).oklch.lightness()).toBeGreaterThan(L);
    expect(base.oklch.darken(0.1).oklch.lightness()).toBeLessThan(L);
  });

  test('rotateHue() advances the hue angle', () => {
    const rotated = base.oklch.rotateHue(30);
    expect(rotated).toBeInstanceOf(Color);
    expect(rotated.oklch.hue()).toBeCloseTo((base.oklch.hue() + 30) % 360, 0);
  });

  test('rotateHue() wraps a negative result back into [0, 360)', () => {
    const rotated = base.oklch.rotateHue(-400);
    expect(rotated.oklch.hue()).toBeGreaterThanOrEqual(0);
    expect(rotated.oklch.hue()).toBeLessThan(360);
  });

  test('complement() rotates the hue by 180°', () => {
    const comp = base.oklch.complement();
    expect(comp).toBeInstanceOf(Color);
    expect(comp.oklch.hue()).toBeCloseTo((base.oklch.hue() + 180) % 360, 0);
  });
});

describe('Color.oklab operations', () => {
  test('lighten() / darken() are inverses in direction', () => {
    const L = base.oklab.lightness();
    expect(base.oklab.lighten(0.1).oklab.lightness()).toBeGreaterThan(L);
    expect(base.oklab.darken(0.1).oklab.lightness()).toBeLessThan(L);
  });
});

describe('Color.rgb operations', () => {
  test('blue(v) sets the blue channel', () => {
    const recolored = base.rgb.blue(10);
    expect(recolored).toBeInstanceOf(Color);
    expect(recolored.blue).toBe(10);
  });

  test('mix() blends toward another color', () => {
    const mixed = base.rgb.mix(new Color(255, 255, 255), 0.5);
    expect(mixed).toBeInstanceOf(Color);
    // Mixing steelblue toward white lightens every channel.
    expect(mixed.red).toBeGreaterThan(base.red);
    expect(mixed.blue).toBeGreaterThan(base.blue);
  });
});

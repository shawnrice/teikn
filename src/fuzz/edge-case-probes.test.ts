import { describe, expect, it } from 'vitest';

import { composite, group, tokens as combineTokens } from '../builders.js';
import {
  CssVars,
  DtcgGenerator,
  Html,
  JavaScript,
  Json,
  Scss,
  ScssVars,
  Storybook,
  TypeScript,
  TypeScriptDeclarations,
} from '../Generators/index.js';
import { Teikn } from '../Teikn.js';
import { Color } from '../TokenTypes/Color/index.js';
import { Duration } from '../TokenTypes/Duration.js';

const dateFn = () => 'FIXED';
const gens = () => [
  new CssVars({ dateFn }),
  new Scss({ filename: 'a', dateFn }),
  new ScssVars({ filename: 'b', dateFn }),
  new Html({ dateFn }),
  new Json(),
  new DtcgGenerator(),
  new JavaScript({ filename: 'c', dateFn }),
  new TypeScript({ filename: 'd', dateFn }),
  new TypeScriptDeclarations({ filename: 'e', dateFn }),
  new Storybook({ filename: 'f', dateFn }),
];

describe('aggressive probes', () => {
  it('Transition with referenced duration', () => {
    const durs = group('duration', { fast: new Duration(100, 'ms') });
    const transitions = composite('transition', {
      hover: { duration: '{fast}', timingFunction: 'ease-in-out' },
    });
    const t = new Teikn({ generators: gens(), validate: false });
    expect(() => t.generateToStrings(combineTokens(durs, transitions))).not.toThrow();
  });

  it('Token value containing braces but not a valid ref', () => {
    const g = group('text', { weird: 'hello {not-a-ref} world' });
    const t = new Teikn({ generators: gens(), validate: false });
    expect(() => t.generateToStrings(g)).not.toThrow();
  });

  it('Token name with parens / brackets', () => {
    const g = group('color', { 'weird(name)': new Color(0, 0, 0), 'name[1]': new Color(1, 1, 1) });
    const t = new Teikn({ generators: gens(), validate: false });
    expect(() => t.generateToStrings(g)).not.toThrow();
  });

  it('Empty modes object', () => {
    const g = group('color', { primary: { value: new Color(0, 0, 0), modes: {} } });
    const t = new Teikn({ generators: gens(), validate: false });
    expect(() => t.generateToStrings(g)).not.toThrow();
  });

  it('Token value with newline characters', () => {
    const g = group('text', { multiline: 'line1\nline2' });
    const t = new Teikn({ generators: gens(), validate: false });
    expect(() => t.generateToStrings(g)).not.toThrow();
  });

  it('Token value with embedded double quotes', () => {
    const g = group('text', { quoted: 'he said "hi"', apos: "it's" });
    const t = new Teikn({ generators: gens(), validate: false });
    expect(() => t.generateToStrings(g)).not.toThrow();
  });

  it('Token with backslashes', () => {
    const g = group('text', { back: 'a\\b' });
    const t = new Teikn({ generators: gens(), validate: false });
    expect(() => t.generateToStrings(g)).not.toThrow();
  });

  it('Very long token name (200 chars)', () => {
    const long = 'a'.repeat(200);
    const g = group('text', { [long]: 'value' });
    const t = new Teikn({ generators: gens(), validate: false });
    expect(() => t.generateToStrings(g)).not.toThrow();
  });

  it('Round-trip JSON output: quotes/newlines/backslashes are valid JSON', () => {
    const g = group('text', { quoted: 'a "b" c', multiline: 'x\ny', back: 'a\\b' });
    const t = new Teikn({ generators: [new Json()], validate: false });
    const out = t.generateToStrings(g);
    const json = out.get('tokens.json')!;
    expect(() => JSON.parse(json)).not.toThrow();
    const parsed = JSON.parse(json);
    // The value path under the prefix-named token should round-trip
    // (we don't depend on exact shape here, just on parseability)
    expect(parsed).toBeTruthy();
  });

  it('Token name colliding with a JS reserved word', () => {
    const g = group('color', {
      class: new Color(1, 2, 3),
      delete: new Color(4, 5, 6),
      import: new Color(7, 8, 9),
    });
    const t = new Teikn({ generators: gens(), validate: false });
    expect(() => t.generateToStrings(g)).not.toThrow();
  });
});

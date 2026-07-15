import { describe, expect, test } from 'bun:test';

import { group, ref } from '../builders.js';
import { Teikn } from '../Teikn.js';
import { BoxShadow } from '../TokenTypes/BoxShadow.js';
import { Color } from '../TokenTypes/Color/index.js';

// Regression: DTCG aliases (linked refs and composite/identity refs) were
// emitted as the flat token name, so with a group-reconstructing separator they
// dangled — pointing at a root-level token that actually lives nested.
const dtcg = (tokens: any[], separator?: string) =>
  JSON.parse(
    new Teikn({
      generators: [new Teikn.generators.Dtcg(separator ? { separator } : {})],
      validate: false,
    })
      .generateToStrings(tokens)
      .get('tokens.tokens.json')!,
  );

describe('DTCG alias paths', () => {
  test('a linked ref emits the hierarchical path when groups are reconstructed', () => {
    const doc = dtcg(
      group('color', { primary: '#0066cc', surface: ref('primary', { link: true }) }),
      '-',
    );
    expect(doc.color.surface.$value).toBe('{color.primary}');
  });

  test('a composite color ref emits the hierarchical path', () => {
    const tokens = [
      ...group('color', { ink: new Color('#111111') }),
      ...group('shadow', { card: new BoxShadow({ offsetY: 2, blur: 8, color: '{color.ink}' }) }),
    ];
    const doc = dtcg(tokens, '-');
    expect(doc.shadow.card.$value.color).toBe('{color.ink}');
  });

  test('with the default flat separator, the alias matches the flat key', () => {
    const doc = dtcg(
      group('color', { primary: '#0066cc', surface: ref('primary', { link: true }) }),
    );
    expect(doc['color-surface'].$value).toBe('{color-primary}');
    expect('color-primary' in doc).toBe(true);
  });
});

describe('DTCG name/group collision', () => {
  test('throws when one token name is a group prefix of another', () => {
    // With separator '-', `color-a` is a leaf and `color-a-b` nests under it.
    expect(() => dtcg(group('color', { a: '#111111', 'a-b': '#222222' }), '-')).toThrow(
      /collision/,
    );
  });

  test('throws regardless of declaration order', () => {
    expect(() => dtcg(group('color', { 'a-b': '#222222', a: '#111111' }), '-')).toThrow(
      /collision/,
    );
  });
});

import { describe, expect, test } from 'bun:test';

import { group } from './builders.js';
import { resolveReferences } from './resolve.js';
import type { Token } from './Token.js';
import { Border } from './TokenTypes/Border.js';
import { Color } from './TokenTypes/Color/index.js';
import { validate } from './validate.js';

describe('validate', () => {
  test('returns valid for correct tokens', () => {
    const tokens: Token[] = [
      { name: 'primary', type: 'color', value: '#0066cc', usage: 'Brand color' },
      { name: 'spacing', type: 'spacing', value: '1rem' },
    ];

    const result = validate(tokens);
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  test('detects missing name', () => {
    const tokens = [{ name: '', type: 'color', value: '#000' }] as Token[];

    const result = validate(tokens);
    expect(result.valid).toBe(false);
    expect(result.issues.some(i => i.message.includes('name'))).toBe(true);
  });

  test('detects missing value', () => {
    const tokens = [{ name: 'test', type: 'color', value: undefined }] as unknown as Token[];

    const result = validate(tokens);
    expect(result.valid).toBe(false);
  });

  test('detects missing type', () => {
    const tokens = [{ name: 'test', type: '', value: '#000' }] as Token[];

    const result = validate(tokens);
    expect(result.valid).toBe(false);
  });

  test('detects duplicate names', () => {
    const tokens: Token[] = [
      { name: 'primary', type: 'color', value: '#000' },
      { name: 'primary', type: 'color', value: '#fff' },
    ];

    const result = validate(tokens);
    expect(result.issues.some(i => i.message.includes('Duplicate'))).toBe(true);
  });

  test('warns on unparseable color values', () => {
    const tokens: Token[] = [{ name: 'bad', type: 'color', value: 'not-a-color-value' }];

    const result = validate(tokens);
    expect(result.issues.some(i => i.message.includes('could not be parsed'))).toBe(true);
  });

  test('accepts valid color values', () => {
    const tokens: Token[] = [
      { name: 'hex', type: 'color', value: '#ff0000' },
      { name: 'named', type: 'color', value: 'aliceblue' },
      { name: 'instance', type: 'color', value: new Color(255, 0, 0) },
    ];

    const result = validate(tokens);
    const colorIssues = result.issues.filter(i => i.message.includes('parsed'));
    expect(colorIssues).toHaveLength(0);
  });

  test('detects unresolved references', () => {
    const tokens: Token[] = [{ name: 'link', type: 'color', value: '{nonexistent}' }];

    const result = validate(tokens);
    expect(result.valid).toBe(false);
    expect(result.issues.some(i => i.message.includes('Unresolved reference'))).toBe(true);
  });

  test('detects ambiguous bare references across groups', () => {
    const tokens: Token[] = [
      { name: 'primary', type: 'color', group: 'color', value: '#0066cc' },
      { name: 'primary', type: 'size', group: 'size', value: '16px' },
      { name: 'link', type: 'color', value: '{primary}' },
    ];

    const result = validate(tokens);
    expect(result.valid).toBe(false);
    expect(result.issues.some(i => i.message.includes('Ambiguous token reference'))).toBe(true);
  });

  test('qualified reference is accepted even when bare name is ambiguous', () => {
    const tokens: Token[] = [
      { name: 'primary', type: 'color', group: 'color', value: '#0066cc' },
      { name: 'primary', type: 'size', group: 'size', value: '16px' },
      { name: 'link', type: 'color', value: '{color.primary}' },
    ];

    const result = validate(tokens);
    expect(result.valid).toBe(true);
    expect(result.issues.filter(i => i.severity === 'error')).toHaveLength(0);
  });

  test('detects circular references', () => {
    const tokens: Token[] = [
      { name: 'a', type: 'color', value: '{b}' },
      { name: 'b', type: 'color', value: '{a}' },
    ];

    const result = validate(tokens);
    expect(result.issues.some(i => i.message.includes('Circular'))).toBe(true);
  });

  test('detects circular references inside composite field values', () => {
    const tokens: Token[] = [
      {
        name: 'heading',
        type: 'typography',
        value: { fontFamily: 'Inter', fontSize: '{sizeRef}', fontWeight: 400, lineHeight: 1.2 },
      },
      { name: 'sizeRef', type: 'dimension', value: '{heading}' },
    ];

    const result = validate(tokens);
    expect(result.issues.some(i => i.message.includes('Circular'))).toBe(true);
  });

  test('detects circular references inside composite mode values', () => {
    const tokens: Token[] = [
      {
        name: 'surface',
        type: 'color',
        value: '#fff',
        modes: { dark: { fontFamily: 'Inter', fontSize: '{loopback}' } as unknown as string },
      },
      { name: 'loopback', type: 'color', value: '{surface}' },
    ];

    const result = validate(tokens);
    expect(result.issues.some(i => i.message.includes('Circular'))).toBe(true);
  });

  test('validates composite token shapes', () => {
    const tokens: Token[] = [
      { name: 'heading', type: 'typography', value: { fontFamily: 'Rubik', fontSize: '2rem' } },
    ];

    const result = validate(tokens);
    expect(result.issues.some(i => i.message.includes('missing fields'))).toBe(true);
  });

  test('accepts valid composite tokens', () => {
    const tokens: Token[] = [
      {
        name: 'heading',
        type: 'typography',
        value: {
          fontFamily: 'Rubik',
          fontSize: '2rem',
          fontWeight: 700,
          lineHeight: 1.2,
          letterSpacing: '0',
        },
      },
    ];

    const result = validate(tokens);
    const typographyIssues = result.issues.filter(i => i.message.includes('missing'));
    expect(typographyIssues).toHaveLength(0);
  });

  // ─── Mode validation ──────────────────────────────────────────

  test('warns on unparseable color in mode value', () => {
    const tokens: Token[] = [
      { name: 'surface', type: 'color', value: '#ffffff', modes: { dark: 'not-a-color-value' } },
    ];

    const result = validate(tokens);
    expect(
      result.issues.some(
        i => i.message.includes('mode "dark"') && i.message.includes('could not be parsed'),
      ),
    ).toBe(true);
  });

  test('detects unresolved references in mode values', () => {
    const tokens: Token[] = [
      { name: 'surface', type: 'color', value: '#ffffff', modes: { dark: '{nonexistent}' } },
    ];

    const result = validate(tokens);
    expect(result.valid).toBe(false);
    expect(
      result.issues.some(
        i => i.message.includes('mode "dark"') && i.message.includes('Unresolved reference'),
      ),
    ).toBe(true);
  });

  test('accepts valid mode values', () => {
    const tokens: Token[] = [
      { name: 'primary', type: 'color', value: '#0066cc', modes: { dark: '#3399ff' } },
    ];

    const result = validate(tokens);
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  test('accepts mode values that reference existing tokens', () => {
    const tokens: Token[] = [
      { name: 'darkBlue', type: 'color', value: '#3399ff' },
      { name: 'primary', type: 'color', value: '#0066cc', modes: { dark: '{darkBlue}' } },
    ];

    const result = validate(tokens);
    const modeIssues = result.issues.filter(i => i.message.includes('mode'));
    expect(modeIssues).toHaveLength(0);
  });

  // ─── Empty values ──────────────────────────────────────────

  test('warns on empty string value', () => {
    const tokens: Token[] = [{ name: 'empty', type: 'spacing', value: '' }];
    const result = validate(tokens);
    expect(result.issues.some(i => i.message.includes('Empty string value'))).toBe(true);
  });

  test('warns on empty string in mode value', () => {
    const tokens: Token[] = [
      { name: 'gap', type: 'spacing', value: '1rem', modes: { compact: '' } },
    ];
    const result = validate(tokens);
    expect(
      result.issues.some(
        i => i.message.includes('mode "compact"') && i.message.includes('Empty string'),
      ),
    ).toBe(true);
  });

  // ─── Circular refs in modes ────────────────────────────────

  test('detects circular self-reference in mode value', () => {
    const tokens: Token[] = [
      { name: 'surface', type: 'color', value: '#ffffff', modes: { dark: '{surface}' } },
    ];

    const result = validate(tokens);
    expect(result.issues.some(i => i.message.includes('Circular'))).toBe(true);
  });

  test('detects circular reference chain through modes', () => {
    const tokens: Token[] = [
      { name: 'a', type: 'color', value: '#000', modes: { dark: '{b}' } },
      { name: 'b', type: 'color', value: '{a}' },
    ];

    const result = validate(tokens);
    expect(result.issues.some(i => i.message.includes('Circular'))).toBe(true);
  });

  // ─── Composite shape validation in modes ───────────────────

  test('warns on incomplete composite shape in mode value', () => {
    const tokens: Token[] = [
      {
        name: 'heading',
        type: 'typography',
        value: {
          fontFamily: 'Rubik',
          fontSize: '2rem',
          fontWeight: 700,
          lineHeight: 1.2,
          letterSpacing: '0',
        },
        modes: { mobile: { fontSize: '1.5rem' } },
      },
    ];

    const result = validate(tokens);
    expect(
      result.issues.some(
        i => i.message.includes('mode "mobile"') && i.message.includes('missing fields'),
      ),
    ).toBe(true);
  });
});

describe('validate reference walking', () => {
  test.each<[string, Token['value'], string]>([
    ['a top-level array', ['{nope}', 'serif'], 'Unresolved reference: {nope}'],
    [
      'a nested plain object',
      { a: { b: '{nope}' } },
      'Unresolved reference in field "a.b": {nope}',
    ],
    [
      'an array inside an object',
      { a: ['x', '{nope}'] },
      'Unresolved reference in field "a": {nope}',
    ],
  ])('reports a dangling ref in %s, as the resolver would', (_label, value, message) => {
    const tokens: Token[] = [{ name: 'f', type: 'font', value }];
    expect(() => resolveReferences(tokens)).toThrow('Unresolved reference');
    expect(validate(tokens).issues).toEqual([{ severity: 'error', token: 'f', message }]);
  });

  test('checks nested refs in mode values', () => {
    const tokens: Token[] = [
      { name: 'f', type: 'font', value: ['serif'], modes: { dark: ['{nope}'] } },
    ];
    expect(validate(tokens).issues[0]!.message).toBe('[mode "dark"] Unresolved reference: {nope}');
  });

  test('accepts nested refs that resolve', () => {
    const tokens: Token[] = [
      { name: 'base', type: 'font', value: 'serif' },
      { name: 'f', type: 'font', value: ['{base}', { a: { b: '{base}' } }] as Token['value'] },
    ];
    expect(validate(tokens).valid).toBe(true);
  });
});

describe('validate duplicate output names', () => {
  test('flags tokens in different groups that emit the same type-name', () => {
    const result = validate([
      { name: 'primary', type: 'color', value: '#000' },
      { name: 'primary', type: 'color', group: 'color', value: '#000' },
      { name: 'primary', type: 'color', group: 'brand', value: '#000' },
    ]);
    expect(result.valid).toBe(false);
    expect(result.issues.map(i => i.message)).toEqual([
      expect.stringContaining(
        'Duplicate output name "color-primary" — tokens "primary" and "color.primary"',
      ),
      expect.stringContaining(
        'Duplicate output name "color-primary" — tokens "primary" and "brand.primary"',
      ),
    ]);
  });

  test('flags a type/name split that joins to the same output name', () => {
    const result = validate([
      ...group('font', { 'size-sm': '1px' }),
      ...group('font-size', { sm: '2px' }),
    ]);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]!.message).toContain('Duplicate output name "font-size-sm"');
  });

  test('does not double-report a duplicate qualified name', () => {
    const result = validate([
      { name: 'primary', type: 'color', value: '#000' },
      { name: 'primary', type: 'color', value: '#111' },
    ]);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]!.message).toContain('Duplicate qualified token name');
  });

  test('same name under different types is fine', () => {
    const result = validate([
      ...group('color', { primary: '#000' }),
      ...group('spacing', { primary: '4px' }),
    ]);
    expect(result.valid).toBe(true);
  });
});

describe('validate: cycles follow the mode being resolved', () => {
  const circular = (tokens: Token[]): boolean =>
    validate(tokens).issues.some(i => i.message.includes('Circular'));

  test('a chain that only loops by switching modes is not a cycle', () => {
    expect(
      circular([
        { name: 'a', type: 'color', value: '{b}', modes: { dark: '#111' } },
        { name: 'b', type: 'color', value: '#fff', modes: { dark: '{a}' } },
      ]),
    ).toBe(false);
  });

  test('a cycle that exists within one mode is reported', () => {
    expect(
      circular([
        { name: 'a', type: 'color', value: '#000', modes: { dark: '{b}' } },
        { name: 'b', type: 'color', value: '#fff', modes: { dark: '{a}' } },
      ]),
    ).toBe(true);
  });

  test('a cycle reached through an inherited mode is reported', () => {
    expect(
      circular([
        { name: 'a', type: 'color', value: '{b}' },
        { name: 'b', type: 'color', value: '#fff', modes: { dark: '{a}' } },
      ]),
    ).toBe(true);
  });
});

describe('validate: wrapper field resolving to the wrong type', () => {
  const tokens = (card: Token['value'], modes?: Token['modes']): Token[] => [
    { name: 'gap', type: 'spacing', group: 'spacing', value: '4px' },
    { name: 'ink', type: 'color', group: 'color', value: '#000' },
    { name: 'card', type: 'border', group: 'border', value: card, ...(modes ? { modes } : {}) },
  ];
  const border = (color: string) => new Border({ width: '1px', style: 'solid', color });

  test('reports a color field that points at a dimension', () => {
    const result = validate(tokens(border('{gap}')));

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual([
      {
        severity: 'error',
        token: 'card',
        message: expect.stringMatching(/field "color" \(\{gap\}\).*Cannot extract color/s),
      },
    ]);
  });

  test('reports the same problem in a mode value', () => {
    const result = validate(tokens(border('{ink}'), { dark: border('{gap}') }));

    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]!.message).toMatch(/^\[mode "dark"\] .*field "color"/s);
  });

  test('accepts a field ref to a token of the right type', () => {
    expect(validate(tokens(border('{ink}'))).issues).toEqual([]);
  });

  test('agrees with resolveReferences on whether the set resolves', () => {
    for (const color of ['{gap}', '{ink}']) {
      const set = tokens(border(color));
      const resolves = (() => {
        try {
          resolveReferences(set);

          return true;
        } catch {
          return false;
        }
      })();

      expect(validate(set).valid).toBe(resolves);
    }
  });
});

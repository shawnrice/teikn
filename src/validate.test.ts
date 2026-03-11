import { describe, expect, test } from 'bun:test';

import { Color } from './TokenTypes/Color';
import type { Token } from './Token';
import { validate } from './validate';

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

  test('detects circular references', () => {
    const tokens: Token[] = [
      { name: 'a', type: 'color', value: '{b}' },
      { name: 'b', type: 'color', value: '{a}' },
    ];

    const result = validate(tokens);
    expect(result.issues.some(i => i.message.includes('Circular'))).toBe(true);
  });

  test('validates composite token shapes', () => {
    const tokens: Token[] = [
      {
        name: 'heading',
        type: 'typography',
        value: { fontFamily: 'Rubik', fontSize: '2rem' },
      },
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
      {
        name: 'surface',
        type: 'color',
        value: '#ffffff',
        modes: { dark: 'not-a-color-value' },
      },
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
      {
        name: 'surface',
        type: 'color',
        value: '#ffffff',
        modes: { dark: '{nonexistent}' },
      },
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
      {
        name: 'primary',
        type: 'color',
        value: '#0066cc',
        modes: { dark: '#3399ff' },
      },
    ];

    const result = validate(tokens);
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  test('accepts mode values that reference existing tokens', () => {
    const tokens: Token[] = [
      { name: 'darkBlue', type: 'color', value: '#3399ff' },
      {
        name: 'primary',
        type: 'color',
        value: '#0066cc',
        modes: { dark: '{darkBlue}' },
      },
    ];

    const result = validate(tokens);
    const modeIssues = result.issues.filter(i => i.message.includes('mode'));
    expect(modeIssues).toHaveLength(0);
  });
});

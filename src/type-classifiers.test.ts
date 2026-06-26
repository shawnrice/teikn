import { describe, expect, test } from 'bun:test';

import { classifyTokenType, resolvePreviewKind } from './type-classifiers.js';

describe('classifyTokenType', () => {
  test('maps canonical kebab-case types to their kind', () => {
    expect(classifyTokenType('color')).toBe('color');
    expect(classifyTokenType('radius')).toBe('borderRadius');
    expect(classifyTokenType('border-radius')).toBe('borderRadius');
    expect(classifyTokenType('border-width')).toBe('borderWidth');
    expect(classifyTokenType('border-style')).toBe('borderStyle');
    expect(classifyTokenType('z-index')).toBe('zLayer');
    expect(classifyTokenType('z-layer')).toBe('zLayer');
    expect(classifyTokenType('line-height')).toBe('lineHeight');
  });

  test('is case- and separator-tolerant (agent-friendly variance)', () => {
    expect(classifyTokenType('borderRadius')).toBe('borderRadius');
    expect(classifyTokenType('border_radius')).toBe('borderRadius');
    expect(classifyTokenType('Color')).toBe('color');
  });

  test('resolves overlaps by priority — specific before broad', () => {
    // /spacing/ would also match "letter-spacing"; letterSpacing must win.
    expect(classifyTokenType('letter-spacing')).toBe('letterSpacing');
    expect(classifyTokenType('spacing')).toBe('spacing');
    // border-* trio must win over bare border.
    expect(classifyTokenType('border-width')).not.toBe('border');
    expect(classifyTokenType('border')).toBe('border');
  });

  test("falls back to 'table' for unrecognized types", () => {
    expect(classifyTokenType('widgetThing')).toBe('table');
    expect(classifyTokenType('')).toBe('table');
  });
});

describe('resolvePreviewKind', () => {
  test('an explicit preview hint overrides inference', () => {
    expect(resolvePreviewKind({ type: 'elevation', preview: 'shadow' })).toBe('shadow');
    // A type that would infer to borderRadius, overridden to size.
    expect(resolvePreviewKind({ type: 'radius', preview: 'size' })).toBe('size');
  });

  test('falls back to type inference when no hint is present', () => {
    expect(resolvePreviewKind({ type: 'radius' })).toBe('borderRadius');
    expect(resolvePreviewKind({ type: 'mystery' })).toBe('table');
  });
});

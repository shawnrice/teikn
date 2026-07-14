import { describe, expect, test } from 'bun:test';

import type { Token } from '../Token.js';
import { Color } from '../TokenTypes/Color/index.js';
import { PerceptualDistancePlugin } from './PerceptualDistancePlugin.js';

describe('PerceptualDistancePlugin', () => {
  const makeToken = (name: string, value: string | Color, group?: string): Token => ({
    name,
    type: 'color',
    value,
    ...(group ? { group } : {}),
  });

  test('tokenType and outputType', () => {
    const plugin = new PerceptualDistancePlugin({});
    expect(plugin.tokenType).toBe('color');
    expect(plugin.outputType.test('css')).toBe(true);
  });

  test('transform returns token unchanged', () => {
    const plugin = new PerceptualDistancePlugin({});
    const token = makeToken('red', '#ff0000');
    expect(plugin.transform(token)).toBe(token);
  });

  // ─── Default: no intent, no judgment ───────────────────────────

  test('does not gate by default — surfaces a single non-gating advisory', () => {
    const plugin = new PerceptualDistancePlugin({});
    // Two near-identical grays that the old default would have flagged.
    const tokens = [makeToken('gray-a', '#808080'), makeToken('gray-b', '#828282')];
    const issues = plugin.audit!(tokens);

    expect(issues).toHaveLength(1);
    expect(issues[0]!.severity).toBe('info');
    expect(issues[0]!.message).toContain('sets');
    expect(issues[0]!.message).toContain('report');
  });

  test('does not infer peers from token.group', () => {
    const plugin = new PerceptualDistancePlugin({});
    // Same group and similar — the old auto-grouping would have warned.
    const tokens = [
      makeToken('gray-a', '#808080', 'neutrals'),
      makeToken('gray-b', '#828282', 'neutrals'),
    ];
    const issues = plugin.audit!(tokens);

    expect(issues.some(i => i.severity === 'warning')).toBe(false);
  });

  // ─── sets: intent supplied by the author ───────────────────────

  test('warns for similar colors within a declared set', () => {
    const plugin = new PerceptualDistancePlugin({ sets: [['danger', 'success']] });
    const tokens = [makeToken('danger', '#dc2626'), makeToken('success', '#16a34a')];
    // These are distinct; a truly-similar pair should warn.
    expect(plugin.audit!(tokens)).toHaveLength(0);

    const similar = new PerceptualDistancePlugin({ sets: [['a', 'b']] });
    const issues = similar.audit!([makeToken('a', '#808080'), makeToken('b', '#828282')]);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.severity).toBe('warning');
    expect(issues[0]!.message).toContain('ΔE');
    expect(issues[0]!.message).toContain('a');
    expect(issues[0]!.message).toContain('b');
  });

  test('only compares within a declared set — ramp steps outside it are ignored', () => {
    const plugin = new PerceptualDistancePlugin({ sets: [['danger', 'success']] });
    const tokens = [
      // a ramp — adjacent steps are supposed to be close
      makeToken('neutral-50', '#fafafa'),
      makeToken('neutral-100', '#f4f4f5'),
      // categorical peers — declared as a set
      makeToken('danger', '#dc2626'),
      makeToken('success', '#16a34a'),
    ];
    const issues = plugin.audit!(tokens);
    // The ramp pair is never compared; the declared peers are distinct.
    expect(issues).toHaveLength(0);
  });

  test('compares only within specified sets, not across them', () => {
    const plugin = new PerceptualDistancePlugin({ sets: [['gray-a', 'gray-b']] });
    const tokens = [
      makeToken('gray-a', '#808080'),
      makeToken('gray-b', '#828282'),
      makeToken('gray-c', '#838383'),
    ];
    const issues = plugin.audit!(tokens);
    // Only gray-a vs gray-b compared; gray-c is in no set.
    expect(issues).toHaveLength(1);
    expect(issues[0]!.message).toContain('gray-a');
    expect(issues[0]!.message).toContain('gray-b');
  });

  test('respects custom minDeltaE within a set', () => {
    const plugin = new PerceptualDistancePlugin({ minDeltaE: 50, sets: [['red', 'orange']] });
    const tokens = [makeToken('red', '#ff0000'), makeToken('orange', '#ff8800')];
    expect(plugin.audit!(tokens)).toHaveLength(1);
  });

  test('groups is honored as a deprecated alias for sets', () => {
    const plugin = new PerceptualDistancePlugin({ groups: [['a', 'b']] });
    const issues = plugin.audit!([makeToken('a', '#808080'), makeToken('b', '#828282')]);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.severity).toBe('warning');
  });

  test('sets wins over groups when both are given', () => {
    const plugin = new PerceptualDistancePlugin({ sets: [['a', 'b']], groups: [['a', 'b', 'c']] });
    const tokens = [
      makeToken('a', '#808080'),
      makeToken('b', '#828282'),
      makeToken('c', '#838383'),
    ];
    // Uses `sets` (one pair), not `groups` (three pairs).
    expect(plugin.audit!(tokens)).toHaveLength(1);
  });

  // ─── all: explicit opt-in to all-pairs gating ──────────────────

  test('all: true compares every color pair', () => {
    const plugin = new PerceptualDistancePlugin({ minDeltaE: 100, all: true });
    const tokens = [
      makeToken('a', '#ff0000'),
      makeToken('b', '#00ff00'),
      makeToken('c', '#0000ff'),
    ];
    // 3 pairs, all under the huge threshold.
    expect(plugin.audit!(tokens)).toHaveLength(3);
  });

  test('all: true ignores token.group boundaries', () => {
    const plugin = new PerceptualDistancePlugin({ minDeltaE: 100, all: true });
    const tokens = [makeToken('a', '#ff0000', 'warm'), makeToken('b', '#00ff00', 'cool')];
    // Different groups, but `all` compares them anyway.
    expect(plugin.audit!(tokens)).toHaveLength(1);
  });

  // ─── report: non-gating measurement ────────────────────────────

  test('report: true emits info findings for every pair, worst-first', () => {
    const plugin = new PerceptualDistancePlugin({ report: true });
    const tokens = [
      makeToken('white', '#ffffff'),
      makeToken('near-white', '#fefefe'),
      makeToken('black', '#000000'),
    ];
    const issues = plugin.audit!(tokens);

    // 3 pairs, all reported, none gating.
    expect(issues).toHaveLength(3);
    expect(issues.every(i => i.severity === 'info')).toBe(true);

    // Worst (most similar) first: white vs near-white has the smallest ΔE.
    expect(issues[0]!.message).toContain('white');
    expect(issues[0]!.message).toContain('near-white');

    const deltas = issues.map(i => parseFloat(i.message.match(/ΔE = (\d+\.?\d*)/)![1]!));
    expect(deltas).toEqual(deltas.toSorted((a, b) => a - b));
  });

  test('report: true respects sets when provided', () => {
    const plugin = new PerceptualDistancePlugin({ report: true, sets: [['a', 'b']] });
    const tokens = [
      makeToken('a', '#808080'),
      makeToken('b', '#828282'),
      makeToken('c', '#000000'),
    ];
    const issues = plugin.audit!(tokens);
    // Only the declared pair is measured.
    expect(issues).toHaveLength(1);
    expect(issues[0]!.severity).toBe('info');
    expect(issues[0]!.message).toContain('a');
    expect(issues[0]!.message).toContain('b');
  });

  test('report mode never gates, even for identical colors', () => {
    const plugin = new PerceptualDistancePlugin({ report: true, all: true });
    const tokens = [makeToken('a', '#123456'), makeToken('alias', '#123456')];
    const issues = plugin.audit!(tokens);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.severity).toBe('info');
    expect(issues[0]!.message).toContain('ΔE = 0');
  });

  // ─── robustness ────────────────────────────────────────────────

  test('handles Color instances as values', () => {
    const plugin = new PerceptualDistancePlugin({ sets: [['a', 'b']] });
    const tokens = [makeToken('a', new Color('#808080')), makeToken('b', new Color('#818181'))];
    expect(plugin.audit!(tokens)).toHaveLength(1);
  });

  test('skips non-color tokens', () => {
    const plugin = new PerceptualDistancePlugin({ all: true });
    const tokens: Token[] = [
      makeToken('red', '#ff0000'),
      { name: 'spacing', type: 'spacing', value: '16px' },
    ];
    const issues = plugin.audit!(tokens);
    expect(issues.some(i => i.severity === 'warning')).toBe(false);
  });

  test('skips invalid color values gracefully', () => {
    const plugin = new PerceptualDistancePlugin({ all: true });
    const tokens: Token[] = [
      makeToken('red', '#ff0000'),
      { name: 'bad', type: 'color', value: 'not-a-color' },
    ];
    // Should not throw; skips the invalid token, leaving no comparable pair.
    expect(plugin.audit!(tokens)).toHaveLength(0);
  });

  test('includes the actual ΔE value in gating messages', () => {
    const plugin = new PerceptualDistancePlugin({ sets: [['a', 'b']] });
    const issues = plugin.audit!([makeToken('a', '#808080'), makeToken('b', '#808081')]);
    expect(issues).toHaveLength(1);
    const match = issues[0]!.message.match(/ΔE = (\d+\.?\d*)/);
    expect(match).not.toBeNull();
    const deltaE = parseFloat(match![1]!);
    expect(deltaE).toBeGreaterThan(0);
    expect(deltaE).toBeLessThan(5);
  });
});

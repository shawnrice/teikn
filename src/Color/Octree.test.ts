import { describe, expect, test } from 'bun:test';

import { Octree } from './Octree';

describe('Octree', () => {
  const items = [
    { id: 'origin', coords: [0, 0, 0] as const },
    { id: 'center', coords: [128, 128, 128] as const },
    { id: 'corner', coords: [255, 255, 255] as const },
  ];
  const tree = new Octree(items, item => item.coords);

  test('finds exact match with d2=0', () => {
    const result = tree.closest([128, 128, 128]);
    expect(result).toEqual({ data: items[1], coords: [128, 128, 128], d2: 0 });
  });

  test('finds nearest neighbor', () => {
    const result = tree.closest([130, 130, 130]);
    expect(result!.data.id).toBe('center');
    expect(result!.d2).toBe(12); // 2² + 2² + 2²
  });

  test('finds corner point from nearby query', () => {
    const result = tree.closest([250, 250, 250]);
    expect(result!.data.id).toBe('corner');
  });

  test('returns null for empty tree', () => {
    const empty = new Octree(
      [],
      (x: number[]) => x as unknown as readonly [number, number, number],
    );
    expect(empty.closest([0, 0, 0])).toBeNull();
  });

  test('handles query far from any item (triggers full scan)', () => {
    // With only 3 items, most cells are empty. A query in a far cell
    // with no neighbors should still find the closest via fallback.
    const sparse = new Octree([{ v: [10, 10, 10] as const }], item => item.v);
    const result = sparse.closest([200, 200, 200]);
    expect(result!.d2).toBe(3 * 190 ** 2);
  });
});

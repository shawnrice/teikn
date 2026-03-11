import { describe, expect, test } from "bun:test";

import { Octree } from "./Octree";

describe("Octree", () => {
  const items = [
    { id: "origin", coords: [0, 0, 0] as const },
    { id: "center", coords: [128, 128, 128] as const },
    { id: "corner", coords: [255, 255, 255] as const },
  ];
  const tree = new Octree(items, (item) => item.coords);

  test("finds exact match with d2=0", () => {
    const result = tree.closest([128, 128, 128]);
    expect(result).toEqual({ data: items[1], coords: [128, 128, 128], d2: 0 });
  });

  test("finds nearest neighbor", () => {
    const result = tree.closest([130, 130, 130]);
    expect(result!.data.id).toBe("center");
    expect(result!.d2).toBe(12); // 2² + 2² + 2²
  });

  test("finds corner point from nearby query", () => {
    const result = tree.closest([250, 250, 250]);
    expect(result!.data.id).toBe("corner");
  });

  test("returns null for empty tree", () => {
    const empty = new Octree(
      [],
      (x: number[]) => x as unknown as readonly [number, number, number],
    );
    expect(empty.closest([0, 0, 0])).toBeNull();
  });

  test("handles query far from any item", () => {
    const sparse = new Octree([{ v: [10, 10, 10] as const }], (item) => item.v);
    const result = sparse.closest([200, 200, 200]);
    expect(result!.d2).toBe(3 * 190 ** 2);
  });

  test("finds nearest among many clustered points", () => {
    const points = Array.from({ length: 100 }, (_, i) => ({
      id: `p${i}`,
      coords: [i * 2, i * 2, i * 2] as const,
    }));
    const big = new Octree(points, (p) => p.coords);
    const result = big.closest([101, 101, 101]);
    // Nearest should be p50 at [100, 100, 100] (d2 = 3)
    // or p51 at [102, 102, 102] (d2 = 3)
    expect(result!.d2).toBe(3);
  });

  test("handles all points in the same location", () => {
    const dupes = [
      { id: "a", coords: [50, 50, 50] as const },
      { id: "b", coords: [50, 50, 50] as const },
      { id: "c", coords: [50, 50, 50] as const },
    ];
    const t = new Octree(dupes, (d) => d.coords);
    const result = t.closest([50, 50, 50]);
    expect(result!.d2).toBe(0);
    expect(result!.coords).toEqual([50, 50, 50]);
  });

  test("single item tree returns that item for any query", () => {
    const t = new Octree([{ v: [100, 100, 100] as const }], (i) => i.v);
    const r1 = t.closest([0, 0, 0]);
    expect(r1!.d2).toBe(3 * 100 ** 2);
    const r2 = t.closest([255, 255, 255]);
    expect(r2!.d2).toBe(3 * 155 ** 2);
  });

  test("nearest neighbor matches brute force on random data", () => {
    const rng = (seed: number) => {
      let s = seed;
      return () => {
        s = (s * 1103515245 + 12345) & 0x7fffffff;
        return s % 256;
      };
    };
    const r = rng(42);
    const pts = Array.from({ length: 200 }, (_, i) => ({
      id: i,
      coords: [r(), r(), r()] as const,
    }));

    const t = new Octree(pts, (p) => p.coords);

    // Test 20 random queries
    for (let q = 0; q < 20; q++) {
      const query = [r(), r(), r()] as const;
      const result = t.closest(query);

      // Brute force
      let bestD2 = Infinity;
      for (const p of pts) {
        const d2 =
          (query[0] - p.coords[0]) ** 2 +
          (query[1] - p.coords[1]) ** 2 +
          (query[2] - p.coords[2]) ** 2;
        if (d2 < bestD2) {
          bestD2 = d2;
        }
      }

      expect(result!.d2).toBe(bestD2);
    }
  });

  test("respects custom depth parameter", () => {
    const pts = [{ v: [0, 0, 0] as const }, { v: [255, 255, 255] as const }];
    // depth=1 means just one subdivision (2 octants)
    const shallow = new Octree(pts, (p) => p.v, 1);
    const result = shallow.closest([1, 1, 1]);
    expect(result!.d2).toBe(3);
    expect(result!.coords).toEqual([0, 0, 0]);
  });
});

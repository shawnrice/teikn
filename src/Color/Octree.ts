/**
 * Grid-based spatial index for nearest-neighbor search in 3D integer space (0–255).
 *
 * Partitions RGB space into a grid of (2^depth)³ cells. Queries search the
 * cell containing the point plus its 26 neighbors. When the best distance
 * exceeds the cell boundary guarantee, falls back to a full linear scan.
 */

type Point3 = readonly [number, number, number];

export interface NearestResult<T> {
  data: T;
  coords: Point3;
  d2: number;
}

interface Entry<T> {
  point: Point3;
  data: T;
}

export class Octree<T> {
  readonly #grid: Map<number, Entry<T>[]>;
  readonly #entries: Entry<T>[];
  readonly #shift: number;
  readonly #size: number;

  constructor(items: T[], toPoint: (item: T) => Point3, depth = 4) {
    this.#shift = 8 - depth;
    this.#size = 1 << depth;
    this.#grid = new Map();
    this.#entries = [];

    for (const data of items) {
      const point = toPoint(data);
      const entry: Entry<T> = { point, data };
      this.#entries.push(entry);

      const key = this.#cellKey(point);
      const cell = this.#grid.get(key);
      if (cell) {
        cell.push(entry);
      } else {
        this.#grid.set(key, [entry]);
      }
    }
  }

  #cellKey(p: Point3): number {
    const s = this.#shift;
    const n = this.#size;
    return (p[0] >> s) * n * n + (p[1] >> s) * n + (p[2] >> s);
  }

  closest(query: Point3): NearestResult<T> | null {
    const s = this.#shift;
    const n = this.#size;
    const gx = query[0] >> s;
    const gy = query[1] >> s;
    const gz = query[2] >> s;

    let best: Entry<T> | null = null;
    let bestD2 = Infinity;

    // Search the query cell and its 26 neighbors (3×3×3 cube)
    for (let dx = -1; dx <= 1; dx++) {
      const cx = gx + dx;
      if (cx < 0 || cx >= n) {
        continue;
      }
      for (let dy = -1; dy <= 1; dy++) {
        const cy = gy + dy;
        if (cy < 0 || cy >= n) {
          continue;
        }
        for (let dz = -1; dz <= 1; dz++) {
          const cz = gz + dz;
          if (cz < 0 || cz >= n) {
            continue;
          }
          const cell = this.#grid.get(cx * n * n + cy * n + cz);
          if (!cell) {
            continue;
          }
          for (const entry of cell) {
            const d2 =
              (query[0] - entry.point[0]) ** 2 +
              (query[1] - entry.point[1]) ** 2 +
              (query[2] - entry.point[2]) ** 2;
            if (d2 < bestD2) {
              bestD2 = d2;
              best = entry;
            }
          }
        }
      }
    }

    // The minimum distance from the query to any point outside the 3×3×3
    // neighborhood is (cellSize + 1) in at least one axis. If the best
    // distance found exceeds that threshold, a closer match could exist
    // in a non-adjacent cell, so we fall back to a full scan.
    const cellSize = 1 << s;
    if (!best || bestD2 >= (cellSize + 1) ** 2) {
      for (const entry of this.#entries) {
        const d2 =
          (query[0] - entry.point[0]) ** 2 +
          (query[1] - entry.point[1]) ** 2 +
          (query[2] - entry.point[2]) ** 2;
        if (d2 < bestD2) {
          bestD2 = d2;
          best = entry;
        }
      }
    }

    if (!best) {
      return null;
    }
    return { data: best.data, coords: best.point, d2: bestD2 };
  }
}

/**
 * Recursive octree for nearest-neighbor search in 3D integer space (0–255).
 *
 * Subdivides RGB space into 8 octants per node. Nearest-neighbor queries use
 * branch-and-bound: the octant containing the query is searched first, then
 * siblings are visited only if the current best distance could reach into them.
 */

type Point3 = readonly [number, number, number];

export type NearestResult<T> = {
  data: T;
  coords: Point3;
  d2: number;
};

type Leaf<T> = {
  point: Point3;
  data: T;
};

type OctreeNode<T> = {
  children: (OctreeNode<T> | null)[];
  leaves: Leaf<T>[];
  // axis-aligned bounding box for this node
  minX: number; minY: number; minZ: number;
  maxX: number; maxY: number; maxZ: number;
  midX: number; midY: number; midZ: number;
};

const dist2 = (a: Point3, b: Point3): number =>
  (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;

/** Squared distance from a point to an axis-aligned bounding box. */
const boxDist2 = (p: Point3, node: OctreeNode<unknown>): number => {
  const dx = p[0] < node.minX ? node.minX - p[0] : p[0] > node.maxX ? p[0] - node.maxX : 0;
  const dy = p[1] < node.minY ? node.minY - p[1] : p[1] > node.maxY ? p[1] - node.maxY : 0;
  const dz = p[2] < node.minZ ? node.minZ - p[2] : p[2] > node.maxZ ? p[2] - node.maxZ : 0;
  return dx * dx + dy * dy + dz * dz;
};

const octantIndex = (p: Point3, node: OctreeNode<unknown>): number =>
  (p[0] >= node.midX ? 4 : 0) |
  (p[1] >= node.midY ? 2 : 0) |
  (p[2] >= node.midZ ? 1 : 0);

const createNode = <T>(
  minX: number, minY: number, minZ: number,
  maxX: number, maxY: number, maxZ: number,
): OctreeNode<T> => ({
  children: Array.from({ length: 8 }, () => null),
  leaves: [],
  minX, minY, minZ,
  maxX, maxY, maxZ,
  midX: (minX + maxX) / 2,
  midY: (minY + maxY) / 2,
  midZ: (minZ + maxZ) / 2,
});

const childBounds = (parent: OctreeNode<unknown>, idx: number): [number, number, number, number, number, number] => {
  const xLo = idx & 4 ? parent.midX : parent.minX;
  const xHi = idx & 4 ? parent.maxX : parent.midX;
  const yLo = idx & 2 ? parent.midY : parent.minY;
  const yHi = idx & 2 ? parent.maxY : parent.midY;
  const zLo = idx & 1 ? parent.midZ : parent.minZ;
  const zHi = idx & 1 ? parent.maxZ : parent.midZ;
  return [xLo, yLo, zLo, xHi, yHi, zHi];
};

const MAX_LEAF_CAPACITY = 4;

const insert = <T>(node: OctreeNode<T>, leaf: Leaf<T>, depthRemaining: number): void => {
  // At max depth or under capacity with no children yet: store as leaf
  if (depthRemaining <= 0 || (node.leaves.length < MAX_LEAF_CAPACITY && node.children.every(c => c === null))) {
    node.leaves.push(leaf);
    return;
  }

  // If this node has leaves and we need to subdivide, push them down
  if (node.leaves.length > 0) {
    const pending = node.leaves;
    node.leaves = [];
    for (const existing of pending) {
      insertIntoChild(node, existing, depthRemaining);
    }
  }

  insertIntoChild(node, leaf, depthRemaining);
};

const insertIntoChild = <T>(node: OctreeNode<T>, leaf: Leaf<T>, depthRemaining: number): void => {
  const idx = octantIndex(leaf.point, node);
  if (!node.children[idx]) {
    const [xLo, yLo, zLo, xHi, yHi, zHi] = childBounds(node, idx);
    node.children[idx] = createNode<T>(xLo, yLo, zLo, xHi, yHi, zHi);
  }
  insert(node.children[idx]!, leaf, depthRemaining - 1);
};

type SearchState<T> = {
  bestD2: number;
  best: Leaf<T> | null;
};

const searchNearest = <T>(node: OctreeNode<T>, query: Point3, state: SearchState<T>): void => {
  // Check leaves at this node
  for (const leaf of node.leaves) {
    const d2 = dist2(query, leaf.point);
    if (d2 < state.bestD2) {
      state.bestD2 = d2;
      state.best = leaf;
    }
  }

  // Build a priority order: query's octant first, then others sorted by box distance
  const queryIdx = octantIndex(query, node);
  const siblings: { idx: number; bd2: number }[] = [];

  for (let i = 0; i < 8; i++) {
    if (!node.children[i]) {
      continue;
    }
    if (i === queryIdx) {
      continue;
    }
    const bd2 = boxDist2(query, node.children[i]!);
    siblings.push({ idx: i, bd2 });
  }

  // Sort siblings by distance so we prune more aggressively
  siblings.sort((a, b) => a.bd2 - b.bd2);

  // Search query's own octant first
  if (node.children[queryIdx]) {
    searchNearest(node.children[queryIdx]!, query, state);
  }

  // Then search siblings only if their bounding box is closer than current best
  for (const { idx, bd2 } of siblings) {
    if (bd2 >= state.bestD2) {
      break; // sorted, so all remaining are farther
    }
    searchNearest(node.children[idx]!, query, state);
  }
};

export class Octree<T> {
  readonly #root: OctreeNode<T>;
  readonly #empty: boolean;

  constructor(items: T[], toPoint: (item: T) => Point3, depth = 8) {
    this.#root = createNode<T>(0, 0, 0, 256, 256, 256);
    this.#empty = items.length === 0;

    for (const data of items) {
      const point = toPoint(data);
      insert(this.#root, { point, data }, depth);
    }
  }

  closest(query: Point3): NearestResult<T> | null {
    if (this.#empty) {
      return null;
    }

    const state: SearchState<T> = { bestD2: Infinity, best: null };
    searchNearest(this.#root, query, state);

    if (!state.best) {
      return null;
    }

    return { data: state.best.data, coords: state.best.point, d2: state.bestD2 };
  }
}

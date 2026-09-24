import type { Vec2 } from '../player/movement';
import { HALL } from '../scene/anchors/layout';
import type { BoxCollider } from '../scene/greybox';

/** A solid with the radius of the circle around its centre that contains its whole footprint. */
interface NavSolid extends BoxCollider {
  reach: number;
}

export interface NavGrid {
  solids: readonly NavSolid[];
  clearance: number;
  cell: number;
  x0: number;
  z0: number;
  cols: number;
  rows: number;
  /** 1 where a cell centre is closer than `clearance` to a solid. */
  blocked: Uint8Array;
}

/** Function that finds a walkable route between two floor points, or null when there is none. */
export type Router = (from: Vec2, to: Vec2) => Vec2[] | null;

/** Distance from a floor point to the footprint of a (possibly rotated) box collider; 0 inside. */
export function distanceToSolid(solid: BoxCollider, x: number, z: number): number {
  const dx = x - solid.position[0];
  const dz = z - solid.position[2];
  const c = Math.cos(solid.rotationY);
  const s = Math.sin(solid.rotationY);
  const lx = Math.abs(dx * c - dz * s);
  const lz = Math.abs(dx * s + dz * c);
  return Math.hypot(Math.max(lx - solid.half[0], 0), Math.max(lz - solid.half[2], 0));
}

const isBlockedAt = (solids: readonly NavSolid[], clearance: number, x: number, z: number) =>
  solids.some(
    (solid) =>
      Math.abs(x - solid.position[0]) < solid.reach + clearance &&
      Math.abs(z - solid.position[2]) < solid.reach + clearance &&
      distanceToSolid(solid, x, z) < clearance,
  );

/** Walkable grid over the hall floor, built once from the same colliders the physics world uses. */
export function createNavGrid(
  colliders: readonly BoxCollider[],
  options: { cellSize: number; clearance: number; headroom: number },
): NavGrid {
  const solids = colliders
    // Things above head height (ceilings, the VIP door lintel) do not block walking underneath.
    .filter((c) => c.tag !== 'slab' && c.position[1] - c.half[1] < options.headroom)
    .map((c): NavSolid => ({ ...c, reach: Math.hypot(c.half[0], c.half[2]) }));
  const cell = options.cellSize;
  const cols = Math.ceil(HALL.width / cell);
  const rows = Math.ceil(HALL.depth / cell);
  const x0 = -HALL.width / 2;
  const z0 = -HALL.depth / 2;
  const blocked = new Uint8Array(cols * rows);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (isBlockedAt(solids, options.clearance, x0 + (c + 0.5) * cell, z0 + (r + 0.5) * cell)) {
        blocked[r * cols + c] = 1;
      }
    }
  }
  return { solids, clearance: options.clearance, cell, x0, z0, cols, rows, blocked };
}

const cellOf = (grid: NavGrid, p: Vec2) => ({
  c: Math.min(grid.cols - 1, Math.max(0, Math.floor((p.x - grid.x0) / grid.cell))),
  r: Math.min(grid.rows - 1, Math.max(0, Math.floor((p.z - grid.z0) / grid.cell))),
});

const centreOf = (grid: NavGrid, index: number): Vec2 => ({
  x: grid.x0 + ((index % grid.cols) + 0.5) * grid.cell,
  z: grid.z0 + (Math.floor(index / grid.cols) + 0.5) * grid.cell,
});

/** Closest free cell to `start` (itself when free), searched in growing square rings. */
function nearestFree(grid: NavGrid, start: { c: number; r: number }): number | null {
  const maxRing = Math.ceil(3 / grid.cell);
  for (let ring = 0; ring <= maxRing; ring++) {
    let best: number | null = null;
    let bestDistance = Infinity;
    for (let r = start.r - ring; r <= start.r + ring; r++) {
      for (let c = start.c - ring; c <= start.c + ring; c++) {
        if (Math.max(Math.abs(r - start.r), Math.abs(c - start.c)) !== ring) continue;
        if (r < 0 || c < 0 || r >= grid.rows || c >= grid.cols) continue;
        const index = r * grid.cols + c;
        const distance = Math.hypot(r - start.r, c - start.c);
        if (!grid.blocked[index] && distance < bestDistance) {
          best = index;
          bestDistance = distance;
        }
      }
    }
    if (best !== null) return best;
  }
  return null;
}

/** Binary min-heap of (priority, cell) pairs. */
class Heap {
  private readonly items: { priority: number; index: number }[] = [];
  get size() {
    return this.items.length;
  }
  push(priority: number, index: number) {
    const items = this.items;
    items.push({ priority, index });
    let i = items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      const a = items[i];
      const b = items[parent];
      if (!a || !b || b.priority <= a.priority) break;
      items[i] = b;
      items[parent] = a;
      i = parent;
    }
  }
  pop(): number | undefined {
    const items = this.items;
    const top = items[0];
    const last = items.pop();
    if (!top || !last) return top?.index;
    if (items.length > 0) {
      items[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let smallest = i;
        if (items[l] && items[l].priority < (items[smallest]?.priority ?? Infinity)) smallest = l;
        if (items[r] && items[r].priority < (items[smallest]?.priority ?? Infinity)) smallest = r;
        if (smallest === i) break;
        const a = items[i];
        const b = items[smallest];
        if (!a || !b) break;
        items[i] = b;
        items[smallest] = a;
        i = smallest;
      }
    }
    return top.index;
  }
}

const NEIGHBOURS: readonly (readonly [number, number, number])[] = [
  [1, 0, 1],
  [-1, 0, 1],
  [0, 1, 1],
  [0, -1, 1],
  [1, 1, Math.SQRT2],
  [1, -1, Math.SQRT2],
  [-1, 1, Math.SQRT2],
  [-1, -1, Math.SQRT2],
];

function aStar(grid: NavGrid, start: number, goal: number): number[] | null {
  const { cols, rows, blocked } = grid;
  const cost = new Float64Array(cols * rows).fill(Infinity);
  const from = new Int32Array(cols * rows).fill(-1);
  const goalC = goal % cols;
  const goalR = Math.floor(goal / cols);
  const heuristic = (index: number) => {
    const dc = Math.abs((index % cols) - goalC);
    const dr = Math.abs(Math.floor(index / cols) - goalR);
    return Math.max(dc, dr) + (Math.SQRT2 - 1) * Math.min(dc, dr);
  };
  const open = new Heap();
  cost[start] = 0;
  open.push(heuristic(start), start);
  while (open.size > 0) {
    const current = open.pop();
    if (current === undefined) break;
    if (current === goal) {
      const path = [current];
      let step = current;
      while (from[step] !== -1) {
        step = from[step] ?? -1;
        path.push(step);
      }
      return path.reverse();
    }
    const c = current % cols;
    const r = Math.floor(current / cols);
    const base = cost[current] ?? Infinity;
    for (const [dc, dr, step] of NEIGHBOURS) {
      const nc = c + dc;
      const nr = r + dr;
      if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
      const next = nr * cols + nc;
      if (blocked[next]) continue;
      // No cutting corners between two blocked cells.
      if (dc !== 0 && dr !== 0 && (blocked[r * cols + nc] || blocked[nr * cols + c])) continue;
      const candidate = base + step;
      if (candidate < (cost[next] ?? Infinity)) {
        cost[next] = candidate;
        from[next] = current;
        open.push(candidate + heuristic(next), next);
      }
    }
  }
  return null;
}

/** True when the straight segment keeps the capsule clear of every solid. Endpoints are not tested. */
function lineOfSight(grid: NavGrid, a: Vec2, b: Vec2, step: number): boolean {
  const clearance = grid.clearance - 0.1;
  const length = Math.hypot(b.x - a.x, b.z - a.z);
  const samples = Math.ceil(length / step);
  for (let i = 1; i < samples; i++) {
    const t = i / samples;
    if (isBlockedAt(grid.solids, clearance, a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t)) {
      return false;
    }
  }
  return true;
}

/**
 * Route across the hall from `from` to `to`, avoiding solids. Returns the waypoints after `from`, ending exactly
 * at `to`, straightened wherever the way is clear. Null if either end is walled off.
 */
export function findRoute(grid: NavGrid, from: Vec2, to: Vec2, sightStep: number): Vec2[] | null {
  const start = nearestFree(grid, cellOf(grid, from));
  const goal = nearestFree(grid, cellOf(grid, to));
  if (start === null || goal === null) return null;
  const cells = aStar(grid, start, goal);
  if (!cells) return null;

  // Keep only the cells where the grid path turns; the straight runs between them add nothing.
  const corners = cells.filter((cell, i) => {
    const before = cells[i - 1];
    const after = cells[i + 1];
    if (before === undefined || after === undefined) return true;
    return cell - before !== after - cell;
  });
  const points: Vec2[] = [from, ...corners.map((i) => centreOf(grid, i)), to];
  const route: Vec2[] = [];
  let anchor = 0;
  while (anchor < points.length - 1) {
    let reach = anchor + 1;
    for (let j = points.length - 1; j > anchor + 1; j--) {
      const a = points[anchor];
      const b = points[j];
      if (a && b && lineOfSight(grid, a, b, sightStep)) {
        reach = j;
        break;
      }
    }
    const next = points[reach];
    if (next) route.push(next);
    anchor = reach;
  }
  return route;
}

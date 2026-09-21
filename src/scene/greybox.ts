import { HALL, VIP_DOOR } from './anchors/layout';
import { POKER_TABLES } from './anchors/anchors';
import type { Anchor, Vec3 } from './anchors/types';

export type BoxRole = 'wall' | 'ceiling' | 'bar' | 'furniture' | 'sign';

export interface GreyBox {
  position: Vec3;
  size: Vec3;
  rotationY?: number;
  role: BoxRole;
  collide: boolean;
}

const { width: W, depth: D, wallHeight: H, wallThickness: T, vipHeight: VH } = HALL;
const hx = W / 2;
const hz = D / 2;

/** Walls, ceilings and fixed furniture that don't come from anchors. */
export const STATIC_BOXES: readonly GreyBox[] = [
  { position: [0, H / 2, -hz - T / 2], size: [W + 2 * T, H, T], role: 'wall', collide: true },
  { position: [hx + T / 2, H / 2, 0], size: [T, H, D + 2 * T], role: 'wall', collide: true },
  { position: [-hx - T / 2, H / 2, 0], size: [T, H, D + 2 * T], role: 'wall', collide: true },
  // South wall with the entrance gap in the middle.
  { position: [-16.65, H / 2, hz + T / 2], size: [27.3, H, T], role: 'wall', collide: true },
  { position: [16.65, H / 2, hz + T / 2], size: [27.3, H, T], role: 'wall', collide: true },
  { position: [0, H + T / 2, 0], size: [W + 2 * T, T, D + 2 * T], role: 'ceiling', collide: true },

  // VIP room: three walls, a doorway in the south wall, and a lower ceiling.
  { position: [15.9, VH / 2, -14], size: [0.2, VH, 16], role: 'wall', collide: true },
  {
    position: [(16 + VIP_DOOR.x0) / 2, VH / 2, -6],
    size: [VIP_DOOR.x0 - 16, VH, 0.2],
    role: 'wall',
    collide: true,
  },
  {
    position: [(VIP_DOOR.x1 + 30) / 2, VH / 2, -6],
    size: [30 - VIP_DOOR.x1, VH, 0.2],
    role: 'wall',
    collide: true,
  },
  {
    position: [(VIP_DOOR.x0 + VIP_DOOR.x1) / 2, VH - 0.4, -6],
    size: [VIP_DOOR.x1 - VIP_DOOR.x0, 0.8, 0.2],
    role: 'wall',
    collide: true,
  },
  { position: [23, VH + 0.1, -14], size: [14.4, 0.2, 16.4], role: 'ceiling', collide: true },

  // Bar: counter, back-bar shelving.
  { position: [-24, 0.55, -20.6], size: [8, 1.1, 0.7], role: 'bar', collide: true },
  { position: [-24, 1, -21.75], size: [8, 2, 0.5], role: 'bar', collide: true },

  // Lounge sofas with coffee tables.
  ...[-26, -20].flatMap((x) =>
    [-10, -14].flatMap((z): GreyBox[] => [
      { position: [x, 0.45, z], size: [2.2, 0.9, 0.9], role: 'furniture', collide: true },
      { position: [x, 0.2, z + 1.4], size: [0.9, 0.4, 0.9], role: 'furniture', collide: true },
    ]),
  ),

  // Columns.
  ...[
    [-9, 16],
    [9, 16],
    [-9, -16],
    [9, -16],
  ].map(([x, z]): GreyBox => ({
    position: [x ?? 0, H / 2, z ?? 0],
    size: [0.7, H, 0.7],
    role: 'wall',
    collide: true,
  })),

  // Hanging zone signs (visual only). The poker sign is the largest: it frames the spawn view.
  { position: [0, 4.4, 5], size: [5, 0.8, 0.15], role: 'sign', collide: false },
  { position: [-21, 4.6, 16.5], size: [5, 0.6, 0.15], role: 'sign', collide: false },
  { position: [-3, 4.6, -12], size: [4, 0.6, 0.15], role: 'sign', collide: false },
  { position: [29.5, 4.6, 6], size: [0.15, 0.6, 4], role: 'sign', collide: false },
  { position: [23, 4.6, 21.5], size: [4, 0.6, 0.15], role: 'sign', collide: false },
  { position: [-24, 3.6, -21.4], size: [5, 0.6, 0.15], role: 'sign', collide: false },
];

export const BAR_STOOLS: readonly Vec3[] = Array.from({ length: 10 }, (_, i): Vec3 => [
  -27.4 + i * 0.75,
  0.3,
  -19.5,
]);

/** Ceiling light positions; each gets an emissive panel and a warm point light. */
export const CEILING_LIGHTS: readonly Vec3[] = [
  [0, 5.9, 14],
  [-5, 5.9, 5],
  [5, 5.9, 5],
  [0, 5.9, -3],
  [0, 5.9, -11],
  [-21, 5.9, 12],
  [-21, 5.9, 3],
  [22, 5.9, 6],
  [-22, 5.9, -14],
  [23, 3.9, -14],
  [23, 5.9, 19],
];

export interface BoxCollider {
  /** Anchor id or a name for static geometry; colliders sharing an owner may overlap. */
  owner: string;
  tag: 'prop' | 'wall' | 'slab';
  position: Vec3;
  half: Vec3;
  rotationY: number;
}

/** Rotate an object-local offset into world space. */
function toWorld(a: Anchor, [lx, ly, lz]: Vec3): Vec3 {
  const c = Math.cos(a.rotationY);
  const s = Math.sin(a.rotationY);
  return [a.position[0] + lx * c + lz * s, ly, a.position[2] - lx * s + lz * c];
}

/** Two crossed rectangles that approximate an ellipse without leaving a large gap or overhang. */
function ellipse(a: Anchor, halfLength: number, halfWidth: number): BoxCollider[] {
  return [
    [0.92 * halfLength, 0.38 * halfWidth],
    [0.7 * halfLength, 0.71 * halfWidth],
  ].map(([hl = 0, hw = 0]) => ({
    owner: a.id,
    tag: 'prop',
    position: toWorld(a, [0, 0.4, 0]),
    half: [hl, 0.4, hw],
    rotationY: a.rotationY,
  }));
}

function box(a: Anchor, local: Vec3, half: Vec3): BoxCollider {
  return { owner: a.id, tag: 'prop', position: toWorld(a, local), half, rotationY: a.rotationY };
}

function anchorColliders(anchors: readonly Anchor[]): BoxCollider[] {
  const out: BoxCollider[] = [];

  // A row of slot machines is one long collider rather than dozens of small ones.
  const rows = new Map<string, Anchor[]>();
  for (const a of anchors.filter((x) => x.kind === 'slot')) {
    const key = a.id.split('.').slice(0, 2).join('.');
    rows.set(key, [...(rows.get(key) ?? []), a]);
  }
  for (const [key, row] of rows) {
    const xs = row.map((a) => a.position[0]);
    const first = row[0];
    if (!first) continue;
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    out.push({
      owner: key,
      tag: 'prop',
      position: [(minX + maxX) / 2, 0.95, first.position[2]],
      half: [(maxX - minX) / 2 + 0.375, 0.95, 0.35],
      rotationY: 0,
    });
  }

  for (const a of anchors) {
    switch (a.kind) {
      case 'poker': {
        const format = a.seats.length === 9 ? POKER_TABLES['9max'] : POKER_TABLES['6max'];
        out.push(...ellipse(a, format.halfLength, format.halfWidth));
        break;
      }
      case 'blackjack':
        out.push(box(a, [0, 0.4, 0], [0.95, 0.4, 0.5]));
        break;
      case 'roulette':
        out.push(box(a, [0, 0.4, 0], [1.5, 0.4, 0.7]));
        break;
      case 'baccarat':
        out.push(...ellipse(a, 1.5, 0.75));
        break;
      case 'live-dealer':
        out.push(box(a, [0, 0.55, -0.1], [0.8, 0.55, 0.5]));
        break;
      case 'cashier':
        out.push(box(a, [0, 0.55, 0], [2, 0.55, 0.4]));
        break;
      case 'slot':
        break;
    }
  }
  return out;
}

export function buildColliders(anchors: readonly Anchor[]): BoxCollider[] {
  const staticColliders = STATIC_BOXES.filter((b) => b.collide).map((b, i): BoxCollider => ({
    owner: `static.${i}`,
    tag: b.role === 'ceiling' ? 'slab' : b.role === 'wall' ? 'wall' : 'prop',
    position: b.position,
    half: [b.size[0] / 2, b.size[1] / 2, b.size[2] / 2],
    rotationY: b.rotationY ?? 0,
  }));
  const floor: BoxCollider = {
    owner: 'floor',
    tag: 'slab',
    position: [0, -0.25, 0],
    half: [hx + 1, 0.25, hz + 1],
    rotationY: 0,
  };
  return [floor, ...staticColliders, ...anchorColliders(anchors)];
}

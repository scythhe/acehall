import type { Anchor, AnchorKind, SeatAnchor, Vec3, ZoneId } from './types';

/** Unit vector the object's front points along. Rotation 0 faces +z. */
function front(rotationY: number): readonly [number, number] {
  return [Math.sin(rotationY), Math.cos(rotationY)];
}

const round = (n: number) => Math.round(n * 1000) / 1000;
const vec = (x: number, y: number, z: number): Vec3 => [round(x), round(y), round(z)];

interface SimpleObject {
  id: string;
  kind: AnchorKind;
  zone: ZoneId;
  x: number;
  z: number;
  rotationY: number;
  /** Distance from the object centre to the seat, along the object's front. */
  seatOffset: number;
  /** Height the seated camera looks at. */
  targetY: number;
}

/** An object with a single seat placed straight out from its front. */
function simple(o: SimpleObject): Anchor {
  const [fx, fz] = front(o.rotationY);
  const sx = o.x + fx * o.seatOffset;
  const sz = o.z + fz * o.seatOffset;
  const seat: SeatAnchor = {
    id: `${o.id}.seat1`,
    position: vec(sx, 0, sz),
    rotationY: round(o.rotationY + Math.PI),
    camera: {
      position: vec(sx + fx * 0.35, 1.3, sz + fz * 0.35),
      target: vec(o.x, o.targetY, o.z),
    },
  };
  return {
    id: o.id,
    kind: o.kind,
    zone: o.zone,
    position: vec(o.x, 0, o.z),
    rotationY: round(o.rotationY),
    seats: [seat],
  };
}

export const POKER_TABLES = {
  '9max': { seats: 9, halfLength: 1.35, halfWidth: 0.65 },
  '6max': { seats: 6, halfLength: 1.15, halfWidth: 0.62 },
} as const;

type PokerFormat = keyof typeof POKER_TABLES;

/** Seats sit on an ellipse around the table; the dealer's slot (north side) is left empty. */
function poker(id: string, x: number, z: number, format: PokerFormat): Anchor {
  const { seats: count, halfLength, halfWidth } = POKER_TABLES[format];
  const rx = halfLength + 0.65;
  const rz = halfWidth + 0.65;
  const seats: SeatAnchor[] = [];
  for (let k = 1; k <= count; k++) {
    const t = -Math.PI / 2 + (2 * Math.PI * k) / (count + 1);
    const sx = x + rx * Math.cos(t);
    const sz = z + rz * Math.sin(t);
    const dx = x - sx;
    const dz = z - sz;
    const len = Math.hypot(dx, dz);
    seats.push({
      id: `${id}.seat${k}`,
      position: vec(sx, 0, sz),
      rotationY: round(Math.atan2(dx, dz)),
      camera: {
        position: vec(sx - (dx / len) * 0.45, 1.5, sz - (dz / len) * 0.45),
        target: vec(x, 0.8, z),
      },
    });
  }
  return { id, kind: 'poker', zone: 'tables', position: vec(x, 0, z), rotationY: 0, seats };
}

const SLOT_ROW_Z = [13.85, 13.15, 6.85, 6.15] as const;
export const SLOT_PITCH = 0.95;
export const SLOT_FIRST_X = -28.5;
const SLOTS_PER_ROW = 12;

function slotBank(): Anchor[] {
  const result: Anchor[] = [];
  SLOT_ROW_Z.forEach((z, row) => {
    for (let i = 0; i < SLOTS_PER_ROW; i++) {
      result.push(
        simple({
          id: `slots.row${row + 1}.${String(i + 1).padStart(2, '0')}`,
          kind: 'slot',
          zone: 'slots',
          x: SLOT_FIRST_X + i * SLOT_PITCH,
          z,
          rotationY: row % 2 === 0 ? 0 : Math.PI,
          seatOffset: 1.0,
          targetY: 1.3,
        }),
      );
    }
  });
  return result;
}

const table = (
  id: string,
  kind: AnchorKind,
  zone: ZoneId,
  x: number,
  z: number,
  seatOffset: number,
): Anchor => simple({ id, kind, zone, x, z, rotationY: 0, seatOffset, targetY: 0.8 });

/** Everything the lobby exposes for operators to map games onto. Plain data, no logic beyond placement. */
export const anchors: readonly Anchor[] = [
  ...slotBank(),

  poker('poker.table1', -5.2, 8, '9max'),
  poker('poker.table2', 5.2, 8, '9max'),
  poker('poker.table3', -5.2, 2, '6max'),
  poker('poker.table4', 5.2, 2, '6max'),

  table('blackjack.table1', 'blackjack', 'tables', -7.5, -3, 1.05),
  table('blackjack.table2', 'blackjack', 'tables', -7.5, -7.5, 1.05),
  table('blackjack.table3', 'blackjack', 'tables', -7.5, -12, 1.05),
  table('roulette.table1', 'roulette', 'tables', 7.5, -3, 1.25),
  table('roulette.table2', 'roulette', 'tables', 7.5, -7.5, 1.25),
  table('baccarat.table1', 'baccarat', 'tables', -2.8, -10.5, 1.3),
  table('baccarat.table2', 'baccarat', 'tables', 2.8, -10.5, 1.3),

  ...[11, 7.5, 4, 0.5].map((z, i) =>
    simple({
      id: `live.booth${i + 1}`,
      kind: 'live-dealer',
      zone: 'liveDealer',
      x: 28.4,
      z,
      rotationY: -Math.PI / 2,
      seatOffset: 1.1,
      targetY: 1.2,
    }),
  ),

  table('vip.blackjack1', 'blackjack', 'vip', 20.5, -15, 1.05),
  table('vip.baccarat1', 'baccarat', 'vip', 26, -15, 1.3),

  simple({
    id: 'cashier.desk1',
    kind: 'cashier',
    zone: 'cashier',
    x: 23,
    z: 20,
    rotationY: Math.PI,
    seatOffset: 1.2,
    targetY: 1.2,
  }),
];

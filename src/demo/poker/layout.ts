import { POKER_TABLES } from '../../scene/anchors/anchors';
import type { SceneGameContext } from '../../scene/games/sceneGame';

/** Felt surface height in world space (matches the greybox poker table). */
export const FELT_Y = 0.808;

export interface Spot {
  x: number;
  z: number;
}

export interface SeatSpots {
  /** Where the seated avatar stands. */
  seat: Spot;
  /** Where the seat's hole cards lie. */
  hole: Spot;
  /** Where the seat's current bet is stacked. */
  bet: Spot;
  /** Where the dealer button sits when this seat has it. */
  button: Spot;
  /** Seat heading (0 faces +z). */
  heading: number;
}

export interface PokerLayout {
  center: Spot;
  /** Player's heading; the board is laid out to read correctly from their seat. */
  viewHeading: number;
  seats: readonly SeatSpots[];
}

const at = (center: Spot, edge: Spot, factor: number): Spot => ({
  x: center.x + edge.x * factor,
  z: center.z + edge.z * factor,
});

/** Place each seat's cards, chips and button on the felt, between the seat and the middle of the table. */
export function buildLayout(context: SceneGameContext): PokerLayout {
  const format = context.seats.length === 9 ? POKER_TABLES['9max'] : POKER_TABLES['6max'];
  const center = { x: context.tablePosition[0], z: context.tablePosition[2] };
  const seats = context.seats.map((seat): SeatSpots => {
    const lx = seat.position[0] - center.x;
    const lz = seat.position[2] - center.z;
    // Point where the ray from the middle towards the seat leaves the table's ellipse.
    const k = 1 / Math.hypot(lx / format.halfLength, lz / format.halfWidth);
    const edge = { x: lx * k, z: lz * k };
    const length = Math.hypot(edge.x, edge.z) || 1;
    const side = { x: -edge.z / length, z: edge.x / length };
    const button = at(center, edge, 0.6);
    return {
      seat: { x: seat.position[0], z: seat.position[2] },
      hole: at(center, edge, 0.74),
      bet: at(center, edge, 0.46),
      button: { x: button.x + side.x * 0.32, z: button.z + side.z * 0.32 },
      heading: seat.rotationY,
    };
  });
  const viewHeading = context.seats[context.seatIndex]?.rotationY ?? 0;
  return { center, viewHeading, seats };
}

/** Unit vectors for a viewer facing `heading`: `forward` points away from them, `right` to their right. */
export function axes(heading: number) {
  return {
    forward: { x: Math.sin(heading), z: Math.cos(heading) },
    right: { x: -Math.cos(heading), z: Math.sin(heading) },
  };
}

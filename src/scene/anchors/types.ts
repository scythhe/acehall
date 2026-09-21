import type { ObjectKind } from '../../lib/types';

export type Vec3 = readonly [x: number, y: number, z: number];

/** Internal zone ids. They match the keys of `AceHallConfig.zones`. */
export type ZoneId = 'slots' | 'tables' | 'liveDealer' | 'vip' | 'bar' | 'cashier';

export type AnchorKind = ObjectKind | 'cashier';

export interface SeatAnchor {
  id: string;
  /** Where the avatar ends up, on the floor. For the cashier this is the standing spot. */
  position: Vec3;
  /** Heading of the seated avatar; 0 faces +z. */
  rotationY: number;
  camera: { position: Vec3; target: Vec3 };
}

/** One interactive object. Poker tables carry several seats; everything else has one. */
export interface Anchor {
  id: string;
  kind: AnchorKind;
  zone: ZoneId;
  position: Vec3;
  /** Heading of the object's front; 0 faces +z. */
  rotationY: number;
  seats: readonly SeatAnchor[];
}

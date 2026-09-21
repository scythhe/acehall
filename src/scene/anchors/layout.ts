import type { ZoneId } from './types';

/** Hall footprint in metres. The entrance is a gap in the south wall (+z); the hall is centred on the origin. */
export const HALL = {
  width: 60,
  depth: 44,
  wallHeight: 6,
  vipHeight: 4,
  wallThickness: 0.3,
} as const;

export const ENTRANCE = { x: 0, width: 6 } as const;

export interface Rect {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}

/** Axis-aligned area of each zone; every anchor and seat must fall inside its zone's rectangle. */
export const ZONE_RECTS: Record<ZoneId, Rect> = {
  slots: { x0: -30, x1: -12, z0: -2, z1: 20 },
  tables: { x0: -10, x1: 12, z0: -14, z1: 12 },
  liveDealer: { x0: 14, x1: 30, z0: -2, z1: 14 },
  vip: { x0: 16, x1: 30, z0: -22, z1: -6 },
  bar: { x0: -30, x1: -12, z0: -22, z1: -6 },
  cashier: { x0: 16, x1: 30, z0: 16, z1: 22 },
};

export const VIP_DOOR = { x0: 21, x1: 24 } as const;

/** Debug teleport targets (key 1-7), facing into each zone. */
export const ZONE_VIEWPOINTS: readonly {
  zone: ZoneId | 'spawn';
  position: readonly [number, number, number];
  yaw: number;
}[] = [
  { zone: 'spawn', position: [0, 0, 18], yaw: 0 },
  { zone: 'slots', position: [-13, 0, 10], yaw: Math.PI / 2 },
  { zone: 'tables', position: [0, 0, 4], yaw: 0 },
  { zone: 'liveDealer', position: [18, 0, 5], yaw: -Math.PI / 2 },
  { zone: 'vip', position: [22.5, 0, -4], yaw: 0 },
  { zone: 'bar', position: [-14, 0, -8], yaw: 0.65 },
  { zone: 'cashier', position: [23, 0, 15], yaw: Math.PI },
];

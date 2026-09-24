import type { SeatAnchor, Vec3 } from '../scene/anchors/types';
import type { Vec2 } from '../player/movement';
import type { Router } from './route';

export interface Walker {
  x: number;
  z: number;
  /** Index of the waypoint being walked to; equals the path length when done. */
  index: number;
  speed: number;
  /** Last movement direction (unit), used to turn the avatar. */
  dirX: number;
  dirZ: number;
}

export interface WalkRules {
  speed: number;
  acceleration: number;
  deceleration: number;
  tolerance: number;
}

/** Point straight out from the seat, away from its object, where the avatar lines up before sitting. */
export function approachPoint(seat: SeatAnchor, objectPosition: Vec3, distance: number): Vec2 {
  const [sx, , sz] = seat.position;
  let ox = sx - objectPosition[0];
  let oz = sz - objectPosition[2];
  const length = Math.hypot(ox, oz);
  if (length < 1e-6) {
    ox = -Math.sin(seat.rotationY);
    oz = -Math.cos(seat.rotationY);
  } else {
    ox /= length;
    oz /= length;
  }
  return { x: sx + ox * distance, z: sz + oz * distance };
}

/**
 * Short authored route to a seat. When the avatar is on the outer side of the seat, it first aims at a point
 * straight out from the seat (away from the object), so it arrives from the front instead of cutting a corner.
 */
export function buildPath(
  from: Vec2,
  seat: SeatAnchor,
  objectPosition: Vec3,
  approachDistance: number,
): Vec2[] {
  const [sx, , sz] = seat.position;
  const approach = approachPoint(seat, objectPosition, approachDistance);
  const path: Vec2[] = [];
  const outside =
    ((from.x - sx) * (approach.x - sx) + (from.z - sz) * (approach.z - sz)) / approachDistance;
  if (outside > approachDistance * 0.5) path.push(approach);
  path.push({ x: sx, z: sz });
  return path;
}

/** Route from anywhere in the hall: around obstacles to the approach point, then into the seat. */
export function buildRoutedPath(
  from: Vec2,
  seat: SeatAnchor,
  objectPosition: Vec3,
  approachDistance: number,
  router: Router,
): Vec2[] {
  const approach = approachPoint(seat, objectPosition, approachDistance);
  const route = router(from, approach) ?? [approach];
  return [...route, { x: seat.position[0], z: seat.position[2] }];
}

export function createWalker(from: Vec2, startSpeed: number): Walker {
  return { x: from.x, z: from.z, index: 0, speed: startSpeed, dirX: 0, dirZ: 0 };
}

/** Advance along the path: accelerate, cruise, and slow down to stop exactly on the last waypoint. */
export function advanceWalk(walker: Walker, path: readonly Vec2[], dt: number, rules: WalkRules) {
  const target = path[walker.index];
  if (!target) return;
  const dx = target.x - walker.x;
  const dz = target.z - walker.z;
  const distance = Math.hypot(dx, dz);
  const isLast = walker.index === path.length - 1;
  const cap = isLast
    ? Math.min(rules.speed, Math.max(0.35, Math.sqrt(2 * rules.deceleration * distance)))
    : rules.speed;
  walker.speed = Math.min(cap, walker.speed + rules.acceleration * dt);
  const step = Math.min(distance, walker.speed * dt);
  if (distance > 1e-6) {
    walker.dirX = dx / distance;
    walker.dirZ = dz / distance;
    walker.x += walker.dirX * step;
    walker.z += walker.dirZ * step;
  }
  if (distance - step <= rules.tolerance) {
    walker.x = target.x;
    walker.z = target.z;
    walker.index++;
    if (isLast) walker.speed = 0;
  }
}

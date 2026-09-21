import type { Vec2 } from '../player/movement';
import { clamp } from '../player/cameraMath';
import type { Interactable } from './types';

export interface FocusRules {
  range: number;
  coneHalfAngle: number;
}

/**
 * The interactable the avatar is close to and roughly facing, if any. Distance is measured to the seat; the facing
 * test aims halfway between the seat and the object, so approaching a seat from outside counts as facing it.
 * Closer and better-aligned wins.
 */
export function pickFocus(
  position: Vec2,
  heading: number,
  candidates: readonly Interactable[],
  rules: FocusRules,
): Interactable | null {
  const fx = Math.sin(heading);
  const fz = Math.cos(heading);
  let best: Interactable | null = null;
  let bestScore = Infinity;
  for (const c of candidates) {
    const [sx, , sz] = c.seat.position;
    const distance = Math.hypot(sx - position.x, sz - position.z);
    if (distance > rules.range) continue;
    const dx = (sx + c.objectPosition[0]) / 2 - position.x;
    const dz = (sz + c.objectPosition[2]) / 2 - position.z;
    const length = Math.hypot(dx, dz);
    const angle = length < 1e-3 ? 0 : Math.acos(clamp((fx * dx + fz * dz) / length, -1, 1));
    if (angle > rules.coneHalfAngle) continue;
    const score = distance + angle;
    if (score < bestScore) {
      best = c;
      bestScore = score;
    }
  }
  return best;
}

export interface Vec2 {
  x: number;
  z: number;
}

export interface MoveKeys {
  forward: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
}

/**
 * World-space unit direction the player wants to move, relative to the camera.
 * Camera yaw 0 looks along -z; increasing yaw turns the view to the left.
 */
export function wishDirection(keys: MoveKeys, cameraYaw: number): Vec2 {
  const f = Number(keys.forward) - Number(keys.back);
  const r = Number(keys.right) - Number(keys.left);
  if (f === 0 && r === 0) return { x: 0, z: 0 };
  const sin = Math.sin(cameraYaw);
  const cos = Math.cos(cameraYaw);
  const x = -sin * f + cos * r;
  const z = -cos * f - sin * r;
  const len = Math.hypot(x, z);
  return { x: x / len, z: z / len };
}

/** Move `current` towards `wish * maxSpeed`, limited by acceleration (or deceleration when there is no input). */
export function approachVelocity(
  current: Vec2,
  wish: Vec2,
  maxSpeed: number,
  acceleration: number,
  deceleration: number,
  dt: number,
): Vec2 {
  const target = { x: wish.x * maxSpeed, z: wish.z * maxSpeed };
  const dx = target.x - current.x;
  const dz = target.z - current.z;
  const dist = Math.hypot(dx, dz);
  const rate = wish.x === 0 && wish.z === 0 ? deceleration : acceleration;
  const step = rate * dt;
  if (dist <= step) return target;
  return { x: current.x + (dx / dist) * step, z: current.z + (dz / dist) * step };
}

/** Rotate `current` towards `target` along the shortest arc, by at most `maxStep` radians. */
export function turnToward(current: number, target: number, maxStep: number): number {
  const twoPi = Math.PI * 2;
  const diff = ((((target - current) % twoPi) + 3 * Math.PI) % twoPi) - Math.PI;
  if (Math.abs(diff) <= maxStep) return target;
  return current + Math.sign(diff) * maxStep;
}

/** Unit direction from the pivot to the camera for the given orbit angles. */
export function orbitDirection(yaw: number, pitch: number): [number, number, number] {
  const cp = Math.cos(pitch);
  return [Math.sin(yaw) * cp, Math.sin(pitch), Math.cos(yaw) * cp];
}

/**
 * Spring-arm length: shortens instantly when geometry is in the way (so the camera never sits inside a wall)
 * and eases back out once the way is clear.
 */
export function relaxArm(current: number, allowed: number, dt: number, rate: number): number {
  if (allowed <= current) return allowed;
  return current + (allowed - current) * (1 - Math.exp(-rate * dt));
}

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

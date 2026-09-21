/** Every feel-related constant lives here so it can be adjusted quickly. Units: metres, seconds, radians. */
export const TUNING = {
  player: {
    walkSpeed: 3.2,
    sprintSpeed: 6,
    acceleration: 18,
    deceleration: 22,
    /** How fast the avatar turns towards its movement direction (rad/s). */
    turnRate: 12,
    capsuleRadius: 0.35,
    capsuleHalfHeight: 0.5,
    /** Skin the character controller keeps between the capsule and walls. */
    controllerOffset: 0.02,
  },
  camera: {
    distance: 3.6,
    minDistance: 0.6,
    /** Height of the orbit pivot above the avatar's feet. */
    pivotHeight: 1.55,
    /** Pivot offset to the right of the avatar for an over-the-shoulder view. */
    shoulderOffset: 0.35,
    initialPitch: 0.22,
    minPitch: -0.35,
    maxPitch: 1.2,
    /** Radians of orbit per pixel of pointer movement. */
    sensitivity: 0.0028,
    /** Radius of the sphere cast that keeps the camera out of walls. */
    collisionRadius: 0.25,
    /** Pull-in is instant; this is the rate (1/s) at which the arm relaxes back out. */
    relaxRate: 4,
    fov: 62,
  },
  spawn: {
    position: [0, 0, 18] as const,
    /** Facing down the central aisle (towards -z). */
    facingY: Math.PI,
    /** Camera yaw that looks along the facing direction. */
    cameraYaw: 0,
  },
  debug: {
    anchorMarkerSize: 0.25,
  },
} as const;

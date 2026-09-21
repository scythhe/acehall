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
  interaction: {
    /** Max distance from the avatar to a seat for its prompt to show. */
    range: 2,
    /** Half-angle (rad) of the cone in front of the avatar in which an object counts as "faced". */
    coneHalfAngle: 1.15,
    /** Walk-to-seat: how far out from the seat the path first aims, so the avatar approaches from the front. */
    approachDistance: 0.9,
    walkSpeed: 2.4,
    walkAcceleration: 10,
    walkDeceleration: 12,
    arriveTolerance: 0.03,
    headingTolerance: 0.03,
    sitDuration: 0.7,
    standDuration: 0.6,
    /** Third-person <-> seated camera ease (ease-in-out). */
    cameraEaseDuration: 1,
    /** Avatar height factor when fully seated (procedural sit pose). */
    seatedScaleY: 0.72,
    /** Avatar fades out as the camera gets this close to its head (metres). */
    avatarFadeStart: 1.1,
    avatarFadeEnd: 0.55,
    /** Looking around from the seated camera anchor (radians). */
    seatedLook: { maxYaw: 1.1, maxPitchUp: 0.5, maxPitchDown: 0.6 },
    highlightPulseHz: 1.4,
    highlightMinOpacity: 0.05,
    highlightMaxOpacity: 0.22,
  },
  debug: {
    anchorMarkerSize: 0.25,
  },
} as const;

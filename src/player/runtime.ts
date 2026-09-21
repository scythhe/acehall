import { Vector3 } from 'three';
import type { RapierRigidBody } from '@react-three/rapier';
import { TUNING } from '../tuning';

export interface Controls {
  forward: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;
  /** Camera orbit angles; yaw 0 looks along -z. */
  yaw: number;
  pitch: number;
}

/** Mutable per-frame state shared by input, controller, camera and debug tools. Deliberately not React state. */
export interface PlayerRuntime {
  controls: Controls;
  /** Feet position. */
  position: Vector3;
  velocity: { x: number; z: number };
  /** Avatar heading; 0 faces +z. */
  heading: number;
  body: RapierRigidBody | null;
  teleport: { position: readonly [number, number, number]; yaw: number } | null;
}

export function createPlayerRuntime(): PlayerRuntime {
  return {
    controls: {
      forward: false,
      back: false,
      left: false,
      right: false,
      sprint: false,
      yaw: TUNING.spawn.cameraYaw,
      pitch: TUNING.camera.initialPitch,
    },
    position: new Vector3(...TUNING.spawn.position),
    velocity: { x: 0, z: 0 },
    heading: TUNING.spawn.facingY,
    body: null,
    teleport: null,
  };
}

import { Vector3 } from 'three';
import type { RapierRigidBody } from '@react-three/rapier';
import { createInteractionState, type InteractionState } from '../interaction/machine';
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
  /** One-shot requests, consumed by the interaction step. */
  interactPressed: boolean;
  cancelPressed: boolean;
  /** Request to walk to a game (game list). Matches an anchor, or the nearest seat of a game. Consumed by the step. */
  goTo: { anchorId?: string; gameId?: string } | null;
  /** True while a sit-down sequence owns the avatar and camera: movement and orbit input are ignored. */
  locked: boolean;
  /** What pointer drags do: orbit the avatar camera, look around from the seat, or nothing. */
  lookMode: 'orbit' | 'seat' | 'none';
  /** Look offsets from the seated camera anchor. */
  seatYaw: number;
  seatPitch: number;
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
  interaction: InteractionState;
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
      interactPressed: false,
      cancelPressed: false,
      goTo: null,
      locked: false,
      lookMode: 'orbit',
      seatYaw: 0,
      seatPitch: 0,
    },
    position: new Vector3(...TUNING.spawn.position),
    velocity: { x: 0, z: 0 },
    heading: TUNING.spawn.facingY,
    body: null,
    interaction: createInteractionState(),
    teleport: null,
  };
}

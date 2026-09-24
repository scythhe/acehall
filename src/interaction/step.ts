import { TUNING } from '../tuning';
import { turnToward, type Vec2 } from '../player/movement';
import type { PlayerRuntime } from '../player/runtime';
import { advanceWalk } from './path';
import {
  beginWalk,
  cancelWalk,
  finishWalk,
  requestLeave,
  tick,
  type InteractionPhase,
} from './machine';
import { pickFocus } from './proximity';
import type { Router } from './route';
import type { Interactable } from './types';

const I = TUNING.interaction;

export type InteractionEvent =
  | { type: 'focus'; target: Interactable | null }
  /** Fired on every phase change, with the target the phase belongs to. */
  | { type: 'phase'; phase: InteractionPhase; target: Interactable }
  | { type: 'cashier'; target: Interactable };

export interface InteractionEnv {
  interactables: readonly Interactable[];
  /** Routes long walks around obstacles; without it the walk is the short authored approach. */
  router?: Router;
  emit(event: InteractionEvent): void;
}

/** Camera yaw that looks along the avatar's facing direction (yaw 0 looks along -z, heading 0 faces +z). */
export const yawBehind = (heading: number) => heading - Math.PI;

/** The seat closest to the player that matches a walk-to request. */
function nearestTarget(
  interactables: readonly Interactable[],
  from: Vec2,
  request: NonNullable<PlayerRuntime['controls']['goTo']>,
): Interactable | null {
  let best: Interactable | null = null;
  let bestDistance = Infinity;
  for (const item of interactables) {
    if (item.kind === 'cashier') continue;
    if (request.anchorId !== undefined && item.anchorId !== request.anchorId) continue;
    if (request.gameId !== undefined && item.gameId !== request.gameId) continue;
    const distance = Math.hypot(item.seat.position[0] - from.x, item.seat.position[2] - from.z);
    if (distance < bestDistance) {
      best = item;
      bestDistance = distance;
    }
  }
  return best;
}

/**
 * Per-frame interaction logic: proximity focus, E to start, the walk to the seat, and the timed phases.
 * While the phase is not `free` this owns the avatar's position and heading.
 */
export function stepInteraction(runtime: PlayerRuntime, env: InteractionEnv, dt: number) {
  const { interaction: state, controls, position, velocity } = runtime;
  const interact = controls.interactPressed;
  const cancel = controls.cancelPressed;
  const goTo = controls.goTo;
  controls.interactPressed = false;
  controls.cancelPressed = false;
  controls.goTo = null;

  const emitPhase = (phase: InteractionPhase, target: Interactable) =>
    env.emit({ type: 'phase', phase, target });

  if (state.phase === 'free') {
    const focus = pickFocus(position, runtime.heading, env.interactables, I);
    const key = focus?.key ?? null;
    if (key !== state.focusKey) {
      state.focusKey = key;
      env.emit({ type: 'focus', target: focus });
    }
    const requested = goTo ? nearestTarget(env.interactables, position, goTo) : null;
    const chosen = interact && focus ? focus : requested;
    if (chosen) {
      if (chosen.kind === 'cashier') {
        env.emit({ type: 'cashier', target: chosen });
      } else {
        beginWalk(state, chosen, position, Math.hypot(velocity.x, velocity.z), env.router);
        velocity.x = velocity.z = 0;
        state.focusKey = null;
        env.emit({ type: 'focus', target: null });
        emitPhase('walking', chosen);
      }
    }
  } else if (state.target) {
    const target = state.target;
    if (state.phase === 'walking') {
      if (cancel) {
        cancelWalk(state);
        emitPhase('free', target);
      } else {
        advanceWalk(state.walker, state.path, dt, {
          speed: I.walkSpeed,
          acceleration: I.walkAcceleration,
          deceleration: I.walkDeceleration,
          tolerance: I.arriveTolerance,
        });
        position.x = state.walker.x;
        position.z = state.walker.z;
        const step = TUNING.player.turnRate * dt;
        const done = state.walker.index >= state.path.length;
        if (!done && state.walker.speed > 0) {
          runtime.heading = turnToward(
            runtime.heading,
            Math.atan2(state.walker.dirX, state.walker.dirZ),
            step,
          );
        } else if (done) {
          runtime.heading = turnToward(runtime.heading, target.seat.rotationY, step);
          if (Math.abs(runtime.heading - target.seat.rotationY) < I.headingTolerance) {
            runtime.heading = target.seat.rotationY;
            finishWalk(state);
            controls.seatYaw = controls.seatPitch = 0;
            emitPhase('sitting', target);
          }
        }
      }
    } else if (state.phase === 'seated' && (cancel || interact) && requestLeave(state)) {
      // Leaving: the camera returns to the orbit rig, which should look the way the avatar faces.
      controls.yaw = yawBehind(runtime.heading);
      controls.pitch = TUNING.camera.initialPitch;
      emitPhase('easingOut', target);
    }

    const entered = tick(state, dt);
    if (entered) {
      emitPhase(entered, target);
      if (entered === 'free') state.target = null;
    }
  }

  controls.locked = state.phase !== 'free';
  controls.lookMode =
    state.phase === 'free'
      ? 'orbit'
      : state.phase === 'easingIn' || state.phase === 'seated'
        ? 'seat'
        : 'none';
}

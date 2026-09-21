import { TUNING } from '../tuning';
import type { Vec2 } from '../player/movement';
import { clamp01, easeInOutCubic } from './easing';
import { buildPath, createWalker, type Walker } from './path';
import type { Interactable } from './types';

const I = TUNING.interaction;

/**
 * free -> walking -> sitting -> easingIn -> seated -> easingOut -> standing -> free.
 * The reverse of the sit-down sequence: camera eases back first, then the avatar stands, then input unlocks.
 */
export type InteractionPhase =
  'free' | 'walking' | 'sitting' | 'easingIn' | 'seated' | 'easingOut' | 'standing';

export interface InteractionState {
  phase: InteractionPhase;
  target: Interactable | null;
  /** Seconds spent in the current phase. */
  elapsed: number;
  path: Vec2[];
  walker: Walker;
  /** Key of the interactable currently offered as a prompt (only while free). */
  focusKey: string | null;
}

export function createInteractionState(): InteractionState {
  return {
    phase: 'free',
    target: null,
    elapsed: 0,
    path: [],
    walker: createWalker({ x: 0, z: 0 }, 0),
    focusKey: null,
  };
}

function enter(state: InteractionState, phase: InteractionPhase) {
  state.phase = phase;
  state.elapsed = 0;
}

export function beginWalk(
  state: InteractionState,
  target: Interactable,
  from: Vec2,
  startSpeed: number,
) {
  if (state.phase !== 'free') return;
  state.target = target;
  state.path = buildPath(from, target.seat, target.objectPosition, I.approachDistance);
  state.walker = createWalker(from, Math.min(startSpeed, I.walkSpeed));
  enter(state, 'walking');
}

/** Abort the walk (Esc). The avatar simply stops where it is. */
export function cancelWalk(state: InteractionState) {
  if (state.phase !== 'walking') return;
  state.target = null;
  state.path = [];
  enter(state, 'free');
}

export function finishWalk(state: InteractionState) {
  if (state.phase === 'walking') enter(state, 'sitting');
}

export function requestLeave(state: InteractionState): boolean {
  if (state.phase !== 'seated') return false;
  enter(state, 'easingOut');
  return true;
}

/** Advance the timed phases. Returns the phase entered, if it changed. */
export function tick(state: InteractionState, dt: number): InteractionPhase | null {
  state.elapsed += dt;
  switch (state.phase) {
    case 'sitting':
      if (state.elapsed < I.sitDuration) return null;
      enter(state, 'easingIn');
      return 'easingIn';
    case 'easingIn':
      if (state.elapsed < I.cameraEaseDuration) return null;
      enter(state, 'seated');
      return 'seated';
    case 'easingOut':
      if (state.elapsed < I.cameraEaseDuration) return null;
      enter(state, 'standing');
      return 'standing';
    case 'standing':
      if (state.elapsed < I.standDuration) return null;
      enter(state, 'free');
      return 'free';
    default:
      return null;
  }
}

/** 0 = third-person orbit camera, 1 = seated camera anchor. */
export function cameraBlend({ phase, elapsed }: InteractionState): number {
  switch (phase) {
    case 'easingIn':
      return easeInOutCubic(elapsed / I.cameraEaseDuration);
    case 'seated':
      return 1;
    case 'easingOut':
      return 1 - easeInOutCubic(elapsed / I.cameraEaseDuration);
    default:
      return 0;
  }
}

/** 0 = standing, 1 = fully seated pose. */
export function sitAmount({ phase, elapsed }: InteractionState): number {
  switch (phase) {
    case 'sitting':
      return easeInOutCubic(elapsed / I.sitDuration);
    case 'easingIn':
    case 'seated':
    case 'easingOut':
      return 1;
    case 'standing':
      return 1 - easeInOutCubic(clamp01(elapsed / I.standDuration));
    default:
      return 0;
  }
}

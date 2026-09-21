import { TUNING } from '../tuning';
import { clamp } from './cameraMath';
import type { Controls } from './runtime';

const KEY_MAP: Record<string, true> = {
  KeyW: true,
  ArrowUp: true,
  KeyS: true,
  ArrowDown: true,
  KeyA: true,
  ArrowLeft: true,
  KeyD: true,
  ArrowRight: true,
  ShiftLeft: true,
  ShiftRight: true,
};

/** A click that moves less than this many pixels counts as a click, not an orbit drag. */
const CLICK_SLOP_PX = 5;

/**
 * Keyboard and pointer input for one lobby. Listeners are attached to the AceHall root element, never `window`,
 * so an embedded lobby does not steal keys from the host page.
 */
export function attachControls(
  root: HTMLElement,
  canvas: HTMLCanvasElement,
  controls: Controls,
): () => void {
  const orbit = (dx: number, dy: number) => {
    if (controls.lookMode === 'none') return;
    if (controls.lookMode === 'seat') {
      const look = TUNING.interaction.seatedLook;
      controls.seatYaw = clamp(
        controls.seatYaw - dx * TUNING.camera.sensitivity,
        -look.maxYaw,
        look.maxYaw,
      );
      controls.seatPitch = clamp(
        controls.seatPitch - dy * TUNING.camera.sensitivity,
        -look.maxPitchDown,
        look.maxPitchUp,
      );
      return;
    }
    controls.yaw -= dx * TUNING.camera.sensitivity;
    controls.pitch = clamp(
      controls.pitch + dy * TUNING.camera.sensitivity,
      TUNING.camera.minPitch,
      TUNING.camera.maxPitch,
    );
  };

  // Track physical keys, so holding W and ArrowUp together and releasing one keeps you moving.
  const held = new Set<string>();
  const sync = () => {
    controls.forward = held.has('KeyW') || held.has('ArrowUp');
    controls.back = held.has('KeyS') || held.has('ArrowDown');
    controls.left = held.has('KeyA') || held.has('ArrowLeft');
    controls.right = held.has('KeyD') || held.has('ArrowRight');
    controls.sprint = held.has('ShiftLeft') || held.has('ShiftRight');
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'KeyE' && !e.repeat) controls.interactPressed = true;
    if (e.code === 'Escape' && !e.repeat) controls.cancelPressed = true;
    if (!(e.code in KEY_MAP)) return;
    held.add(e.code);
    sync();
    e.preventDefault();
  };
  const onKeyUp = (e: KeyboardEvent) => {
    if (!(e.code in KEY_MAP)) return;
    held.delete(e.code);
    sync();
    e.preventDefault();
  };
  const releaseAll = () => {
    held.clear();
    sync();
  };

  let dragId: number | null = null;
  let dragDistance = 0;

  const onPointerDown = (e: PointerEvent) => {
    root.focus({ preventScroll: true });
    if (document.pointerLockElement === canvas || controls.lookMode === 'none') return;
    dragId = e.pointerId;
    dragDistance = 0;
    canvas.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: PointerEvent) => {
    if (document.pointerLockElement === canvas) {
      orbit(e.movementX, e.movementY);
    } else if (dragId === e.pointerId) {
      dragDistance += Math.abs(e.movementX) + Math.abs(e.movementY);
      orbit(e.movementX, e.movementY);
    }
  };
  const onPointerUp = (e: PointerEvent) => {
    if (dragId !== e.pointerId) return;
    dragId = null;
    if (dragDistance < CLICK_SLOP_PX) {
      // Pointer lock is optional: it can be refused (iframes without allow="pointer-lock", headless browsers).
      void Promise.resolve(canvas.requestPointerLock()).catch(() => undefined);
    }
  };

  root.addEventListener('keydown', onKeyDown);
  root.addEventListener('keyup', onKeyUp);
  root.addEventListener('blur', releaseAll);
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);

  return () => {
    root.removeEventListener('keydown', onKeyDown);
    root.removeEventListener('keyup', onKeyUp);
    root.removeEventListener('blur', releaseAll);
    canvas.removeEventListener('pointerdown', onPointerDown);
    canvas.removeEventListener('pointermove', onPointerMove);
    canvas.removeEventListener('pointerup', onPointerUp);
    canvas.removeEventListener('pointercancel', onPointerUp);
    if (document.pointerLockElement === canvas) document.exitPointerLock();
  };
}

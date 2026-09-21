import { useEffect, type RefObject } from 'react';
import { useThree } from '@react-three/fiber';
import { useLobby } from '../../lib/storeContext';
import type { PlayerRuntime } from '../../player/runtime';
import { ZONE_VIEWPOINTS } from '../anchors/layout';

/** Layouts put the key left of 1 under different codes/characters (ISO Mac: IntlBackslash, '§', '±'). */
const isToggleKey = (e: KeyboardEvent) =>
  e.code === 'Backquote' ||
  e.code === 'IntlBackslash' ||
  e.code === 'F2' ||
  ['`', '§', '±'].includes(e.key);

/** `` ` `` (or F2) toggles the anchor/collider overlay. Keys 1-7 (also numpad) teleport to each zone, overlay or not. */
export function DebugKeys({ runtimeRef }: { runtimeRef: RefObject<PlayerRuntime> }) {
  const gl = useThree((s) => s.gl);
  const toggleDebug = useLobby((s) => s.toggleDebug);

  useEffect(() => {
    const root = gl.domElement.closest<HTMLElement>('[data-acehall]');
    if (!root) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (isToggleKey(e)) {
        toggleDebug();
        return;
      }
      const match = /^(?:Digit|Numpad)([1-7])$/.exec(e.code);
      const viewpoint = match?.[1] ? ZONE_VIEWPOINTS[Number(match[1]) - 1] : undefined;
      if (viewpoint)
        runtimeRef.current.teleport = { position: viewpoint.position, yaw: viewpoint.yaw };
    };
    root.addEventListener('keydown', onKeyDown);
    return () => {
      root.removeEventListener('keydown', onKeyDown);
    };
  }, [gl, toggleDebug, runtimeRef]);

  return null;
}

import { useMemo, useRef } from 'react';
import { AdditiveBlending, type MeshBasicMaterial } from 'three';
import { useFrame } from '@react-three/fiber';
import { useLobby } from '../lib/storeContext';
import { POKER_TABLES } from '../scene/anchors/anchors';
import type { Anchor } from '../scene/anchors/types';
import { TUNING } from '../tuning';

const I = TUNING.interaction;

type Bounds =
  | { shape: 'box'; size: readonly [number, number, number]; y: number; z?: number }
  | { shape: 'ellipse'; halfLength: number; halfWidth: number; height: number };

/** Object-local bounds (front = +z), matching the greybox props and colliders, slightly inflated. */
function boundsFor(anchor: Anchor): Bounds {
  switch (anchor.kind) {
    case 'slot':
      return { shape: 'box', size: [0.85, 2.0, 0.8], y: 1 };
    case 'poker': {
      const t = anchor.seats.length === 9 ? POKER_TABLES['9max'] : POKER_TABLES['6max'];
      return {
        shape: 'ellipse',
        halfLength: t.halfLength + 0.08,
        halfWidth: t.halfWidth + 0.08,
        height: 0.9,
      };
    }
    case 'baccarat':
      return { shape: 'ellipse', halfLength: 1.58, halfWidth: 0.83, height: 0.9 };
    case 'blackjack':
      return { shape: 'box', size: [2.0, 0.9, 1.1], y: 0.45 };
    case 'roulette':
      return { shape: 'box', size: [3.1, 0.9, 1.5], y: 0.45 };
    case 'live-dealer':
      return { shape: 'box', size: [1.7, 1.2, 1.1], y: 0.6, z: -0.1 };
    case 'cashier':
      return { shape: 'box', size: [4.1, 1.2, 0.9], y: 0.6 };
  }
}

interface Props {
  anchors: readonly Anchor[];
  color: string;
}

/**
 * Subtle additive pulse over the focused object, plus a ring on the floor at the focused seat. Independent of how
 * the object is drawn (instanced, grouped or later a loaded model).
 */
export function Highlight({ anchors, color }: Props) {
  const focus = useLobby((s) => s.focus);
  const body = useRef<MeshBasicMaterial>(null);
  const ring = useRef<MeshBasicMaterial>(null);
  const anchor = useMemo(
    () => anchors.find((a) => a.id === focus?.anchorId),
    [anchors, focus?.anchorId],
  );

  useFrame(({ clock }) => {
    const wave = 0.5 + 0.5 * Math.sin(clock.elapsedTime * Math.PI * 2 * I.highlightPulseHz);
    const opacity = I.highlightMinOpacity + (I.highlightMaxOpacity - I.highlightMinOpacity) * wave;
    if (body.current) body.current.opacity = opacity;
    if (ring.current) ring.current.opacity = opacity * 3;
  });

  if (!focus || !anchor) return null;
  const bounds = boundsFor(anchor);
  const material = (ref: typeof body) => (
    <meshBasicMaterial
      ref={ref}
      color={color}
      transparent
      blending={AdditiveBlending}
      depthWrite={false}
      toneMapped={false}
    />
  );

  return (
    <>
      <group position={[...anchor.position]} rotation={[0, anchor.rotationY, 0]}>
        {bounds.shape === 'box' ? (
          <mesh position={[0, bounds.y, bounds.z ?? 0]}>
            <boxGeometry args={[...bounds.size]} />
            {material(body)}
          </mesh>
        ) : (
          <mesh
            position={[0, bounds.height / 2, 0]}
            scale={[bounds.halfLength, 1, bounds.halfWidth]}
          >
            <cylinderGeometry args={[1, 1, bounds.height, 40]} />
            {material(body)}
          </mesh>
        )}
      </group>
      <mesh
        position={[focus.seat.position[0], 0.03, focus.seat.position[2]]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[0.32, 0.42, 32]} />
        {material(ring)}
      </mesh>
    </>
  );
}

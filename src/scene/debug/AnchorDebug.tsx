import { useMemo } from 'react';
import { Html } from '@react-three/drei';
import { Instanced } from '../props/Instanced';
import { TUNING } from '../../tuning';
import type { Anchor, AnchorKind } from '../anchors/types';

const KIND_COLORS: Record<AnchorKind, string> = {
  slot: '#ffd23f',
  poker: '#ff4d6d',
  blackjack: '#4dd2ff',
  roulette: '#7dff6b',
  baccarat: '#c77dff',
  'live-dealer': '#ff9f43',
  cashier: '#ffffff',
};

const SIZE = TUNING.debug.anchorMarkerSize;

/** Marks each anchor (coloured by kind), its seat spots, and the line from seated camera to target. */
export function AnchorDebug({ anchors }: { anchors: readonly Anchor[] }) {
  const seats = useMemo(
    () =>
      anchors.flatMap((a) =>
        a.seats.map((s) => ({ position: [s.position[0], 0.06, s.position[2]] as const })),
      ),
    [anchors],
  );
  const cameraLines = useMemo(
    () =>
      new Float32Array(
        anchors.flatMap((a) => a.seats.flatMap((s) => [...s.camera.position, ...s.camera.target])),
      ),
    [anchors],
  );

  return (
    <>
      {anchors.map((a) => {
        const isSlot = a.kind === 'slot';
        // Slot rows are dense: label only the ends of each row.
        const showLabel = !isSlot || a.id.endsWith('.01') || a.id.endsWith('.12');
        return (
          <group key={a.id} position={[a.position[0], 2.3, a.position[2]]}>
            <mesh renderOrder={999}>
              <boxGeometry args={[SIZE, SIZE, SIZE]} />
              <meshBasicMaterial color={KIND_COLORS[a.kind]} depthTest={false} />
            </mesh>
            {showLabel && (
              <Html
                center
                distanceFactor={14}
                position={[0, 0.35, 0]}
                style={{ pointerEvents: 'none' }}
              >
                <div
                  style={{
                    font: '600 11px monospace',
                    color: '#fff',
                    background: 'rgba(0,0,0,0.65)',
                    padding: '1px 4px',
                    borderRadius: 3,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {a.id}
                </div>
              </Html>
            )}
          </group>
        );
      })}
      <Instanced
        items={seats}
        shape={{ cylinder: [0.18, 0.04] }}
        color="#00ff88"
        emissive="#00ff88"
      />
      <lineSegments renderOrder={998}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[cameraLines, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#ffffff" transparent opacity={0.5} depthTest={false} />
      </lineSegments>
    </>
  );
}

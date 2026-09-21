import { useMemo } from 'react';
import { ExtrudeGeometry, Shape } from 'three';
import { POKER_TABLES } from '../anchors/anchors';
import type { Anchor } from '../anchors/types';

export interface TableColors {
  felt: string;
  rail: string;
  neon: string;
  accent: string;
}

interface TableProps {
  anchor: Anchor;
  colors: TableColors;
}

const TOP_Y = 0.76;

/** Tables are built in object-local space (front = +z) and placed by the anchor's transform. */
function Placed({ anchor, children }: { anchor: Anchor; children: React.ReactNode }) {
  return (
    <group position={[...anchor.position]} rotation={[0, anchor.rotationY, 0]}>
      {children}
    </group>
  );
}

function EllipseTable({
  halfLength,
  halfWidth,
  colors,
}: {
  halfLength: number;
  halfWidth: number;
  colors: TableColors;
}) {
  return (
    <>
      <mesh position={[0, 0.36, 0]}>
        <boxGeometry args={[0.5, 0.72, 0.3]} />
        <meshStandardMaterial color={colors.rail} roughness={0.7} />
      </mesh>
      <mesh position={[0, TOP_Y, 0]} scale={[halfLength, 1, halfWidth]}>
        <cylinderGeometry args={[1, 1, 0.08, 48]} />
        <meshStandardMaterial color={colors.rail} roughness={0.6} />
      </mesh>
      <mesh position={[0, TOP_Y + 0.002, 0]} scale={[halfLength - 0.13, 1, halfWidth - 0.13]}>
        <cylinderGeometry args={[1, 1, 0.09, 48]} />
        <meshStandardMaterial color={colors.felt} roughness={0.95} />
      </mesh>
    </>
  );
}

export function PokerTable({ anchor, colors }: TableProps) {
  const { halfLength, halfWidth } =
    anchor.seats.length === 9 ? POKER_TABLES['9max'] : POKER_TABLES['6max'];
  return (
    <Placed anchor={anchor}>
      <EllipseTable halfLength={halfLength} halfWidth={halfWidth} colors={colors} />
      {/* Dealer button marker on the north side, where no seat is placed. */}
      <mesh position={[0, TOP_Y + 0.06, -halfWidth + 0.25]}>
        <boxGeometry args={[0.3, 0.04, 0.2]} />
        <meshStandardMaterial
          color={colors.accent}
          emissive={colors.accent}
          emissiveIntensity={0.5}
        />
      </mesh>
    </Placed>
  );
}

export function BaccaratTable({ anchor, colors }: TableProps) {
  return (
    <Placed anchor={anchor}>
      <EllipseTable halfLength={1.5} halfWidth={0.75} colors={colors} />
    </Placed>
  );
}

const RADIUS = 1.1;

/** Half-disc footprint whose flat (dealer) side faces -z and whose curve faces the players. */
function useHalfDisc(radius: number, depth: number) {
  return useMemo(() => {
    const shape = new Shape();
    shape.absarc(0, 0, radius, Math.PI, 2 * Math.PI, false);
    shape.closePath();
    const geometry = new ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 24 });
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(0, 0, -RADIUS / 2);
    return geometry;
  }, [radius, depth]);
}

export function BlackjackTable({ anchor, colors }: TableProps) {
  const body = useHalfDisc(RADIUS, TOP_Y);
  const felt = useHalfDisc(RADIUS - 0.12, 0.03);
  return (
    <Placed anchor={anchor}>
      <mesh geometry={body}>
        <meshStandardMaterial color={colors.rail} roughness={0.7} />
      </mesh>
      <mesh geometry={felt} position={[0, TOP_Y, 0]}>
        <meshStandardMaterial color={colors.felt} roughness={0.95} />
      </mesh>
    </Placed>
  );
}

export function RouletteTable({ anchor, colors }: TableProps) {
  return (
    <Placed anchor={anchor}>
      <mesh position={[0, TOP_Y / 2, 0]}>
        <boxGeometry args={[3, TOP_Y, 1.4]} />
        <meshStandardMaterial color={colors.rail} roughness={0.7} />
      </mesh>
      <mesh position={[0, TOP_Y + 0.015, 0]}>
        <boxGeometry args={[2.85, 0.03, 1.25]} />
        <meshStandardMaterial color={colors.felt} roughness={0.95} />
      </mesh>
      <mesh position={[-1.0, TOP_Y + 0.08, -0.15]}>
        <cylinderGeometry args={[0.36, 0.36, 0.12, 32]} />
        <meshStandardMaterial
          color={colors.accent}
          emissive={colors.accent}
          emissiveIntensity={0.3}
        />
      </mesh>
    </Placed>
  );
}

export function LiveBooth({ anchor, colors }: TableProps) {
  return (
    <Placed anchor={anchor}>
      <mesh position={[0, 0.4, 0]}>
        <boxGeometry args={[1.6, 0.8, 0.8]} />
        <meshStandardMaterial color={colors.rail} roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.55, -0.5]}>
        <boxGeometry args={[1.6, 1, 0.06]} />
        <meshStandardMaterial
          color={colors.neon}
          emissive={colors.neon}
          emissiveIntensity={0.9}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, 0.8, -0.5]}>
        <boxGeometry args={[0.2, 0.9, 0.2]} />
        <meshStandardMaterial color={colors.rail} />
      </mesh>
    </Placed>
  );
}

export function CashierDesk({ anchor, colors }: TableProps) {
  return (
    <Placed anchor={anchor}>
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[4, 1.1, 0.8]} />
        <meshStandardMaterial color={colors.rail} roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.55, -0.2]}>
        <boxGeometry args={[4, 0.9, 0.05]} />
        <meshStandardMaterial
          color={colors.accent}
          emissive={colors.accent}
          emissiveIntensity={0.35}
          toneMapped={false}
        />
      </mesh>
    </Placed>
  );
}

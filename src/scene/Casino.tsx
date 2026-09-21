import { useMemo } from 'react';
import { Color } from 'three';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import type { ResolvedConfig } from '../config/defaults';
import { HALL, ZONE_RECTS } from './anchors/layout';
import type { Anchor } from './anchors/types';
import { BAR_STOOLS, buildColliders, CEILING_LIGHTS, STATIC_BOXES, type BoxRole } from './greybox';
import { Instanced, type InstanceItem } from './props/Instanced';
import {
  BaccaratTable,
  BlackjackTable,
  CashierDesk,
  LiveBooth,
  PokerTable,
  RouletteTable,
  type TableColors,
} from './props/tables';

interface CasinoProps {
  anchors: readonly Anchor[];
  colors: ResolvedConfig['brand']['colors'];
}

/** Same hue as the brand carpet (shifted), with fixed saturation/lightness so the greybox stays readable. */
const shade = (base: string, hueShift: number, saturation: number, lightness: number) => {
  const hsl = { h: 0, s: 0, l: 0 };
  new Color(base).getHSL(hsl);
  return `#${new Color().setHSL((hsl.h + hueShift + 1) % 1, saturation, lightness).getHexString()}`;
};

export function Casino({ anchors, colors }: CasinoProps) {
  const palette = useMemo(
    () => ({
      floor: shade(colors.carpet, 0, 0.15, 0.2),
      zones: {
        slots: shade(colors.carpet, 0, 0.45, 0.3),
        tables: shade(colors.carpet, 0.35, 0.4, 0.27),
        liveDealer: shade(colors.carpet, -0.15, 0.35, 0.3),
        vip: shade(colors.carpet, 0.05, 0.5, 0.34),
        bar: shade(colors.carpet, 0.15, 0.3, 0.28),
        cashier: shade(colors.carpet, -0.05, 0.3, 0.3),
      },
      roles: {
        wall: '#6a5f7c',
        ceiling: '#8a7f9c',
        bar: '#6b4a34',
        furniture: '#7a3b52',
        sign: colors.neon,
      } satisfies Record<BoxRole, string>,
      table: {
        felt: '#0f5d3a',
        rail: '#4a2f22',
        neon: colors.neon,
        accent: colors.accent,
      } satisfies TableColors,
    }),
    [colors],
  );

  return (
    <>
      <Lighting />
      <Floor palette={palette} />
      {STATIC_BOXES.map((box, i) => (
        <mesh key={i} position={[...box.position]} rotation={[0, box.rotationY ?? 0, 0]}>
          <boxGeometry args={[...box.size]} />
          {box.role === 'sign' ? (
            <meshStandardMaterial
              color={palette.roles.sign}
              emissive={palette.roles.sign}
              emissiveIntensity={1.2}
              toneMapped={false}
            />
          ) : (
            <meshStandardMaterial color={palette.roles[box.role]} roughness={0.85} />
          )}
        </mesh>
      ))}
      <Instanced
        items={BAR_STOOLS.map((position) => ({ position }))}
        shape={{ cylinder: [0.22, 0.6] }}
        color={colors.accent}
      />
      <AnchorProps anchors={anchors} colors={palette.table} />
      <Colliders anchors={anchors} />
    </>
  );
}

function Lighting() {
  return (
    <>
      <hemisphereLight args={['#ffe9d0', '#60506a', 2.2]} />
      <ambientLight intensity={0.5} />
      {CEILING_LIGHTS.map((position, i) => (
        <pointLight
          key={i}
          position={[position[0], position[1] - 0.4, position[2]]}
          intensity={28}
          distance={16}
          color="#ffd9a8"
        />
      ))}
      <Instanced
        items={CEILING_LIGHTS.map((position) => ({ position }))}
        shape={{ box: [1.4, 0.06, 1.4] }}
        color="#fff3dc"
        emissive="#fff0d0"
        emissiveIntensity={1.5}
      />
    </>
  );
}

function Floor({
  palette,
}: {
  palette: { floor: string; zones: Record<keyof typeof ZONE_RECTS, string> };
}) {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[HALL.width, HALL.depth]} />
        <meshStandardMaterial color={palette.floor} roughness={1} />
      </mesh>
      {(Object.keys(ZONE_RECTS) as (keyof typeof ZONE_RECTS)[]).map((zone) => {
        const r = ZONE_RECTS[zone];
        return (
          <mesh
            key={zone}
            position={[(r.x0 + r.x1) / 2, 0.01, (r.z0 + r.z1) / 2]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[r.x1 - r.x0, r.z1 - r.z0]} />
            <meshStandardMaterial color={palette.zones[zone]} roughness={1} />
          </mesh>
        );
      })}
    </>
  );
}

const SLOT_SCREEN_OFFSET = 0.36;

function AnchorProps({ anchors, colors }: { anchors: readonly Anchor[]; colors: TableColors }) {
  const { machines, screens, stools } = useMemo(() => {
    const machines: InstanceItem[] = [];
    const screens: InstanceItem[] = [];
    const stools: InstanceItem[] = [];
    for (const a of anchors) {
      if (a.kind === 'slot') {
        machines.push({ position: [a.position[0], 0.95, a.position[2]], rotationY: a.rotationY });
        screens.push({
          position: [
            a.position[0] + Math.sin(a.rotationY) * SLOT_SCREEN_OFFSET,
            1.4,
            a.position[2] + Math.cos(a.rotationY) * SLOT_SCREEN_OFFSET,
          ],
          rotationY: a.rotationY,
        });
      }
      if (a.kind === 'cashier') continue;
      for (const seat of a.seats)
        stools.push({ position: [seat.position[0], 0.25, seat.position[2]] });
    }
    return { machines, screens, stools };
  }, [anchors]);

  return (
    <>
      <Instanced items={machines} shape={{ box: [0.75, 1.9, 0.7] }} color="#5b5478" />
      <Instanced
        items={screens}
        shape={{ box: [0.55, 0.4, 0.05] }}
        color={colors.neon}
        emissive={colors.neon}
        emissiveIntensity={0.9}
      />
      <Instanced items={stools} shape={{ cylinder: [0.22, 0.5] }} color={colors.accent} />
      {anchors.map((a) => {
        switch (a.kind) {
          case 'poker':
            return <PokerTable key={a.id} anchor={a} colors={colors} />;
          case 'blackjack':
            return <BlackjackTable key={a.id} anchor={a} colors={colors} />;
          case 'roulette':
            return <RouletteTable key={a.id} anchor={a} colors={colors} />;
          case 'baccarat':
            return <BaccaratTable key={a.id} anchor={a} colors={colors} />;
          case 'live-dealer':
            return <LiveBooth key={a.id} anchor={a} colors={colors} />;
          case 'cashier':
            return <CashierDesk key={a.id} anchor={a} colors={colors} />;
          case 'slot':
            return null;
        }
      })}
    </>
  );
}

function Colliders({ anchors }: { anchors: readonly Anchor[] }) {
  const colliders = useMemo(() => buildColliders(anchors), [anchors]);
  return (
    <RigidBody type="fixed" colliders={false}>
      {colliders.map((c, i) => (
        <CuboidCollider
          key={i}
          args={[...c.half]}
          position={[...c.position]}
          rotation={[0, c.rotationY, 0]}
        />
      ))}
    </RigidBody>
  );
}

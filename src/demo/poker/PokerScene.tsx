import { useRef, useSyncExternalStore } from 'react';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { CylinderGeometry, MeshStandardMaterial, PlaneGeometry, type Group } from 'three';
import { cardBack, cardFace } from './cardTextures';
import type { Card } from './cards';
import { potOf } from './engine';
import { axes, FELT_Y, type PokerLayout, type Spot } from './layout';
import type { PokerSession } from './session';

const CARD_GEOMETRY = new PlaneGeometry(0.17, 0.24);
const CHIP_GEOMETRY = new CylinderGeometry(0.032, 0.032, 0.008, 20);
const BUTTON_GEOMETRY = new CylinderGeometry(0.055, 0.055, 0.012, 24);
const CHIP_HEIGHT = 0.0085;
const BOT_COLORS = ['#6c8cff', '#ff8c6c', '#7bd88f', '#e2a3ff', '#ffd166'];

const chipMaterials = new Map<string, MeshStandardMaterial>();
const chipMaterial = (color: string) => {
  let material = chipMaterials.get(color);
  if (!material) {
    material = new MeshStandardMaterial({ color, roughness: 0.5 });
    chipMaterials.set(color, material);
  }
  return material;
};
const chipColor = (amount: number) =>
  amount < 5 ? '#ececec' : amount < 20 ? '#d64545' : amount < 50 ? '#3a7bd5' : '#26222e';

interface CardProps {
  card: Card;
  faceUp: boolean;
  at: Spot;
  from: Spot;
  yaw: number;
}

/** A card lying on the felt. It flies in from the middle of the table when it first appears. */
function PlayingCard({ card, faceUp, at, from, yaw }: CardProps) {
  const group = useRef<Group>(null);
  const progress = useRef(0);
  useFrame((_, delta) => {
    const g = group.current;
    if (!g || progress.current >= 1) return;
    progress.current = Math.min(1, progress.current + delta / 0.3);
    const e = 1 - (1 - progress.current) ** 3;
    g.position.set(
      from.x + (at.x - from.x) * e,
      FELT_Y + 0.004 + Math.sin(Math.PI * e) * 0.14,
      from.z + (at.z - from.z) * e,
    );
  });
  return (
    <group ref={group} position={[from.x, FELT_Y + 0.004, from.z]} rotation={[0, yaw, 0]}>
      <mesh geometry={CARD_GEOMETRY} rotation={[-Math.PI / 2, 0, 0]}>
        <meshStandardMaterial map={faceUp ? cardFace(card) : cardBack()} roughness={0.55} />
      </mesh>
    </group>
  );
}

function Chips({ amount, at }: { amount: number; at: Spot }) {
  if (amount <= 0) return null;
  const count = Math.min(14, Math.max(1, Math.ceil(amount / 3)));
  const material = chipMaterial(chipColor(amount));
  return (
    <group position={[at.x, FELT_Y + CHIP_HEIGHT / 2, at.z]}>
      {Array.from({ length: count }, (_, i) => (
        <mesh
          key={i}
          geometry={CHIP_GEOMETRY}
          material={material}
          position={[0, i * CHIP_HEIGHT, 0]}
        />
      ))}
    </group>
  );
}

interface BotProps {
  at: Spot;
  heading: number;
  color: string;
  name: string;
  stack: number;
  action: string | null;
  active: boolean;
  folded: boolean;
}

/** Opponent: the same capsule-and-nose look as the player, seated, with a floating name tag. */
function Bot({ at, heading, color, name, stack, action, active, folded }: BotProps) {
  return (
    <group position={[at.x, 0, at.z]} rotation={[0, heading, 0]}>
      <group scale={[1, 0.72, 1]}>
        <mesh position={[0, 0.85, 0]}>
          <capsuleGeometry args={[0.35, 1, 6, 12]} />
          <meshStandardMaterial
            color={color}
            roughness={0.6}
            transparent
            opacity={folded ? 0.45 : 1}
          />
        </mesh>
        <mesh position={[0, 1.35, 0.35]}>
          <boxGeometry args={[0.16, 0.16, 0.3]} />
          <meshStandardMaterial color="#ff7a3c" />
        </mesh>
      </group>
      <Html position={[0, 1.7, 0]} center distanceFactor={7} style={{ pointerEvents: 'none' }}>
        <div
          style={{
            font: '600 13px/1.25 system-ui, sans-serif',
            color: '#fff',
            textAlign: 'center',
            padding: '3px 9px',
            borderRadius: 8,
            whiteSpace: 'nowrap',
            background: active ? 'rgba(242,193,78,0.92)' : 'rgba(11,7,16,0.78)',
            ...(active ? { color: '#1b1300' } : {}),
          }}
        >
          {name} · {stack}
          {action && <div style={{ fontWeight: 400, opacity: 0.9 }}>{action}</div>}
        </div>
      </Html>
    </group>
  );
}

/** Everything on and around the poker table, drawn from the session's state. */
export function PokerScene({ session, layout }: { session: PokerSession; layout: PokerLayout }) {
  useSyncExternalStore(session.subscribe, session.getVersion);
  const s = session.state;
  const { center, viewHeading } = layout;
  const view = axes(viewHeading);
  const boardYaw = viewHeading + Math.PI;
  const pot = s.street === 'showdown' ? 0 : potOf(s) - s.players.reduce((sum, p) => sum + p.bet, 0);
  const potSpot = { x: center.x + view.forward.x * 0.3, z: center.z + view.forward.z * 0.3 };
  const buttonPlayer = s.players[s.button];
  const buttonSpot = buttonPlayer ? layout.seats[buttonPlayer.seatIndex]?.button : undefined;

  return (
    <group>
      {s.board.map((card, i) => (
        <PlayingCard
          key={`${String(s.handNumber)}-b${String(i)}`}
          card={card}
          faceUp
          from={center}
          at={{
            x: center.x + view.right.x * (i - 2) * 0.2,
            z: center.z + view.right.z * (i - 2) * 0.2,
          }}
          yaw={boardYaw}
        />
      ))}
      <Chips amount={pot} at={potSpot} />
      {s.handNumber > 0 && buttonSpot && (
        <mesh
          geometry={BUTTON_GEOMETRY}
          material={chipMaterial('#ffffff')}
          position={[buttonSpot.x, FELT_Y + 0.008, buttonSpot.z]}
        />
      )}

      {s.players.map((p, i) => {
        const spots = layout.seats[p.seatIndex];
        if (!spots) return null;
        const side = axes(spots.heading).right;
        const yaw = spots.heading + Math.PI;
        return (
          <group key={p.seatIndex}>
            {p.hole &&
              !p.folded &&
              p.hole.map((card, k) => (
                <PlayingCard
                  key={`${String(s.handNumber)}-h${String(k)}`}
                  card={card}
                  faceUp={p.isHuman || s.revealed}
                  from={center}
                  at={{
                    x: spots.hole.x + side.x * (k - 0.5) * 0.19,
                    z: spots.hole.z + side.z * (k - 0.5) * 0.19,
                  }}
                  yaw={yaw}
                />
              ))}
            <Chips amount={p.bet} at={spots.bet} />
            {!p.isHuman && (
              <Bot
                at={spots.seat}
                heading={spots.heading}
                color={BOT_COLORS[p.seatIndex % BOT_COLORS.length] ?? '#999'}
                name={p.name}
                stack={p.stack}
                action={p.lastAction}
                active={s.toAct === i}
                folded={p.folded}
              />
            )}
          </group>
        );
      })}
    </group>
  );
}

// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { easeInOutCubic } from '../src/interaction/easing';
import { buildInteractables } from '../src/interaction/interactables';
import {
  beginWalk,
  cameraBlend,
  cancelWalk,
  createInteractionState,
  finishWalk,
  requestLeave,
  sitAmount,
  tick,
  type InteractionPhase,
} from '../src/interaction/machine';
import { advanceWalk, buildPath, createWalker } from '../src/interaction/path';
import { pickFocus } from '../src/interaction/proximity';
import { stepInteraction, type InteractionEvent } from '../src/interaction/step';
import { createPlayerRuntime } from '../src/player/runtime';
import { applyDefaults } from '../src/config/defaults';
import { demoConfig } from '../src/demo/demoConfig';
import { anchors } from '../src/scene/anchors/anchors';
import { buildColliders, type BoxCollider } from '../src/scene/greybox';
import { TUNING } from '../src/tuning';

const I = TUNING.interaction;
const config = applyDefaults(demoConfig);
const interactables = buildInteractables(anchors, config, { cashier: true });
const find = (key: string) => {
  const found = interactables.find((i) => i.key === key);
  if (!found) throw new Error(`missing ${key}`);
  return found;
};

describe('easing', () => {
  it('is 0 at 0, 1 at 1, symmetric and monotonic', () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5);
    expect(easeInOutCubic(0.25) + easeInOutCubic(0.75)).toBeCloseTo(1);
    expect(easeInOutCubic(0.3)).toBeLessThan(easeInOutCubic(0.6));
  });
});

describe('interactables', () => {
  it('only exposes anchors mapped in config.objects, plus the cashier', () => {
    const partial = applyDefaults({
      ...demoConfig,
      objects: demoConfig.objects.filter((o) => o.anchorId === 'poker.table1'),
    });
    const list = buildInteractables(anchors, partial, { cashier: true });
    expect(new Set(list.map((i) => i.anchorId))).toEqual(
      new Set(['poker.table1', 'cashier.desk1']),
    );
    expect(list.filter((i) => i.anchorId === 'poker.table1')).toHaveLength(9);
  });

  it('skips the cashier without an adapter hook and anchors in disabled zones', () => {
    expect(
      buildInteractables(anchors, config, { cashier: false }).some((i) => i.kind === 'cashier'),
    ).toBe(false);
    const noVip = applyDefaults({ ...demoConfig, zones: { vip: { enabled: false } } });
    expect(
      buildInteractables(anchors, noVip, { cashier: true }).some((i) => i.zone === 'vip'),
    ).toBe(false);
  });
});

describe('pickFocus', () => {
  const rules = { range: I.range, coneHalfAngle: I.coneHalfAngle };
  const slot = find('slots.row1.05.seat1');

  it('focuses a seat when close and facing the object', () => {
    // Slot row 1 faces +z: the seat is at z+1 and the player approaches from the aisle facing -z (heading π).
    const [sx, , sz] = slot.seat.position;
    expect(pickFocus({ x: sx, z: sz + 1 }, Math.PI, interactables, rules)?.key).toBe(slot.key);
  });

  it('ignores objects that are too far away or behind the avatar', () => {
    const [sx, , sz] = slot.seat.position;
    expect(pickFocus({ x: sx, z: sz + 5 }, Math.PI, interactables, rules)).toBeNull();
    expect(pickFocus({ x: sx, z: sz + 1 }, 0, interactables, rules)).toBeNull();
  });

  it('prefers the nearest aligned seat among neighbours', () => {
    const next = find('slots.row1.06.seat1');
    const [sx, , sz] = next.seat.position;
    expect(pickFocus({ x: sx, z: sz + 1 }, Math.PI, interactables, rules)?.key).toBe(next.key);
  });

  it('returns null with nothing nearby', () => {
    expect(pickFocus({ x: 0, z: 18 }, Math.PI, interactables, rules)).toBeNull();
  });
});

describe('walk path', () => {
  it('ends on the seat and approaches from outside when coming from the front', () => {
    const t = find('blackjack.table1.seat1');
    const from = { x: t.seat.position[0], z: t.seat.position[2] + 1.8 };
    const path = buildPath(from, t.seat, t.objectPosition, I.approachDistance);
    expect(path).toHaveLength(2);
    expect(path.at(-1)).toEqual({ x: t.seat.position[0], z: t.seat.position[2] });
    expect(path[0]?.z).toBeGreaterThan(t.seat.position[2]);
  });

  it('goes straight to the seat when already close', () => {
    const t = find('blackjack.table1.seat1');
    const path = buildPath(
      { x: t.seat.position[0], z: t.seat.position[2] + 0.3 },
      t.seat,
      t.objectPosition,
      I.approachDistance,
    );
    expect(path).toHaveLength(1);
  });

  it('stops exactly on the last waypoint without overshooting', () => {
    const path = [{ x: 0, z: -2 }];
    const walker = createWalker({ x: 0, z: 0 }, 0);
    let maxSpeed = 0;
    for (let i = 0; i < 600 && walker.index < path.length; i++) {
      advanceWalk(walker, path, 1 / 60, {
        speed: I.walkSpeed,
        acceleration: I.walkAcceleration,
        deceleration: I.walkDeceleration,
        tolerance: I.arriveTolerance,
      });
      maxSpeed = Math.max(maxSpeed, walker.speed);
      expect(walker.z).toBeGreaterThanOrEqual(-2);
    }
    expect(walker.index).toBe(1);
    expect(walker.z).toBe(-2);
    expect(maxSpeed).toBeLessThanOrEqual(I.walkSpeed + 1e-9);
  });

  const inside = (c: BoxCollider, x: number, z: number) => {
    const dx = x - c.position[0];
    const dz = z - c.position[2];
    const cos = Math.cos(c.rotationY);
    const sin = Math.sin(c.rotationY);
    return Math.abs(dx * cos - dz * sin) < c.half[0] && Math.abs(dx * sin + dz * cos) < c.half[2];
  };

  it('never walks through a prop or wall on the final approach to any seat', () => {
    const solids = buildColliders(anchors).filter((c) => c.tag !== 'slab');
    for (const t of interactables) {
      const [sx, , sz] = t.seat.position;
      const path = buildPath({ x: sx, z: sz + 100 }, t.seat, t.objectPosition, I.approachDistance);
      const start = path.length > 1 ? path[0] : undefined;
      if (!start) continue;
      for (let k = 0; k <= 20; k++) {
        const x = start.x + ((sx - start.x) * k) / 20;
        const z = start.z + ((sz - start.z) * k) / 20;
        for (const c of solids) expect(inside(c, x, z), `${t.key} @${k}`).toBe(false);
      }
    }
  });
});

describe('state machine', () => {
  const target = find('roulette.table1.seat1');

  it('runs the full sequence in order with the tuned durations', () => {
    const s = createInteractionState();
    const phases: InteractionPhase[] = [];
    const run = (seconds: number) => {
      for (let t = 0; t < seconds; t += 0.01) {
        const entered = tick(s, 0.01);
        if (entered) phases.push(entered);
      }
    };

    beginWalk(s, target, { x: 0, z: 0 }, 0);
    expect(s.phase).toBe('walking');
    finishWalk(s);
    expect(s.phase).toBe('sitting');
    run(I.sitDuration + I.cameraEaseDuration + 0.05);
    expect(s.phase).toBe('seated');
    expect(requestLeave(s)).toBe(true);
    run(I.cameraEaseDuration + I.standDuration + 0.05);
    expect(phases).toEqual(['easingIn', 'seated', 'standing', 'free']);
    expect(s.phase).toBe('free');
  });

  it('refuses to start while busy and to leave unless seated', () => {
    const s = createInteractionState();
    expect(requestLeave(s)).toBe(false);
    beginWalk(s, target, { x: 0, z: 0 }, 0);
    const path = s.path;
    beginWalk(s, target, { x: 5, z: 5 }, 0);
    expect(s.path).toBe(path);
    expect(requestLeave(s)).toBe(false);
    cancelWalk(s);
    expect(s.phase).toBe('free');
    expect(s.target).toBeNull();
  });

  it('blends the camera 0 -> 1 on the way in and 1 -> 0 on the way out, sits before the camera moves', () => {
    const s = createInteractionState();
    beginWalk(s, target, { x: 0, z: 0 }, 0);
    finishWalk(s);
    expect(cameraBlend(s)).toBe(0);
    tick(s, I.sitDuration / 2);
    expect(sitAmount(s)).toBeGreaterThan(0);
    expect(sitAmount(s)).toBeLessThan(1);
    expect(cameraBlend(s)).toBe(0);
    tick(s, I.sitDuration);
    expect(s.phase).toBe('easingIn');
    tick(s, I.cameraEaseDuration / 2);
    expect(cameraBlend(s)).toBeCloseTo(0.5);
    tick(s, I.cameraEaseDuration);
    expect(s.phase).toBe('seated');
    expect(cameraBlend(s)).toBe(1);
    expect(sitAmount(s)).toBe(1);
    requestLeave(s);
    tick(s, I.cameraEaseDuration / 2);
    expect(cameraBlend(s)).toBeCloseTo(0.5);
    tick(s, I.cameraEaseDuration);
    expect(s.phase).toBe('standing');
    expect(cameraBlend(s)).toBe(0);
    expect(sitAmount(s)).toBe(1);
  });
});

describe('stepInteraction', () => {
  function setup(key: string) {
    const runtime = createPlayerRuntime();
    const events: InteractionEvent[] = [];
    const env = { interactables, emit: (e: InteractionEvent) => events.push(e) };
    const t = find(key);
    const [sx, , sz] = t.seat.position;
    // Stand just outside the seat, facing the object.
    const out = { x: sx - t.objectPosition[0], z: sz - t.objectPosition[2] };
    const len = Math.hypot(out.x, out.z);
    runtime.position.set(sx + (out.x / len) * 1.2, 0, sz + (out.z / len) * 1.2);
    runtime.heading = Math.atan2(-out.x, -out.z);
    const run = (seconds: number) => {
      for (let t0 = 0; t0 < seconds; t0 += 1 / 60) stepInteraction(runtime, env, 1 / 60);
    };
    return { runtime, events, run, t, sx, sz };
  }

  const phasesOf = (events: InteractionEvent[]) =>
    events.flatMap((e) => (e.type === 'phase' ? [e.phase] : []));

  it('walks to the seat, sits, and can leave again; input is locked in between', () => {
    const { runtime, events, run, t, sx, sz } = setup('blackjack.table1.seat1');
    run(0.1);
    expect(events.at(-1)).toEqual({ type: 'focus', target: t });

    runtime.controls.interactPressed = true;
    run(0.02);
    expect(runtime.controls.locked).toBe(true);
    run(4);
    expect(runtime.interaction.phase).toBe('seated');
    expect(runtime.position.x).toBeCloseTo(sx, 5);
    expect(runtime.position.z).toBeCloseTo(sz, 5);
    expect(runtime.heading).toBeCloseTo(t.seat.rotationY, 5);

    runtime.controls.cancelPressed = true;
    run(I.cameraEaseDuration + I.standDuration + 0.2);
    expect(runtime.interaction.phase).toBe('free');
    expect(runtime.controls.locked).toBe(false);
    expect(phasesOf(events)).toEqual([
      'walking',
      'sitting',
      'easingIn',
      'seated',
      'easingOut',
      'standing',
      'free',
    ]);
  });

  it('leaves with E while seated, and lets the player look around only while seated', () => {
    const { runtime, run } = setup('blackjack.table1.seat1');
    run(0.1);
    expect(runtime.controls.lookMode).toBe('orbit');
    runtime.controls.interactPressed = true;
    run(0.1);
    expect(runtime.controls.lookMode).toBe('none');
    run(4);
    expect(runtime.interaction.phase).toBe('seated');
    expect(runtime.controls.lookMode).toBe('seat');
    runtime.controls.interactPressed = true;
    run(0.1);
    expect(runtime.interaction.phase).toBe('easingOut');
    expect(runtime.controls.lookMode).toBe('none');
  });

  it('cancels the walk with Esc and leaves the avatar where it stopped', () => {
    const { runtime, events, run } = setup('roulette.table1.seat1');
    run(0.1);
    runtime.controls.interactPressed = true;
    run(0.1);
    expect(runtime.interaction.phase).toBe('walking');
    runtime.controls.cancelPressed = true;
    run(0.02);
    expect(runtime.interaction.phase).toBe('free');
    expect(phasesOf(events)).toEqual(['walking', 'free']);
  });

  it('ignores E when nothing is in front of the avatar', () => {
    const runtime = createPlayerRuntime();
    const events: InteractionEvent[] = [];
    runtime.controls.interactPressed = true;
    stepInteraction(runtime, { interactables, emit: (e) => events.push(e) }, 1 / 60);
    expect(events).toEqual([]);
    expect(runtime.controls.interactPressed).toBe(false);
  });

  it('opens the cashier without sitting down', () => {
    const { runtime, events, run } = setup('cashier.desk1.seat1');
    run(0.1);
    runtime.controls.interactPressed = true;
    run(0.1);
    expect(events.some((e) => e.type === 'cashier')).toBe(true);
    expect(runtime.interaction.phase).toBe('free');
  });
});

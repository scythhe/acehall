// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from 'vitest';
import { applyDefaults } from '../src/config/defaults';
import { demoConfig } from '../src/demo/demoConfig';
import { buildInteractables } from '../src/interaction/interactables';
import { buildRoutedPath } from '../src/interaction/path';
import { createNavGrid, distanceToSolid, findRoute, type NavGrid } from '../src/interaction/route';
import { stepInteraction, type InteractionEvent } from '../src/interaction/step';
import { createPlayerRuntime } from '../src/player/runtime';
import { anchors } from '../src/scene/anchors/anchors';
import { VIP_DOOR } from '../src/scene/anchors/layout';
import { buildColliders } from '../src/scene/greybox';
import { TUNING } from '../src/tuning';

const colliders = buildColliders(anchors);
const interactables = buildInteractables(anchors, applyDefaults(demoConfig), { cashier: true });
let grid: NavGrid;
const route = (from: { x: number; z: number }, to: { x: number; z: number }) =>
  findRoute(grid, from, to, TUNING.navigation.sightStep);

beforeAll(() => {
  grid = createNavGrid(colliders, TUNING.navigation);
});

/** Smallest distance from any point sampled along the polyline to any solid. */
function minClearance(from: { x: number; z: number }, path: readonly { x: number; z: number }[]) {
  let min = Infinity;
  let prev = from;
  for (const p of path) {
    const n = Math.ceil(Math.hypot(p.x - prev.x, p.z - prev.z) / 0.05);
    for (let i = 1; i <= n; i++) {
      const x = prev.x + ((p.x - prev.x) * i) / n;
      const z = prev.z + ((p.z - prev.z) * i) / n;
      for (const s of grid.solids) min = Math.min(min, distanceToSolid(s, x, z));
    }
    prev = p;
  }
  return min;
}

describe('routing', () => {
  it('routes from the spawn to every seat without touching a solid', () => {
    const from = { x: TUNING.spawn.position[0], z: TUNING.spawn.position[2] };
    for (const item of interactables) {
      if (item.kind === 'cashier') continue;
      const path = buildRoutedPath(
        from,
        item.seat,
        item.objectPosition,
        TUNING.interaction.approachDistance,
        route,
      );
      // The capsule radius is the hard limit; the last metre into the seat is authored, as in Phase 2.
      const body = path.slice(0, -1);
      expect(minClearance(from, body), item.key).toBeGreaterThan(
        TUNING.player.capsuleRadius - 0.02,
      );
      const end = path[path.length - 1];
      expect(end?.x).toBeCloseTo(item.seat.position[0]);
      expect(end?.z).toBeCloseTo(item.seat.position[2]);
    }
  });

  it('gets into the VIP room through its doorway', () => {
    const vip = interactables.find((i) => i.anchorId === 'vip.blackjack1');
    if (!vip) throw new Error('missing vip seat');
    const start = { x: 0, z: 18 };
    const path = route(start, { x: vip.seat.position[0], z: vip.seat.position[2] });
    if (!path) throw new Error('no route into the VIP room');
    // Where the polyline crosses the VIP wall line (z = -6) must be inside the doorway.
    const crossings: number[] = [];
    [start, ...path].forEach((p, i, all) => {
      const next = all[i + 1];
      if (next && p.z > -6 && next.z <= -6) {
        crossings.push(p.x + ((next.x - p.x) * (p.z + 6)) / (p.z - next.z));
      }
    });
    expect(crossings).toHaveLength(1);
    expect(crossings[0]).toBeGreaterThan(VIP_DOOR.x0);
    expect(crossings[0]).toBeLessThan(VIP_DOOR.x1);
  });

  it('straightens an open-floor route to a single segment', () => {
    expect(route({ x: 0, z: 18 }, { x: 0, z: 10 })).toEqual([{ x: 0, z: 10 }]);
  });

  it('starts from a spot hugging a wall', () => {
    expect(route({ x: -29.7, z: 0 }, { x: -20, z: 5 })).not.toBeNull();
  });
});

describe('walk-to requests', () => {
  it('walks to the nearest seat of a game and ends up seated there', () => {
    const runtime = createPlayerRuntime();
    const events: InteractionEvent[] = [];
    const env = { interactables, router: route, emit: (e: InteractionEvent) => events.push(e) };
    runtime.controls.goTo = { gameId: 'demo-roulette' };
    stepInteraction(runtime, env, 0.016);
    const started = events.find((e) => e.type === 'phase' && e.phase === 'walking');
    if (started?.type !== 'phase') throw new Error('walk did not start');
    expect(started.target.gameId).toBe('demo-roulette');
    for (let i = 0; i < 6000 && runtime.interaction.phase !== 'seated'; i++) {
      stepInteraction(runtime, env, 0.016);
    }
    expect(runtime.interaction.phase).toBe('seated');
    expect(runtime.position.x).toBeCloseTo(started.target.seat.position[0], 1);
    expect(runtime.position.z).toBeCloseTo(started.target.seat.position[2], 1);
    expect(runtime.controls.goTo).toBeNull();
  });

  it('ignores requests for unknown games and while not free', () => {
    const runtime = createPlayerRuntime();
    const events: InteractionEvent[] = [];
    const env = { interactables, router: route, emit: (e: InteractionEvent) => events.push(e) };
    runtime.controls.goTo = { gameId: 'nope' };
    stepInteraction(runtime, env, 0.016);
    expect(runtime.interaction.phase).toBe('free');
    expect(runtime.controls.goTo).toBeNull();
  });
});

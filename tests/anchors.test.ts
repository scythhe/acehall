import { describe, expect, it } from 'vitest';
import { anchors } from '../src/scene/anchors/anchors';
import { HALL, ZONE_RECTS, type Rect } from '../src/scene/anchors/layout';
import { loadAnchors } from '../src/scene/anchors/loader';
import { buildColliders, type BoxCollider } from '../src/scene/greybox';

const ID_PATTERN =
  /^(slots\.row[1-4]\.\d{2}|(poker|blackjack|roulette|baccarat)\.table\d|live\.booth\d|vip\.(blackjack|baccarat)\d|cashier\.desk\d)$/;

const inside = (r: Rect, x: number, z: number) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;

describe('anchors', () => {
  it('loads through the loader interface', async () => {
    expect(await loadAnchors()).toEqual(anchors);
  });

  it('has unique, well-formed ids for anchors and seats', () => {
    const anchorIds = anchors.map((a) => a.id);
    expect(new Set(anchorIds).size).toBe(anchorIds.length);
    for (const id of anchorIds) expect(id).toMatch(ID_PATTERN);
    const seatIds = anchors.flatMap((a) => a.seats.map((s) => s.id));
    expect(new Set(seatIds).size).toBe(seatIds.length);
  });

  it('gives poker tables their full set of seats', () => {
    const seats = anchors.filter((a) => a.kind === 'poker').map((a) => a.seats.length);
    expect(seats).toEqual([9, 9, 6, 6]);
  });

  it('keeps every anchor and seat inside its zone', () => {
    for (const a of anchors) {
      const zone = ZONE_RECTS[a.zone];
      expect(inside(zone, a.position[0], a.position[2]), a.id).toBe(true);
      for (const s of a.seats) expect(inside(zone, s.position[0], s.position[2]), s.id).toBe(true);
    }
  });

  it('keeps everything inside the hall', () => {
    for (const a of anchors) {
      for (const [x, , z] of [
        a.position,
        ...a.seats.map((s) => s.position),
        ...a.seats.map((s) => s.camera.position),
      ]) {
        expect(Math.abs(x)).toBeLessThan(HALL.width / 2);
        expect(Math.abs(z)).toBeLessThan(HALL.depth / 2);
      }
    }
  });
});

/** Footprint on the floor. Rotations in the layout are multiples of 90 degrees, so it stays axis-aligned. */
function footprint(c: BoxCollider): Rect {
  const swap = Math.abs(Math.sin(c.rotationY)) > 0.5;
  const hx = swap ? c.half[2] : c.half[0];
  const hz = swap ? c.half[0] : c.half[2];
  return {
    x0: c.position[0] - hx,
    x1: c.position[0] + hx,
    z0: c.position[2] - hz,
    z1: c.position[2] + hz,
  };
}

const overlaps = (a: Rect, b: Rect) => a.x0 < b.x1 && a.x1 > b.x0 && a.z0 < b.z1 && a.z1 > b.z0;

describe('colliders', () => {
  const colliders = buildColliders(anchors).filter((c) => c.tag !== 'slab');

  it('never overlap between different objects', () => {
    for (let i = 0; i < colliders.length; i++) {
      for (let j = i + 1; j < colliders.length; j++) {
        const a = colliders[i];
        const b = colliders[j];
        if (!a || !b || a.owner === b.owner) continue;
        // Walls meet at corners by design; only props must stay clear of everything.
        if (a.tag !== 'prop' && b.tag !== 'prop') continue;
        expect(overlaps(footprint(a), footprint(b)), `${a.owner} vs ${b.owner}`).toBe(false);
      }
    }
  });

  it('leave every seat reachable (nothing within a body width of the seat)', () => {
    const margin = 0.3;
    for (const a of anchors) {
      for (const s of a.seats) {
        const spot = {
          x0: s.position[0] - margin,
          x1: s.position[0] + margin,
          z0: s.position[2] - margin,
          z1: s.position[2] + margin,
        };
        for (const c of colliders)
          expect(overlaps(footprint(c), spot), `${s.id} vs ${c.owner}`).toBe(false);
      }
    }
  });
});

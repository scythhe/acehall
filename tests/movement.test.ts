import { describe, expect, it } from 'vitest';
import { clamp, orbitDirection, relaxArm } from '../src/player/cameraMath';
import { approachVelocity, turnToward, wishDirection } from '../src/player/movement';

const none = { forward: false, back: false, left: false, right: false };

describe('wishDirection', () => {
  it('is zero without input', () => {
    expect(wishDirection(none, 1.2)).toEqual({ x: 0, z: 0 });
  });

  it('walks towards -z when the camera has yaw 0', () => {
    const d = wishDirection({ ...none, forward: true }, 0);
    expect(d.x).toBeCloseTo(0);
    expect(d.z).toBeCloseTo(-1);
  });

  it('strafes right along +x at yaw 0', () => {
    const d = wishDirection({ ...none, right: true }, 0);
    expect(d.x).toBeCloseTo(1);
    expect(d.z).toBeCloseTo(0);
  });

  it('normalizes diagonals', () => {
    const d = wishDirection({ ...none, forward: true, right: true }, 0.7);
    expect(Math.hypot(d.x, d.z)).toBeCloseTo(1);
  });
});

describe('diagonal movement', () => {
  const settle = (wish: { x: number; z: number }) => {
    let v = { x: 0, z: 0 };
    for (let i = 0; i < 120; i++) v = approachVelocity(v, wish, 3.2, 18, 22, 1 / 60);
    return v;
  };

  it.each([0, 0.4, 1.9, -2.6, Math.PI])(
    'has the same speed as straight movement at yaw %f',
    (yaw) => {
      const diagonal = settle(wishDirection({ ...none, forward: true, left: true }, yaw));
      const straight = settle(wishDirection({ ...none, forward: true }, yaw));
      expect(Math.hypot(diagonal.x, diagonal.z)).toBeCloseTo(Math.hypot(straight.x, straight.z));
    },
  );

  it('points forward-left at yaw 0 (towards -x, -z)', () => {
    const d = wishDirection({ ...none, forward: true, left: true }, 0);
    expect(d.x).toBeCloseTo(-Math.SQRT1_2);
    expect(d.z).toBeCloseTo(-Math.SQRT1_2);
  });

  it('never exceeds the max speed while turning from straight to diagonal', () => {
    let v = settle({ x: 0, z: -1 });
    const diagonal = wishDirection({ ...none, forward: true, left: true }, 0);
    for (let i = 0; i < 30; i++) {
      v = approachVelocity(v, diagonal, 3.2, 18, 22, 1 / 60);
      expect(Math.hypot(v.x, v.z)).toBeLessThanOrEqual(3.2 + 1e-9);
    }
  });
});

describe('approachVelocity', () => {
  it('accelerates gradually and never overshoots the max speed', () => {
    const wish = { x: 1, z: 0 };
    const step = approachVelocity({ x: 0, z: 0 }, wish, 3, 10, 10, 0.1);
    expect(step.x).toBeCloseTo(1);
    expect(approachVelocity({ x: 2.9, z: 0 }, wish, 3, 10, 10, 0.1).x).toBe(3);
  });

  it('decelerates to a stop without reversing', () => {
    const v = approachVelocity({ x: 0.5, z: 0 }, { x: 0, z: 0 }, 3, 10, 20, 0.1);
    expect(v).toEqual({ x: 0, z: 0 });
  });
});

describe('turnToward', () => {
  it('takes the short way round the wrap-around', () => {
    const turned = turnToward(Math.PI - 0.1, -Math.PI + 0.1, 0.05);
    expect(turned).toBeCloseTo(Math.PI - 0.05);
  });

  it('snaps when within the step', () => {
    expect(turnToward(0, 0.02, 0.05)).toBe(0.02);
  });
});

describe('camera math', () => {
  it('places the camera behind the pivot (+z) at yaw 0', () => {
    const [x, y, z] = orbitDirection(0, 0);
    expect([x, y, z]).toEqual([0, 0, 1]);
  });

  it('pulls in instantly and relaxes out gradually', () => {
    expect(relaxArm(3.6, 1, 0.016, 4)).toBe(1);
    const out = relaxArm(1, 3.6, 0.1, 4);
    expect(out).toBeGreaterThan(1);
    expect(out).toBeLessThan(3.6);
  });

  it('clamps', () => {
    expect(clamp(5, 0, 1)).toBe(1);
  });
});

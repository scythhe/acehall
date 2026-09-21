import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  CapsuleCollider,
  RigidBody,
  useRapier,
  type RapierCollider,
  type RapierRigidBody,
} from '@react-three/rapier';
import type { Group } from 'three';
import { debugToolsAvailable } from '../lib/store';
import { TUNING } from '../tuning';
import { orbitDirection, relaxArm } from './cameraMath';
import { attachControls } from './input';
import { approachVelocity, turnToward, wishDirection } from './movement';
import type { PlayerRuntime } from './runtime';

const { player: P, camera: C } = TUNING;
/** Longest frame we simulate; avoids tunnelling and huge camera jumps after a tab was in the background. */
const MAX_DT = 0.05;
/** Below this fraction of the requested step, movement counts as blocked by geometry. */
const BLOCKED_RATIO = 0.9;

/** Kinematic capsule avatar, its controller, and the spring-arm camera. Updated in one place so the order is fixed. */
export function PlayerRig({ runtimeRef }: { runtimeRef: RefObject<PlayerRuntime> }) {
  const { world, rapier } = useRapier();
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);

  const avatar = useRef<Group>(null);
  const body = useRef<RapierRigidBody>(null);
  const collider = useRef<RapierCollider>(null);
  const controller = useRef<ReturnType<typeof world.createCharacterController> | null>(null);
  const armLength = useRef<number>(C.distance);
  const cameraBall = useMemo(() => new rapier.Ball(C.collisionRadius), [rapier]);

  useEffect(() => {
    const root = gl.domElement.closest<HTMLElement>('[data-acehall]');
    if (!root) return;
    return attachControls(root, gl.domElement, runtimeRef.current.controls);
  }, [gl, runtimeRef]);

  useEffect(() => {
    const c = world.createCharacterController(P.controllerOffset);
    c.setUp({ x: 0, y: 1, z: 0 });
    controller.current = c;
    return () => {
      world.removeCharacterController(c);
      controller.current = null;
    };
  }, [world]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, MAX_DT);
    const rb = body.current;
    const ctrl = controller.current;
    const col = collider.current;
    if (!rb || !ctrl || !col) return;
    const runtime = runtimeRef.current;
    runtime.body = rb;
    const { controls, position, velocity } = runtime;

    if (runtime.teleport) {
      const [x, y, z] = runtime.teleport.position;
      position.set(x, y, z);
      controls.yaw = runtime.teleport.yaw;
      velocity.x = velocity.z = 0;
      runtime.heading = runtime.teleport.yaw + Math.PI;
      rb.setTranslation({ x, y, z }, true);
      runtime.teleport = null;
    }

    const wish = wishDirection(controls, controls.yaw);
    const next = approachVelocity(
      velocity,
      wish,
      controls.sprint ? P.sprintSpeed : P.walkSpeed,
      P.acceleration,
      P.deceleration,
      dt,
    );
    velocity.x = next.x;
    velocity.z = next.z;

    ctrl.computeColliderMovement(col, { x: velocity.x * dt, y: 0, z: velocity.z * dt });
    const moved = ctrl.computedMovement();
    position.x += moved.x;
    position.z += moved.z;
    rb.setNextKinematicTranslation({ x: position.x, y: position.y, z: position.z });

    // Only adopt the collided movement when something actually blocked us: dividing a tiny per-frame
    // displacement by dt adds float noise that would otherwise jitter the velocity every frame.
    const desiredLength = Math.hypot(velocity.x, velocity.z) * dt;
    if (dt > 0 && Math.hypot(moved.x, moved.z) < desiredLength * BLOCKED_RATIO) {
      velocity.x = moved.x / dt;
      velocity.z = moved.z / dt;
    }

    // Face the input direction (exact), not the collided velocity (noisy). No input: keep the last heading.
    if (wish.x !== 0 || wish.z !== 0) {
      runtime.heading = turnToward(runtime.heading, Math.atan2(wish.x, wish.z), P.turnRate * dt);
    }
    if (debugToolsAvailable()) {
      const root = gl.domElement.closest<HTMLElement>('[data-acehall]');
      if (root)
        root.dataset.player = [
          position.x,
          position.z,
          velocity.x,
          velocity.z,
          runtime.heading,
        ].join(',');
    }
    if (avatar.current) {
      avatar.current.position.copy(position);
      avatar.current.rotation.y = runtime.heading;
    }

    const rightX = Math.cos(controls.yaw);
    const rightZ = -Math.sin(controls.yaw);
    const px = position.x + rightX * C.shoulderOffset;
    const py = position.y + C.pivotHeight;
    const pz = position.z + rightZ * C.shoulderOffset;
    const [dx, dy, dz] = orbitDirection(controls.yaw, controls.pitch);

    const hit = world.castShape(
      { x: px, y: py, z: pz },
      { x: 0, y: 0, z: 0, w: 1 },
      { x: dx, y: dy, z: dz },
      cameraBall,
      0,
      C.distance,
      true,
      undefined,
      undefined,
      undefined,
      runtime.body ?? undefined,
    );
    const allowed = hit ? Math.max(C.minDistance, hit.time_of_impact) : C.distance;
    armLength.current = relaxArm(armLength.current, allowed, dt, C.relaxRate);

    camera.position.set(
      px + dx * armLength.current,
      py + dy * armLength.current,
      pz + dz * armLength.current,
    );
    camera.lookAt(px, py, pz);
  });

  return (
    <>
      <RigidBody
        ref={body}
        type="kinematicPosition"
        colliders={false}
        position={[...TUNING.spawn.position]}
      >
        <CapsuleCollider
          ref={collider}
          args={[P.capsuleHalfHeight, P.capsuleRadius]}
          position={[0, P.capsuleHalfHeight + P.capsuleRadius, 0]}
        />
      </RigidBody>
      <group ref={avatar} position={[...TUNING.spawn.position]}>
        <mesh position={[0, P.capsuleHalfHeight + P.capsuleRadius, 0]}>
          <capsuleGeometry args={[P.capsuleRadius, P.capsuleHalfHeight * 2, 6, 12]} />
          <meshStandardMaterial color="#e8e2f5" roughness={0.6} />
        </mesh>
        {/* Nose: shows which way the avatar faces. */}
        <mesh position={[0, 1.35, P.capsuleRadius]}>
          <boxGeometry args={[0.16, 0.16, 0.3]} />
          <meshStandardMaterial color="#ff7a3c" />
        </mesh>
      </group>
    </>
  );
}

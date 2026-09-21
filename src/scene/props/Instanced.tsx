import { useLayoutEffect, useRef } from 'react';
import { Object3D, type InstancedMesh } from 'three';
import type { Vec3 } from '../anchors/types';

export interface InstanceItem {
  position: Vec3;
  rotationY?: number;
}

interface InstancedProps {
  items: readonly InstanceItem[];
  /** Box: [width, height, depth]. Cylinder: [radius, height]. */
  shape: { box: Vec3 } | { cylinder: readonly [number, number] };
  color: string;
  emissive?: string;
  emissiveIntensity?: number;
}

const helper = new Object3D();

/** One draw call for many identical props (machines, stools, light panels). */
export function Instanced({
  items,
  shape,
  color,
  emissive,
  emissiveIntensity = 1,
}: InstancedProps) {
  const ref = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    items.forEach((item, i) => {
      helper.position.set(...item.position);
      helper.rotation.set(0, item.rotationY ?? 0, 0);
      helper.updateMatrix();
      mesh.setMatrixAt(i, helper.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [items]);

  return (
    <instancedMesh key={items.length} ref={ref} args={[undefined, undefined, items.length]}>
      {'box' in shape ? (
        <boxGeometry args={[...shape.box]} />
      ) : (
        <cylinderGeometry args={[shape.cylinder[0], shape.cylinder[0], shape.cylinder[1], 16]} />
      )}
      <meshStandardMaterial
        color={color}
        roughness={0.8}
        {...(emissive ? { emissive, emissiveIntensity, toneMapped: false } : {})}
      />
    </instancedMesh>
  );
}

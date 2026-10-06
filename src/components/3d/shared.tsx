import { memo } from 'react';
import * as THREE from 'three';

export const BOX_GEOMETRY = new THREE.BoxGeometry(1, 1, 1);
export const CYLINDER_GEOMETRY = new THREE.CylinderGeometry(1, 1, 1, 24);
export const SPHERE_GEOMETRY = new THREE.SphereGeometry(1, 20, 16);

interface MaterialOptions {
  roughness?: number;
  metalness?: number;
  emissive?: string;
  emissiveIntensity?: number;
  opacity?: number;
}

const materialCache = new Map<string, THREE.MeshStandardMaterial>();

export function standardMaterial(color: string, options: MaterialOptions = {}): THREE.MeshStandardMaterial {
  const key = `${color}|${JSON.stringify(options)}`;
  let material = materialCache.get(key);
  if (!material) {
    material = new THREE.MeshStandardMaterial({
      color,
      roughness: options.roughness ?? 0.7,
      metalness: options.metalness ?? 0.05,
      emissive: options.emissive ?? '#000000',
      emissiveIntensity: options.emissiveIntensity ?? 0,
      transparent: options.opacity !== undefined,
      opacity: options.opacity ?? 1,
    });
    materialCache.set(key, material);
  }
  return material;
}

export type Triple = [number, number, number];

interface BoxProps extends MaterialOptions {
  position: Triple;
  size: Triple;
  color: string;
  rotation?: Triple;
  shadow?: boolean;
}

export const Box = memo(function Box({ position, size, color, rotation, shadow = true, ...options }: BoxProps) {
  return (
    <mesh
      geometry={BOX_GEOMETRY}
      material={standardMaterial(color, options)}
      position={position}
      scale={size}
      rotation={rotation}
      castShadow={shadow}
      receiveShadow
    />
  );
});

interface CylinderProps extends MaterialOptions {
  position: Triple;
  radius: number;
  height: number;
  color: string;
}

export const Cylinder = memo(function Cylinder({ position, radius, height, color, ...options }: CylinderProps) {
  return (
    <mesh
      geometry={CYLINDER_GEOMETRY}
      material={standardMaterial(color, options)}
      position={position}
      scale={[radius, height, radius]}
      castShadow
      receiveShadow
    />
  );
});

interface SphereProps extends MaterialOptions {
  position: Triple;
  radius: number;
  color: string;
  scale?: Triple;
}

export const Sphere = memo(function Sphere({ position, radius, color, scale = [1, 1, 1], ...options }: SphereProps) {
  return (
    <mesh
      geometry={SPHERE_GEOMETRY}
      material={standardMaterial(color, options)}
      position={position}
      scale={[radius * scale[0], radius * scale[1], radius * scale[2]]}
      castShadow
    />
  );
});

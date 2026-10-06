import { memo, useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { agentRegistry } from '../../simulation/agentRegistry';

const LINE_HEIGHT = 1.35;
const SPARK_PERIOD_MS = 1300;

interface CommunicationLineProps {
  fromId: string;
  toId: string;
  color: string;
  opacity: number;
  spark?: boolean;
}

export const CommunicationLine = memo(function CommunicationLine({
  fromId,
  toId,
  color,
  opacity,
  spark = false,
}: CommunicationLineProps) {
  const sparkRef = useRef<THREE.Mesh>(null);
  const startedAt = useRef(performance.now());

  const line = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions = new THREE.BufferAttribute(new Float32Array(6), 3);
    positions.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('position', positions);
    const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
    return new THREE.Line(geometry, material);
  }, [color, opacity]);

  useEffect(
    () => () => {
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    },
    [line],
  );

  useFrame(() => {
    const from = agentRegistry.get(fromId);
    const to = agentRegistry.get(toId);
    if (!from || !to) return;
    const positions = line.geometry.getAttribute('position') as THREE.BufferAttribute;
    positions.setXYZ(0, from.x, LINE_HEIGHT, from.z);
    positions.setXYZ(1, to.x, LINE_HEIGHT, to.z);
    positions.needsUpdate = true;
    line.geometry.computeBoundingSphere();

    if (spark && sparkRef.current) {
      const progress = ((performance.now() - startedAt.current) % SPARK_PERIOD_MS) / SPARK_PERIOD_MS;
      sparkRef.current.position.set(
        from.x + (to.x - from.x) * progress,
        LINE_HEIGHT,
        from.z + (to.z - from.z) * progress,
      );
    }
  });

  return (
    <group>
      <primitive object={line} frustumCulled={false} />
      {spark && (
        <mesh ref={sparkRef}>
          <sphereGeometry args={[0.13, 12, 12]} />
          <meshBasicMaterial color={color} />
        </mesh>
      )}
    </group>
  );
});

import { useEffect, useRef, type ElementRef } from 'react';
import { OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { agentRegistry } from '../../simulation/agentRegistry';
import { useUiStore } from '../../stores/uiStore';

export const OVERVIEW_POSITION = new THREE.Vector3(0, 27, 25);
export const OVERVIEW_TARGET = new THREE.Vector3(0, 0, 1);
const FOCUS_OFFSET = new THREE.Vector3(0, 4.5, 7);
const FOCUS_HEIGHT = 1.1;
const SETTLE_DISTANCE = 0.12;

type Phase = 'IDLE' | 'FOCUSING' | 'RETURNING';

export function CameraRig() {
  const controls = useRef<ElementRef<typeof OrbitControls>>(null);
  const camera = useThree((state) => state.camera);
  const selectedId = useUiStore((state) => state.selectedAgentId);
  const resetNonce = useUiStore((state) => state.cameraResetNonce);
  const phase = useRef<Phase>('IDLE');
  const focus = useRef(new THREE.Vector3());
  const desired = useRef(new THREE.Vector3());
  const previousSelection = useRef<string | null>(null);

  useEffect(() => {
    if (selectedId) {
      phase.current = 'FOCUSING';
    } else if (previousSelection.current !== null || resetNonce > 0) {
      phase.current = 'RETURNING';
    }
    previousSelection.current = selectedId;
  }, [selectedId, resetNonce]);

  useFrame((_, delta) => {
    const orbit = controls.current;
    if (!orbit) return;
    const blend = 1 - Math.exp(-delta * 4);

    if (selectedId) {
      const pose = agentRegistry.get(selectedId);
      if (pose) focus.current.set(pose.x, FOCUS_HEIGHT, pose.z);
      if (phase.current === 'FOCUSING') {
        desired.current.copy(focus.current).add(FOCUS_OFFSET);
        camera.position.lerp(desired.current, blend);
        orbit.target.lerp(focus.current, blend);
        if (
          camera.position.distanceTo(desired.current) < SETTLE_DISTANCE * 3 &&
          orbit.target.distanceTo(focus.current) < SETTLE_DISTANCE
        ) {
          phase.current = 'IDLE';
        }
      } else {
        const shift = focus.current.clone().sub(orbit.target).multiplyScalar(blend);
        orbit.target.add(shift);
        camera.position.add(shift);
      }
    } else if (phase.current === 'RETURNING') {
      camera.position.lerp(OVERVIEW_POSITION, blend);
      orbit.target.lerp(OVERVIEW_TARGET, blend);
      if (
        camera.position.distanceTo(OVERVIEW_POSITION) < SETTLE_DISTANCE * 3 &&
        orbit.target.distanceTo(OVERVIEW_TARGET) < SETTLE_DISTANCE
      ) {
        phase.current = 'IDLE';
      }
    }
    orbit.update();
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minDistance={4}
      maxDistance={55}
      maxPolarAngle={Math.PI / 2.1}
      target={OVERVIEW_TARGET}
      onStart={() => {
        if (phase.current !== 'IDLE') phase.current = 'IDLE';
      }}
    />
  );
}

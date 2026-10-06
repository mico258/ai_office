import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import type { Vec2 } from '../../types/agent';
import { ACTIVE_STATUSES, ROLE_COLORS, STATUS_COLORS } from '../../types/team';
import { agentRegistry } from '../../simulation/agentRegistry';
import { areaAt, COFFEE_MACHINE, deskGap, MEETING_TABLE } from '../../simulation/layout';
import { planPath } from '../../simulation/navigation';
import { useAgentStore } from '../../stores/agentStore';
import { useSimulationStore } from '../../stores/simulationStore';
import { useUiStore } from '../../stores/uiStore';
import { AgentLabel } from './AgentLabel';
import { Box, Cylinder, Sphere, standardMaterial, SPHERE_GEOMETRY } from './shared';

const WALK_SPEED = 2.6;
const TURN_RATE = 9;
const SIT_DROP = 0.3;
const LABEL_HEIGHT = 2.35;
const SKIN = '#f1f5f9';

function speedFactor(speed: number): number {
  return 1 + Math.log2(speed) * 0.9;
}

function shortestAngle(from: number, to: number): number {
  const twoPi = Math.PI * 2;
  return ((((to - from) % twoPi) + Math.PI * 3) % twoPi) - Math.PI;
}

function facingAt(x: number, z: number, current: number): number {
  const point: Vec2 = [x, z];
  if (deskGap(point)) return 0;
  const area = areaAt(point);
  if (area === 'MEETING_ROOM') return Math.atan2(MEETING_TABLE[0] - x, MEETING_TABLE[1] - z);
  if (area === 'BREAK_AREA') return Math.atan2(COFFEE_MACHINE[0] - x, COFFEE_MACHINE[1] - z);
  return current;
}

interface AgentProps {
  id: string;
}

export const Agent = memo(function Agent({ id }: AgentProps) {
  const agent = useAgentStore((state) => state.agents[id]);
  const selected = useUiStore((state) => state.selectedAgentId === id);
  const labelsAlways = useAgentStore((state) => state.order.length <= 20);
  const epoch = useSimulationStore((state) => state.epoch);
  const teamIndex = useAgentStore((state) => state.order.indexOf(id));
  const [hovered, setHovered] = useState(false);

  const root = useRef<Group>(null);
  const body = useRef<Group>(null);
  const head = useRef<Group>(null);
  const leftArm = useRef<Group>(null);
  const rightArm = useRef<Group>(null);
  const leftLeg = useRef<Group>(null);
  const rightLeg = useRef<Group>(null);
  const orb = useRef<Group>(null);
  const path = useRef<Vec2[]>([]);
  const rotation = useRef(0);
  const phase = useRef(0);
  const sit = useRef(0);
  const live = useRef({ status: agent.status });
  live.current.status = agent.status;

  useLayoutEffect(() => {
    const group = root.current;
    if (!group) return;
    const current = useAgentStore.getState().agents[id];
    group.position.set(current.target[0], 0, current.target[1]);
    rotation.current = 0;
    path.current = [];
    agentRegistry.set(id, current.target[0], current.target[1], 0);
  }, [id, epoch]);

  useEffect(() => {
    const pose = agentRegistry.get(id);
    const from: Vec2 = pose ? [pose.x, pose.z] : agent.target;
    path.current = planPath(from, agent.target);
  }, [id, agent.target]);

  useFrame((_, delta) => {
    const group = root.current;
    if (!group) return;
    const simulation = useSimulationStore.getState();
    const dt = simulation.running ? Math.min(delta, 0.1) : 0;
    const status = live.current.status;

    let desiredRotation = rotation.current;
    let walking = false;
    const waypoint = path.current[0];

    if (waypoint) {
      const dx = waypoint[0] - group.position.x;
      const dz = waypoint[1] - group.position.z;
      const distance = Math.hypot(dx, dz);
      const step = WALK_SPEED * speedFactor(simulation.speed) * dt;
      desiredRotation = Math.atan2(dx, dz);
      walking = dt > 0;
      if (distance <= step) {
        group.position.x = waypoint[0];
        group.position.z = waypoint[1];
        path.current.shift();
      } else if (step > 0) {
        group.position.x += (dx / distance) * step;
        group.position.z += (dz / distance) * step;
      }
    } else {
      desiredRotation = facingAt(group.position.x, group.position.z, rotation.current);
    }

    rotation.current += shortestAngle(rotation.current, desiredRotation) * (1 - Math.exp(-TURN_RATE * delta));
    group.rotation.y = rotation.current;
    agentRegistry.set(id, group.position.x, group.position.z, rotation.current);

    phase.current += dt * (walking ? 9 : 2.4);
    const t = phase.current;
    const atDesk = !waypoint && deskGap([group.position.x, group.position.z]) !== null;
    sit.current += ((atDesk ? 1 : 0) - sit.current) * (1 - Math.exp(-8 * delta));

    const bodyNode = body.current;
    const headNode = head.current;
    const left = leftArm.current;
    const right = rightArm.current;
    const leftL = leftLeg.current;
    const rightL = rightLeg.current;
    if (!bodyNode || !headNode || !left || !right || !leftL || !rightL) return;

    const working = ACTIVE_STATUSES.includes(status);
    bodyNode.position.y = -SIT_DROP * sit.current + (walking ? Math.abs(Math.sin(t)) * 0.07 : Math.sin(t) * 0.012);
    leftL.rotation.x = walking ? Math.sin(t) * 0.7 : -1.45 * sit.current;
    rightL.rotation.x = walking ? -Math.sin(t) * 0.7 : -1.45 * sit.current;
    headNode.rotation.set(0, 0, 0);

    if (walking) {
      left.rotation.x = -Math.sin(t) * 0.8;
      right.rotation.x = Math.sin(t) * 0.8;
    } else if (working && atDesk) {
      left.rotation.x = -1.0 + Math.sin(t * 3) * 0.12;
      right.rotation.x = -1.0 + Math.sin(t * 3 + 1.7) * 0.12;
      headNode.rotation.x = 0.12;
    } else if (status === 'BLOCKED') {
      left.rotation.x = -0.4;
      right.rotation.x = -0.4;
      headNode.rotation.y = Math.sin(t * 2) * 0.35;
    } else if (status === 'IN_MEETING') {
      left.rotation.x = -0.25;
      right.rotation.x = -0.25;
      headNode.rotation.x = Math.sin(t * 1.5) * 0.12;
    } else {
      left.rotation.x = Math.sin(t) * 0.05;
      right.rotation.x = -Math.sin(t) * 0.05;
    }

    const orbNode = orb.current;
    if (orbNode) {
      const pulse = status === 'BLOCKED' ? 1 + Math.sin(performance.now() / 160) * 0.35 : 1;
      orbNode.scale.setScalar(pulse);
    }
  });

  const inMeeting = agent.status === 'IN_MEETING';
  const color = ROLE_COLORS[agent.role];
  const statusColor = STATUS_COLORS[agent.status];
  const bodyMaterial = standardMaterial(color, { roughness: 0.45 });
  const darkMaterial = standardMaterial('#0f172a', { roughness: 0.3 });

  return (
    <group
      ref={root}
      onClick={(event) => {
        event.stopPropagation();
        useUiStore.getState().selectAgent(id);
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = 'auto';
      }}
    >
      {(selected || hovered) && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
          <ringGeometry args={[0.6, 0.75, 40]} />
          <meshBasicMaterial color={statusColor} transparent opacity={0.9} />
        </mesh>
      )}

      <group ref={body}>
        <group ref={leftLeg} position={[-0.13, 0.62, 0]}>
          <Box position={[0, -0.3, 0]} size={[0.2, 0.6, 0.22]} color="#1e293b" />
        </group>
        <group ref={rightLeg} position={[0.13, 0.62, 0]}>
          <Box position={[0, -0.3, 0]} size={[0.2, 0.6, 0.22]} color="#1e293b" />
        </group>

        <mesh position={[0, 0.98, 0]} castShadow material={bodyMaterial}>
          <capsuleGeometry args={[0.28, 0.46, 6, 14]} />
        </mesh>

        <group ref={leftArm} position={[-0.38, 1.2, 0]}>
          <Box position={[0, -0.27, 0]} size={[0.15, 0.54, 0.15]} color={color} />
        </group>
        <group ref={rightArm} position={[0.38, 1.2, 0]}>
          <Box position={[0, -0.27, 0]} size={[0.15, 0.54, 0.15]} color={color} />
        </group>

        <group ref={head} position={[0, 1.62, 0]}>
          <Sphere position={[0, 0, 0]} radius={0.27} color={SKIN} roughness={0.35} />
          <mesh position={[0, 0.02, 0.2]} scale={[0.34, 0.14, 0.1]} geometry={SPHERE_GEOMETRY} material={darkMaterial} />
          <Box position={[-0.08, 0.02, 0.27]} size={[0.05, 0.05, 0.02]} color="#38bdf8" emissive="#38bdf8" emissiveIntensity={1.2} shadow={false} />
          <Box position={[0.08, 0.02, 0.27]} size={[0.05, 0.05, 0.02]} color="#38bdf8" emissive="#38bdf8" emissiveIntensity={1.2} shadow={false} />
          <Cylinder position={[0, 0.33, 0]} radius={0.025} height={0.14} color="#64748b" />
        </group>
      </group>

      <group ref={orb} position={[0, 2.05, 0]}>
        <mesh>
          <sphereGeometry args={[0.1, 14, 14]} />
          <meshBasicMaterial color={statusColor} />
        </mesh>
      </group>

      {(labelsAlways || selected || hovered) && (
        <AgentLabel
          id={id}
          name={agent.name}
          role={agent.role}
          status={agent.status}
          blockedReason={agent.blockedReason}
          height={LABEL_HEIGHT + 0.2 + (inMeeting ? (teamIndex % 2) * 0.55 : 0)}
          compact={inMeeting}
        />
      )}
    </group>
  );
});

import { memo, useMemo } from 'react';
import { Overlay } from './Overlay';
import { COFFEE_MACHINE } from '../../simulation/layout';
import { useSimulationStore } from '../../stores/simulationStore';
import { selectOpenTasksKey, useTaskStore } from '../../stores/taskStore';
import type { TaskStatus } from '../../types/task';
import { Box, Cylinder, Sphere, type Triple } from './shared';

export const Whiteboard = memo(function Whiteboard({ position, width = 3 }: { position: Triple; width?: number }) {
  return (
    <group position={position}>
      <Box position={[0, 0, 0]} size={[width + 0.15, 1.65, 0.08]} color="#475569" />
      <Box position={[0, 0, 0.05]} size={[width, 1.5, 0.04]} color="#f8fafc" />
      <Box position={[-width * 0.25, 0.3, 0.09]} size={[width * 0.35, 0.06, 0.01]} color="#f59e0b" shadow={false} />
      <Box position={[-width * 0.2, 0.1, 0.09]} size={[width * 0.5, 0.06, 0.01]} color="#38bdf8" shadow={false} />
      <Box position={[-width * 0.28, -0.12, 0.09]} size={[width * 0.3, 0.06, 0.01]} color="#34d399" shadow={false} />
      <Box position={[width * 0.2, -0.3, 0.09]} size={[width * 0.35, 0.06, 0.01]} color="#fb7185" shadow={false} />
    </group>
  );
});

export const Plant = memo(function Plant({ position, scale = 1 }: { position: Triple; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <Cylinder position={[0, 0.3, 0]} radius={0.28} height={0.6} color="#f1f5f9" />
      <Sphere position={[0, 0.95, 0]} radius={0.38} color="#22c55e" />
      <Sphere position={[0.18, 1.25, 0.05]} radius={0.3} color="#16a34a" />
      <Sphere position={[-0.2, 1.15, -0.05]} radius={0.28} color="#4ade80" />
    </group>
  );
});

const COLUMNS: { title: string; statuses: TaskStatus[]; color: string }[] = [
  { title: 'TODO', statuses: ['TODO'], color: '#94a3b8' },
  { title: 'DOING', statuses: ['IN_PROGRESS', 'IN_REVIEW'], color: '#22c55e' },
  { title: 'TEST', statuses: ['TESTING'], color: '#f97316' },
  { title: 'BLOCKED', statuses: ['BLOCKED'], color: '#ef4444' },
];

const MAX_CARDS = 5;

export const KanbanBoard = memo(function KanbanBoard({ position }: { position: Triple }) {
  const openKey = useTaskStore(selectOpenTasksKey);
  const counts = useMemo(() => {
    const statuses = openKey
      .split(',')
      .filter(Boolean)
      .map((entry) => entry.split(':')[1] as TaskStatus);
    return COLUMNS.map((column) => statuses.filter((status) => column.statuses.includes(status)).length);
  }, [openKey]);

  return (
    <group position={position}>
      <Box position={[0, 0, 0]} size={[4.3, 2.4, 0.1]} color="#334155" />
      <Box position={[0, 0, 0.06]} size={[4.1, 2.2, 0.03]} color="#0f172a" />
      {COLUMNS.map((column, columnIndex) => {
        const x = -1.5 + columnIndex;
        return (
          <group key={column.title} position={[x, 0, 0.1]}>
            <Box position={[0, 0.95, 0]} size={[0.85, 0.16, 0.02]} color={column.color} shadow={false} emissive={column.color} emissiveIntensity={0.5} />
            {Array.from({ length: Math.min(counts[columnIndex], MAX_CARDS) }, (_, cardIndex) => (
              <Box
                key={cardIndex}
                position={[0, 0.62 - cardIndex * 0.3, 0]}
                size={[0.7, 0.22, 0.03]}
                color={column.color}
                shadow={false}
                opacity={0.9}
              />
            ))}
          </group>
        );
      })}
      <Overlay position={[-2.0, 1.45, 0.1]}>
        <div className="rounded bg-slate-900/80 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-slate-300">
          Sprint board
        </div>
      </Overlay>
    </group>
  );
});

export const WallClock = memo(function WallClock({ position }: { position: Triple }) {
  const minutes = useSimulationStore((state) => 9 * 60 + Math.floor(state.simTime / 3));
  const minuteAngle = -((minutes % 60) / 60) * Math.PI * 2;
  const hourAngle = -(((minutes / 60) % 12) / 12) * Math.PI * 2;

  return (
    <group position={position}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.55, 0.55, 0.08, 32]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>
      <group position={[0, 0, 0.06]}>
        <group rotation={[0, 0, hourAngle]}>
          <Box position={[0, 0.14, 0]} size={[0.05, 0.3, 0.02]} color="#0f172a" shadow={false} />
        </group>
        <group rotation={[0, 0, minuteAngle]}>
          <Box position={[0, 0.22, 0.01]} size={[0.03, 0.44, 0.02]} color="#ef4444" shadow={false} />
        </group>
      </group>
    </group>
  );
});

export const CoffeeCorner = memo(function CoffeeCorner() {
  return (
    <group position={[COFFEE_MACHINE[0], 0, COFFEE_MACHINE[1]]}>
      <Box position={[0, 0.5, 0]} size={[1.2, 1, 0.8]} color="#cbd5e1" />
      <Box position={[0, 1.3, 0]} size={[0.9, 0.7, 0.7]} color="#1e293b" />
      <Box position={[0, 1.3, -0.36]} size={[0.5, 0.2, 0.02]} color="#38bdf8" emissive="#38bdf8" emissiveIntensity={0.9} shadow={false} />
      <Box position={[0, 0.75, -0.42]} size={[0.14, 0.1, 0.1]} color="#f97316" emissive="#f97316" emissiveIntensity={0.7} shadow={false} />
    </group>
  );
});

export const Sofa = memo(function Sofa({ position }: { position: Triple }) {
  return (
    <group position={position}>
      <Box position={[0, 0.3, 0]} size={[2.6, 0.6, 1]} color="#6366f1" />
      <Box position={[0, 0.85, 0.4]} size={[2.6, 0.7, 0.25]} color="#4f46e5" />
      <Box position={[-1.4, 0.55, 0]} size={[0.25, 0.9, 1]} color="#4f46e5" />
      <Box position={[1.4, 0.55, 0]} size={[0.25, 0.9, 1]} color="#4f46e5" />
    </group>
  );
});

const RACK_LEDS: { x: number; y: number; color: string }[] = Array.from({ length: 12 }, (_, i) => ({
  x: -0.3 + (i % 2) * 0.6,
  y: 0.4 + Math.floor(i / 2) * 0.28,
  color: i % 5 === 0 ? '#f59e0b' : '#22c55e',
}));

export const ServerRacks = memo(function ServerRacks({ position }: { position: Triple }) {
  return (
    <group position={position}>
      {[-1.1, 0, 1.1].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <Box position={[0, 1.1, 0]} size={[0.95, 2.2, 0.9]} color="#1e293b" />
          {RACK_LEDS.map((led, index) => (
            <Box
              key={index}
              position={[led.x * 0.6, led.y, -0.46]}
              size={[0.07, 0.07, 0.02]}
              color={led.color}
              emissive={led.color}
              emissiveIntensity={1}
              shadow={false}
            />
          ))}
        </group>
      ))}
    </group>
  );
});

const PLANTS: { position: Triple; scale: number }[] = [
  { position: [-15.2, 0, -2.2], scale: 1 },
  { position: [15.2, 0, -2.2], scale: 1 },
  { position: [-15.2, 0, 5.4], scale: 1.1 },
  { position: [15.2, 0, 5.4], scale: 1.1 },
  { position: [-4.5, 0, -3.5], scale: 0.9 },
  { position: [4.5, 0, -3.5], scale: 0.9 },
  { position: [-5.2, 0, 11], scale: 0.9 },
  { position: [5.2, 0, 11], scale: 0.9 },
];

export const Decor = memo(function Decor() {
  return (
    <group>
      <Whiteboard position={[-10, 2.1, -10.85]} width={3.4} />
      <Whiteboard position={[10, 2.1, -10.85]} width={3.4} />
      <KanbanBoard position={[0, 2.1, -10.85]} />
      <WallClock position={[3.3, 3.1, -10.9]} />
      <CoffeeCorner />
      <Sofa position={[8, 0, 10.8]} />
      <ServerRacks position={[0, 0, 10.7]} />
      {PLANTS.map((plant, index) => (
        <Plant key={index} position={plant.position} scale={plant.scale} />
      ))}
    </group>
  );
});

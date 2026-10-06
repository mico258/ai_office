import { memo } from 'react';
import {
  doorGeometry,
  wallRuns,
  WALL_HEIGHT,
  type AreaDef,
  type WallRun,
} from '../../simulation/layout';
import { Box, type Triple } from './shared';

const THICKNESS = 0.1;
const RAIL = '#cbd5e1';
const GLASS = '#dbeafe';
const DOOR_FRAME = '#334155';
const DOOR_LEAF_INSET = 0.14;

function runGeometry(run: WallRun): { center: Triple; length: number; horizontal: boolean } {
  const horizontal = run.from[1] === run.to[1];
  const length = Math.hypot(run.to[0] - run.from[0], run.to[1] - run.from[1]);
  return {
    center: [(run.from[0] + run.to[0]) / 2, 0, (run.from[1] + run.to[1]) / 2],
    length,
    horizontal,
  };
}

interface GlassPanelProps {
  center: Triple;
  length: number;
  horizontal: boolean;
  opacity: number;
}

const GlassPanel = memo(function GlassPanel({ center, length, horizontal, opacity }: GlassPanelProps) {
  const panelSize: Triple = horizontal ? [length, WALL_HEIGHT, THICKNESS] : [THICKNESS, WALL_HEIGHT, length];
  const railSize = (height: number): Triple => (horizontal ? [length, height, THICKNESS + 0.04] : [THICKNESS + 0.04, height, length]);
  return (
    <group position={[center[0], 0, center[2]]}>
      <Box position={[0, WALL_HEIGHT / 2, 0]} size={panelSize} color={GLASS} opacity={opacity} roughness={0.1} shadow={false} />
      <Box position={[0, WALL_HEIGHT, 0]} size={railSize(0.07)} color={RAIL} shadow={false} />
      <Box position={[0, 0.06, 0]} size={railSize(0.12)} color={RAIL} shadow={false} />
    </group>
  );
});

export const GlassWall = memo(function GlassWall({ run }: { run: WallRun }) {
  const { center, length, horizontal } = runGeometry(run);
  return <GlassPanel center={center} length={length} horizontal={horizontal} opacity={0.17} />;
});

export const Door = memo(function Door({ area }: { area: AreaDef }) {
  const door = doorGeometry(area);
  if (!door) return null;
  const half = door.width / 2;
  const leafZ = door.z + door.insideDirection * DOOR_LEAF_INSET;
  const leafCenterX = door.x - half - door.width / 2;

  return (
    <group>
      <Box position={[door.x - half, WALL_HEIGHT / 2, door.z]} size={[0.14, WALL_HEIGHT, 0.14]} color={DOOR_FRAME} shadow={false} />
      <Box position={[door.x + half, WALL_HEIGHT / 2, door.z]} size={[0.14, WALL_HEIGHT, 0.14]} color={DOOR_FRAME} shadow={false} />
      <Box position={[door.x, WALL_HEIGHT, door.z]} size={[door.width + 0.14, 0.12, 0.14]} color={DOOR_FRAME} shadow={false} />
      <Box position={[door.x, 0.03, door.z]} size={[door.width, 0.03, 0.2]} color={area.color} emissive={area.color} emissiveIntensity={0.5} shadow={false} />
      <GlassPanel center={[leafCenterX, 0, leafZ]} length={door.width - 0.1} horizontal opacity={0.32} />
      <Box position={[door.x - half - 0.2, 1, leafZ + door.insideDirection * 0.06]} size={[0.05, 0.3, 0.05]} color="#94a3b8" shadow={false} />
    </group>
  );
});

export const RoomWalls = memo(function RoomWalls({ area }: { area: AreaDef }) {
  return (
    <group>
      {wallRuns(area).map((run, index) => (
        <GlassWall key={index} run={run} />
      ))}
      <Door area={area} />
    </group>
  );
});


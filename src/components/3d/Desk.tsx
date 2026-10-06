import { memo } from 'react';
import type { Vec2 } from '../../types/agent';
import { ACTIVE_STATUSES, STATUS_COLORS } from '../../types/team';
import { DESK_OFFSET_Z } from '../../simulation/layout';
import { useAgentStore } from '../../stores/agentStore';
import { Box, Cylinder } from './shared';

interface DeskProps {
  slot: Vec2;
  occupantId?: string;
}

export const Desk = memo(function Desk({ slot, occupantId }: DeskProps) {
  const status = useAgentStore((state) => (occupantId ? state.agents[occupantId]?.status : undefined));
  const lit = status !== undefined && ACTIVE_STATUSES.includes(status);
  const screenColor = status ? STATUS_COLORS[status] : '#334155';
  const deskZ = DESK_OFFSET_Z;

  return (
    <group position={[slot[0], 0, slot[1]]}>
      <Cylinder position={[0, 0.22, 0]} radius={0.05} height={0.44} color="#1e293b" />
      <Box position={[0, 0.46, 0]} size={[0.62, 0.1, 0.62]} color="#334155" />
      <Box position={[0, 0.9, -0.3]} size={[0.6, 0.7, 0.08]} color="#475569" />

      <Box position={[0, 0.75, deskZ]} size={[2, 0.08, 1]} color="#e2e8f0" />
      <Box position={[-0.92, 0.37, deskZ - 0.4]} size={[0.08, 0.74, 0.08]} color="#64748b" />
      <Box position={[0.92, 0.37, deskZ - 0.4]} size={[0.08, 0.74, 0.08]} color="#64748b" />
      <Box position={[-0.92, 0.37, deskZ + 0.4]} size={[0.08, 0.74, 0.08]} color="#64748b" />
      <Box position={[0.92, 0.37, deskZ + 0.4]} size={[0.08, 0.74, 0.08]} color="#64748b" />

      <Box position={[0, 0.86, deskZ + 0.05]} size={[0.1, 0.18, 0.1]} color="#1e293b" />
      <Box
        position={[0, 1.2, deskZ + 0.05]}
        size={[0.95, 0.56, 0.05]}
        color={screenColor}
        emissive={screenColor}
        emissiveIntensity={lit ? 0.55 : 0.06}
      />
      <Box position={[0, 0.8, deskZ - 0.3]} size={[0.6, 0.02, 0.2]} color="#94a3b8" />
    </group>
  );
});

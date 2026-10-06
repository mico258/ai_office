import { memo, useMemo } from 'react';
import { Overlay } from './Overlay';
import * as THREE from 'three';
import { DESK_SLOTS, type AreaDef } from '../../simulation/layout';
import { useAgentStore } from '../../stores/agentStore';
import { Desk } from './Desk';
import { Box } from './shared';

const FLOOR_BASE = new THREE.Color('#c7cfdd');
const WALL_HEIGHT = 1.7;

function hexTint(color: string): string {
  return `#${FLOOR_BASE.clone().lerp(new THREE.Color(color), 0.28).getHexString()}`;
}

interface OfficeAreaProps {
  area: AreaDef;
}

export const OfficeArea = memo(function OfficeArea({ area }: OfficeAreaProps) {
  const [cx, cz] = area.center;
  const [width, depth] = area.size;
  const floorColor = useMemo(() => hexTint(area.color), [area.color]);
  const occupantKey = useAgentStore((state) =>
    state.order
      .map((id) => state.agents[id])
      .filter((agent) => agent.homeArea === area.id)
      .map((agent) => `${agent.id}@${agent.home[0]},${agent.home[1]}`)
      .join(';'),
  );

  const occupants = useMemo(() => {
    const bySlot = new Map<string, string>();
    occupantKey
      .split(';')
      .filter(Boolean)
      .forEach((entry) => {
        const [id, slot] = entry.split('@');
        bySlot.set(slot, id);
      });
    return bySlot;
  }, [occupantKey]);

  return (
    <group>
      <Box position={[cx, 0.03, cz]} size={[width, 0.06, depth]} color={floorColor} shadow={false} roughness={0.9} />
      <Box position={[cx, 0.07, cz - depth / 2 + 0.05]} size={[width, 0.03, 0.1]} color={area.color} shadow={false} emissive={area.color} emissiveIntensity={0.4} />
      <Box position={[cx, 0.07, cz + depth / 2 - 0.05]} size={[width, 0.03, 0.1]} color={area.color} shadow={false} emissive={area.color} emissiveIntensity={0.4} />

      {area.walls.includes('W') && (
        <Box position={[cx - width / 2, WALL_HEIGHT / 2, cz]} size={[0.12, WALL_HEIGHT, depth]} color="#e8f0ff" opacity={0.22} shadow={false} roughness={0.2} />
      )}
      {area.walls.includes('E') && (
        <Box position={[cx + width / 2, WALL_HEIGHT / 2, cz]} size={[0.12, WALL_HEIGHT, depth]} color="#e8f0ff" opacity={0.22} shadow={false} roughness={0.2} />
      )}

      {DESK_SLOTS[area.id].map((slot) => (
        <Desk key={`${slot[0]},${slot[1]}`} slot={slot} occupantId={occupants.get(`${slot[0]},${slot[1]}`)} />
      ))}

      <Overlay position={[cx - width / 2 + 0.4, 0.1, cz + depth / 2 - 0.45]}>
        <div
          className="whitespace-nowrap rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: area.color, background: 'rgba(11,16,32,0.72)', border: `1px solid ${area.color}55` }}
        >
          {area.label}
        </div>
      </Overlay>
    </group>
  );
});


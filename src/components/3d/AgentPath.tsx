import { memo, useMemo } from 'react';
import { Line } from '@react-three/drei';
import { agentRegistry } from '../../simulation/agentRegistry';
import { planPath } from '../../simulation/navigation';
import { useAgentStore } from '../../stores/agentStore';
import { useUiStore } from '../../stores/uiStore';
import { ROLE_COLORS } from '../../types/team';
import type { Vec2 } from '../../types/agent';

const PATH_HEIGHT = 0.12;

export const AgentPath = memo(function AgentPath() {
  const selectedId = useUiStore((state) => state.selectedAgentId);
  const agent = useAgentStore((state) => (selectedId ? state.agents[selectedId] : undefined));

  const points = useMemo(() => {
    if (!agent || !agent.moving) return null;
    const pose = agentRegistry.get(agent.id);
    const from: Vec2 = pose ? [pose.x, pose.z] : agent.target;
    const path = planPath(from, agent.target);
    return [from, ...path].map(([x, z]) => [x, PATH_HEIGHT, z] as [number, number, number]);
  }, [agent]);

  if (!agent || !points || points.length < 2) return null;

  return (
    <Line
      points={points}
      color={ROLE_COLORS[agent.role]}
      lineWidth={2}
      dashed
      dashSize={0.35}
      gapSize={0.25}
      transparent
      opacity={0.8}
    />
  );
});

import { memo } from 'react';
import { Canvas } from '@react-three/fiber';
import { useShallow } from 'zustand/react/shallow';
import { AREAS, AREA_IDS, WORLD } from '../../simulation/layout';
import { useAgentStore } from '../../stores/agentStore';
import { useEventStore } from '../../stores/eventStore';
import { Agent } from './Agent';
import { AgentPath } from './AgentPath';
import { CameraRig, OVERVIEW_POSITION } from './CameraRig';
import { CommunicationLine } from './CommunicationLine';
import { Decor } from './Decor';
import { MeetingRoom } from './MeetingRoom';
import { overlayPortal } from './Overlay';
import { OfficeArea } from './OfficeArea';
import { Box } from './shared';

const MESSAGE_COLORS = { HANDOFF: '#38bdf8', BUG: '#fb7185', UNBLOCK: '#4ade80' } as const;

const Shell = memo(function Shell() {
  const halfWidth = WORLD.width / 2;
  const halfDepth = WORLD.depth / 2;
  return (
    <group>
      <Box position={[0, -0.1, 0]} size={[WORLD.width + 2, 0.2, WORLD.depth + 2]} color="#aeb8cb" shadow={false} roughness={0.95} />
      <Box position={[0, 2.2, -halfDepth - 0.1]} size={[WORLD.width + 2, 4.4, 0.2]} color="#e5eaf3" shadow={false} />
      <Box position={[-halfWidth - 0.1, 0.8, 0]} size={[0.2, 1.6, WORLD.depth]} color="#e5eaf3" shadow={false} />
      <Box position={[halfWidth + 0.1, 0.8, 0]} size={[0.2, 1.6, WORLD.depth]} color="#e5eaf3" shadow={false} />
    </group>
  );
});

const Lights = memo(function Lights() {
  return (
    <>
      <ambientLight intensity={0.7} />
      <hemisphereLight args={['#dbe7ff', '#6b7280', 0.55]} />
      <directionalLight
        position={[14, 28, 16]}
        intensity={1.5}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-22}
        shadow-camera-right={22}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        shadow-camera-near={1}
        shadow-camera-far={70}
        shadow-bias={-0.0004}
      />
    </>
  );
});

const Communications = memo(function Communications() {
  const messages = useEventStore((state) => state.messages);
  return (
    <>
      {messages.map((message) => (
        <CommunicationLine
          key={message.id}
          fromId={message.fromId}
          toId={message.toId}
          color={MESSAGE_COLORS[message.kind]}
          opacity={0.55}
          spark
        />
      ))}
    </>
  );
});

export function OfficeWorld() {
  const order = useAgentStore(useShallow((state) => state.order));

  return (
    <div
      ref={(node) => {
        overlayPortal.current = node;
      }}
      className="relative h-full w-full overflow-hidden"
    >
    <Canvas
      shadows="percentage"
      dpr={[1, 2]}
      camera={{ position: OVERVIEW_POSITION.toArray(), fov: 40, near: 0.1, far: 220 }}
      gl={{ antialias: true }}
    >
      <color attach="background" args={['#0b1020']} />
      <Lights />
      <Shell />
      {AREA_IDS.map((id) => (
        <OfficeArea key={id} area={AREAS[id]} />
      ))}
      <MeetingRoom />
      <Decor />
      {order.map((id) => (
        <Agent key={id} id={id} />
      ))}
      <Communications />
      <AgentPath />
      <CameraRig />
    </Canvas>
    </div>
  );
}


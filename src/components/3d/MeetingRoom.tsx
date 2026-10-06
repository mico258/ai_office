import { memo } from 'react';
import { MEETING_SEATS, MEETING_TABLE } from '../../simulation/layout';
import { useSimulationStore } from '../../stores/simulationStore';
import { useShallow } from 'zustand/react/shallow';
import { CommunicationLine } from './CommunicationLine';
import { Box, Cylinder } from './shared';

const MAX_LINKED = 12;

export const MeetingLinks = memo(function MeetingLinks() {
  const participants = useSimulationStore(useShallow((state) => state.meeting?.participantIds ?? []));
  const linked = participants.slice(0, MAX_LINKED);
  if (linked.length < 2) return null;

  return (
    <group>
      {linked.map((id, index) => (
        <CommunicationLine
          key={`${id}-${linked[(index + 1) % linked.length]}`}
          fromId={id}
          toId={linked[(index + 1) % linked.length]}
          color="#60a5fa"
          opacity={0.35}
        />
      ))}
    </group>
  );
});

export const MeetingRoom = memo(function MeetingRoom() {
  const [tx, tz] = MEETING_TABLE;
  return (
    <group>
      <Box position={[tx, 0.75, tz]} size={[4, 0.1, 1.6]} color="#cbd5e1" />
      <Cylinder position={[tx - 1.2, 0.37, tz]} radius={0.12} height={0.74} color="#475569" />
      <Cylinder position={[tx + 1.2, 0.37, tz]} radius={0.12} height={0.74} color="#475569" />
      <Box position={[tx, 0.82, tz]} size={[0.6, 0.02, 0.4]} color="#38bdf8" emissive="#38bdf8" emissiveIntensity={0.5} shadow={false} />
      {MEETING_SEATS.map((seat, index) => (
        <group key={index} position={[seat[0], 0, seat[1]]}>
          <Cylinder position={[0, 0.22, 0]} radius={0.05} height={0.44} color="#1e293b" />
          <Box position={[0, 0.46, 0]} size={[0.55, 0.1, 0.55]} color="#475569" />
        </group>
      ))}
      <MeetingLinks />
    </group>
  );
});

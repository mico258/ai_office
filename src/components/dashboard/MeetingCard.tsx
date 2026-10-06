import { useAgentStore } from '../../stores/agentStore';
import { useSimulationStore } from '../../stores/simulationStore';
import { formatDuration, MEETING_LABELS, ROLE_TITLES } from '../../types/team';

export function MeetingCard() {
  const meeting = useSimulationStore((state) => state.meeting);
  const elapsed = useSimulationStore((state) => (state.meeting ? Math.floor(state.simTime - state.meeting.startedAt) : 0));
  const agents = useAgentStore((state) => state.agents);

  if (!meeting) return null;

  return (
    <div className="w-64 rounded-xl border border-sky-500/40 bg-slate-950/90 p-4 shadow-xl backdrop-blur">
      <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-sky-300">{MEETING_LABELS[meeting.kind]}</div>
      <ul className="mt-3 space-y-1.5">
        {meeting.participantIds.map((id) => {
          const agent = agents[id];
          if (!agent) return null;
          return (
            <li key={id} className="flex items-center gap-2 text-xs text-slate-200">
              <span>👤</span>
              <span className="font-medium">{agent.name}</span>
              <span className="text-slate-500">— {ROLE_TITLES[agent.role]}</span>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 border-t border-slate-800 pt-2 text-xs">
        <div className="text-slate-500">Topic</div>
        <div className="text-slate-100">{meeting.topic}</div>
        <div className="mt-2 text-slate-500">Duration</div>
        <div className="font-mono text-slate-100">{formatDuration(elapsed)}</div>
      </div>
    </div>
  );
}

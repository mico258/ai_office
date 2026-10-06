import { useMemo } from 'react';
import { useAgentStore } from '../../stores/agentStore';
import { useSimulationStore } from '../../stores/simulationStore';
import { useTaskStore } from '../../stores/taskStore';
import { useUiStore } from '../../stores/uiStore';
import { ACTIVE_STATUSES, formatClock, RESTING_STATUSES } from '../../types/team';
import { SprintProgress } from './SprintProgress';

const CONNECTION_STYLE = {
  CONNECTED: { color: '#22c55e', label: 'TEAM ONLINE' },
  CONNECTING: { color: '#eab308', label: 'CONNECTING' },
  DISCONNECTED: { color: '#ef4444', label: 'OFFLINE' },
} as const;

function useTeamCounts() {
  const key = useAgentStore((state) => {
    const agents = state.order.map((id) => state.agents[id]);
    const working = agents.filter((agent) => ACTIVE_STATUSES.includes(agent.status)).length;
    const meeting = agents.filter((agent) => agent.status === 'IN_MEETING').length;
    const blocked = agents.filter((agent) => agent.status === 'BLOCKED').length;
    const idle = agents.filter((agent) => RESTING_STATUSES.includes(agent.status)).length;
    return [agents.length, working, meeting, blocked, idle].join('|');
  });
  return useMemo(() => {
    const [total, working, meeting, blocked, idle] = key.split('|').map(Number);
    return { total, working, meeting, blocked, idle };
  }, [key]);
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="flex flex-col items-center px-2 xl:px-3">
      <span className="text-lg font-semibold leading-none" style={{ color: color ?? '#e2e8f0' }}>
        {value}
      </span>
      <span className="mt-1 whitespace-nowrap text-[10px] uppercase tracking-wider text-slate-400">{label}</span>
    </div>
  );
}

export function TopBar() {
  const connection = useUiStore((state) => state.connection);
  const clock = useSimulationStore((state) => formatClock(state.simTime));
  const sprintNumber = useTaskStore((state) => state.sprint.number);
  const counts = useTeamCounts();
  const style = CONNECTION_STYLE[connection];

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 overflow-hidden border-b border-slate-800 bg-slate-950 px-4 xl:gap-6 xl:px-5">
      <div className="flex items-center gap-5">
        <div>
          <div className="whitespace-nowrap text-xs font-bold tracking-[0.2em] text-slate-100 xl:text-sm">PRODUCT ENGINEERING</div>
          <div className="mt-0.5 flex items-center gap-2 text-[11px]">
            <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 font-semibold tracking-wider text-emerald-300">
              SPRINT {sprintNumber}
            </span>
            <span className="text-slate-400">{clock}</span>
          </div>
        </div>
        <div className="hidden items-center gap-2 whitespace-nowrap text-[11px] font-semibold tracking-wider text-slate-300 lg:flex">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: style.color, boxShadow: `0 0 8px ${style.color}` }} />
          {style.label}
        </div>
      </div>

      <div className="flex items-center divide-x divide-slate-800">
        <Stat label="Team" value={counts.total} />
        <Stat label="Working" value={counts.working} color="#22c55e" />
        <Stat label="In meeting" value={counts.meeting} color="#60a5fa" />
        <Stat label="Blocked" value={counts.blocked} color={counts.blocked > 0 ? '#ef4444' : '#94a3b8'} />
        <Stat label="Idle" value={counts.idle} color="#94a3b8" />
      </div>

      <SprintProgress />
    </header>
  );
}

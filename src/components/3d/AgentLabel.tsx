import { memo } from 'react';
import { Overlay } from './Overlay';
import type { AgentRole, AgentStatus } from '../../types/agent';
import { ROLE_TITLES, STATUS_COLORS } from '../../types/team';
import { useEventStore } from '../../stores/eventStore';

interface AgentLabelProps {
  id: string;
  name: string;
  role: AgentRole;
  status: AgentStatus;
  blockedReason: string | null;
  height: number;
  compact: boolean;
}

export const AgentLabel = memo(function AgentLabel({ id, name, role, status, blockedReason, height, compact }: AgentLabelProps) {
  const speech = useEventStore((state) => state.speech[id]?.text);
  const color = STATUS_COLORS[status];

  return (
    <Overlay position={[0, height, 0]} center>
      <div className="relative flex select-none flex-col items-center">
        <div className="absolute bottom-full mb-1 flex flex-col items-center gap-1">
          {blockedReason && (
            <div className="blocked-pulse max-w-[180px] rounded-md border border-red-500/70 bg-red-950/90 px-2 py-1 text-center text-[10px] leading-tight text-red-200">
              ⚠ {blockedReason}
            </div>
          )}
          {speech && (
            <div className="max-w-[180px] whitespace-nowrap rounded-md border border-sky-400/60 bg-slate-900/95 px-2 py-1 text-[11px] text-sky-100 shadow-lg">
              “{speech}”
            </div>
          )}
        </div>
        <div className="rounded-md border border-slate-600/60 bg-slate-950/80 px-2 py-0.5 text-center backdrop-blur-sm">
          <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-100">
            {name}
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
          </div>
          {!compact && <div className="whitespace-nowrap text-[9px] text-slate-400">{ROLE_TITLES[role]}</div>}
        </div>
      </div>
    </Overlay>
  );
});

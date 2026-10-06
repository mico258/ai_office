import { memo, useMemo } from 'react';
import type { Department } from '../../types/agent';
import { useAgentStore } from '../../stores/agentStore';
import { useUiStore } from '../../stores/uiStore';
import { DEPARTMENT_LABELS, DEPARTMENT_ORDER, ROLE_TITLES, STATUS_COLORS } from '../../types/team';
import { statusLabel } from './format';

const TeamRow = memo(function TeamRow({ id }: { id: string }) {
  const agent = useAgentStore((state) => state.agents[id]);
  const selected = useUiStore((state) => state.selectedAgentId === id);
  const color = STATUS_COLORS[agent.status];

  return (
    <button
      type="button"
      onClick={() => useUiStore.getState().selectAgent(id)}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
        selected ? 'bg-slate-800 ring-1 ring-slate-600' : 'hover:bg-slate-900'
      }`}
    >
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-slate-100">{agent.name}</span>
        <span className="block truncate text-[11px] text-slate-400">{ROLE_TITLES[agent.role]}</span>
      </span>
      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider" style={{ color }}>
        {statusLabel(agent.status)}
      </span>
    </button>
  );
});

export function TeamSidebar() {
  const membership = useAgentStore((state) =>
    state.order.map((id) => `${id}:${state.agents[id].department}`).join(','),
  );
  const groups = useMemo(() => {
    const members = membership
      .split(',')
      .filter(Boolean)
      .map((entry) => {
        const [id, department] = entry.split(':');
        return { id, department: department as Department };
      });
    return DEPARTMENT_ORDER.map((department) => ({
      department,
      ids: members.filter((member) => member.department === department).map((member) => member.id),
    })).filter((group) => group.ids.length > 0);
  }, [membership]);

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-slate-800 bg-slate-950 xl:w-64">
      <div className="px-5 pb-2 pt-4 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Team</div>
      <div className="flex-1 space-y-4 overflow-y-auto px-2 pb-4">
        {groups.map((group) => (
          <section key={group.department}>
            <h3 className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              {DEPARTMENT_LABELS[group.department]}
            </h3>
            {group.ids.map((id) => (
              <TeamRow key={id} id={id} />
            ))}
          </section>
        ))}
      </div>
    </aside>
  );
}

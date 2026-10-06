import type { ReactNode } from 'react';
import { AREAS } from '../../simulation/layout';
import { useAgentStore } from '../../stores/agentStore';
import { useTaskStore } from '../../stores/taskStore';
import { useUiStore } from '../../stores/uiStore';
import { ROLE_COLORS, ROLE_TITLES, STATUS_COLORS } from '../../types/team';
import { PRIORITY_COLORS, STAGE_LABELS, statusLabel, TYPE_LABELS } from './format';
import { ProgressBar } from './ProgressBar';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h4 className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">{title}</h4>
      {children}
    </section>
  );
}

function StatRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-400">{label}</span>
      <span className="font-semibold text-slate-100">{value}</span>
    </div>
  );
}

export function AgentDetails({ id }: { id: string }) {
  const agent = useAgentStore((state) => state.agents[id]);
  const currentTask = useTaskStore((state) => (agent?.currentTaskId ? state.tasks[agent.currentTaskId] : undefined));
  const sprintNumber = useTaskStore((state) => state.sprint.number);
  const close = useUiStore((state) => state.clearSelection);

  if (!agent) return null;
  const statusColor = STATUS_COLORS[agent.status];
  const location = AREAS[agent.location].label;

  return (
    <div className="space-y-5 p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full" style={{ background: ROLE_COLORS[agent.role] }} />
            <h2 className="text-lg font-bold uppercase tracking-wide text-slate-100">{agent.name}</h2>
          </div>
          <div className="mt-0.5 text-sm text-slate-400">{ROLE_TITLES[agent.role]}</div>
        </div>
        <button
          type="button"
          onClick={close}
          aria-label="Close details"
          className="rounded-md px-2 py-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100"
        >
          ✕
        </button>
      </div>

      <Section title="Status">
        <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: statusColor }}>
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: statusColor, boxShadow: `0 0 8px ${statusColor}` }} />
          {statusLabel(agent.status)}
        </div>
        {agent.blockedReason && (
          <div className="mt-2 rounded-md border border-red-500/40 bg-red-950/50 px-3 py-2 text-xs text-red-200">
            {agent.blockedReason}
          </div>
        )}
      </Section>

      <Section title="Current task">
        {currentTask ? (
          <div>
            <div className="text-sm font-medium text-slate-100">{currentTask.title}</div>
            <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-400">
              <span className="rounded bg-slate-800 px-1.5 py-0.5">{TYPE_LABELS[currentTask.type]}</span>
              <span>{currentTask.id}</span>
              <span>
                {STAGE_LABELS[currentTask.pipeline[currentTask.stageIndex]]} · stage {currentTask.stageIndex + 1}/
                {currentTask.pipeline.length}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-sm text-slate-500">No active task</div>
        )}
      </Section>

      <Section title="Progress">
        <div className="flex items-center gap-3">
          <ProgressBar value={currentTask?.progress ?? 0} color={statusColor} height={10} />
          <span className="w-10 text-right text-sm font-semibold text-slate-100">{currentTask?.progress ?? 0}%</span>
        </div>
      </Section>

      <div className="grid grid-cols-2 gap-4">
        <Section title="Sprint">
          <div className="text-sm text-slate-100">Sprint {sprintNumber}</div>
        </Section>
        <Section title="Priority">
          <div
            className="text-sm font-semibold"
            style={{ color: currentTask ? PRIORITY_COLORS[currentTask.priority] : '#64748b' }}
          >
            {currentTask ? currentTask.priority : '—'}
          </div>
        </Section>
      </div>

      <Section title="Location">
        <div className="text-sm text-slate-100">
          {location}
          {agent.moving && <span className="ml-2 text-xs text-slate-400">walking…</span>}
        </div>
      </Section>

      <Section title="Current activity">
        <div className="text-sm text-slate-200">{agent.activity}</div>
      </Section>

      <Section title="Recent activity">
        <ul className="space-y-1.5">
          {agent.log.map((entry, index) => (
            <li key={`${entry.time}-${index}`} className="flex gap-3 text-xs">
              <span className="w-10 shrink-0 font-mono text-slate-500">{entry.time}</span>
              <span className="text-slate-300">{entry.text}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Statistics">
        <div className="space-y-1">
          <StatRow label="Tasks completed" value={agent.stats.tasksCompleted} />
          <StatRow label="PRs reviewed" value={agent.stats.prsReviewed} />
          <StatRow label="Bugs fixed" value={agent.stats.bugsFixed} />
          <StatRow label="Docs written" value={agent.stats.docsWritten} />
        </div>
      </Section>
    </div>
  );
}

import { useMemo } from 'react';
import { parseSprintKey, selectSprintKey, useTaskStore } from '../../stores/taskStore';
import { percent } from './format';
import { ProgressBar } from './ProgressBar';

interface RowProps {
  label: string;
  done: number;
  total: number;
  color: string;
  showCounts?: boolean;
  className?: string;
}

function Row({ label, done, total, color, showCounts, className }: RowProps) {
  const value = percent(done, total);
  return (
    <div className={`min-w-[120px] ${className ?? ''}`}>
      <div className="mb-1 flex items-baseline justify-between text-[10px] uppercase tracking-wider text-slate-400">
        <span>{label}</span>
        <span className="font-semibold text-slate-200">
          {showCounts ? `${done}/${total} · ` : ''}
          {value}%
        </span>
      </div>
      <ProgressBar value={value} color={color} />
    </div>
  );
}

export function SprintProgress() {
  const key = useTaskStore(selectSprintKey);
  const sprint = useMemo(() => parseSprintKey(key), [key]);

  return (
    <div className="flex items-center gap-5">
      <Row label="Sprint progress" done={sprint.done} total={sprint.total} color="#34d399" showCounts />
      <Row label="High priority" done={sprint.highDone} total={sprint.highTotal} color="#f59e0b" className="hidden xl:block" />
      <Row label="Bugs" done={sprint.bugDone} total={sprint.bugTotal} color="#fb7185" className="hidden xl:block" />
    </div>
  );
}

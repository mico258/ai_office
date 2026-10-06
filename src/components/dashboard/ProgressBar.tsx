interface ProgressBarProps {
  value: number;
  color?: string;
  height?: number;
}

export function ProgressBar({ value, color = '#34d399', height = 8 }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="w-full overflow-hidden rounded-full bg-slate-800" style={{ height }}>
      <div
        className="h-full rounded-full transition-[width] duration-300 ease-out"
        style={{ width: `${clamped}%`, background: color }}
      />
    </div>
  );
}

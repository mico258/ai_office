import { useEventStore } from '../../stores/eventStore';

export function ActivityFeed() {
  const feed = useEventStore((state) => state.feed);

  return (
    <section className="flex h-72 shrink-0 flex-col border-t border-slate-800 bg-slate-950">
      <div className="px-5 pb-2 pt-3 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Activity</div>
      <ul className="flex-1 space-y-2.5 overflow-y-auto px-5 pb-4">
        {feed.length === 0 && <li className="text-xs text-slate-500">Waiting for team activity…</li>}
        {feed.map((item) => (
          <li key={item.id} className="flex gap-3 text-xs">
            <span className="w-10 shrink-0 font-mono text-slate-500">{item.time}</span>
            <span className="w-4 shrink-0 text-center">{item.icon}</span>
            <span className="text-slate-300">{item.text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
